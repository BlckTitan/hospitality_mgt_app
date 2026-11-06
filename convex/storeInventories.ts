import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  applyStorePurchaseCost,
  applyStoreQtyChange,
  crateReceiptFields,
  maybeOpenReorderAlert,
  propertyDateKey,
  resolveBeverageUnitCost,
  syncUnitsPerPack,
  unitsPerPackConflict,
} from "./lib/barStock";
import { cratePurchaseError, landedCratePurchase } from "../lib/crateCost";
import { requirePermission } from "./lib/rbac";

const supplyCostValidator = v.object({
  label: v.string(),
  amount: v.number(),
});

export const createStoreInventory = mutation({
  args: {
    propertyId: v.id("properties"),
    beverageId: v.id("beverages"),
    packQty: v.number(),
    packPrice: v.optional(v.number()),
    unitsPerPack: v.optional(v.number()),
    supplyCosts: v.optional(v.array(supplyCostValidator)),
    reorderThreshold: v.number(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "inventory.create", args.propertyId);
    // Check if store inventory already exists for this beverage in this property
    const existingInventory = await ctx.db
      .query("storeInventories")
      .withIndex("by_propertyId_beverageId", (q) => 
        q.eq("propertyId", args.propertyId).eq("beverageId", args.beverageId)
      )
      .first();

    if (existingInventory) {
      return {
        success: false,
        message: "Store inventory already exists for this beverage in this property",
      };
    }

    // Verify the beverage exists in this property
    const beverage = await ctx.db.get(args.beverageId);
    if (!beverage || beverage.propertyId !== args.propertyId) {
      return {
        success: false,
        message: "Beverage not found in this property",
      };
    }

    if (!Number.isFinite(args.packQty) || args.packQty < 0) {
      return {
        success: false,
        message: "Crates in store cannot be negative",
      };
    }
    if (!Number.isFinite(args.reorderThreshold) || args.reorderThreshold < 0) {
      return {
        success: false,
        message: "Reorder threshold cannot be negative",
      };
    }
    const purchase = args.packQty > 0
      ? landedCratePurchase({
          packQty: args.packQty,
          packPrice: args.packPrice ?? Number.NaN,
          unitsPerPack: args.unitsPerPack ?? Number.NaN,
          supplyCosts: args.supplyCosts,
        })
      : null;
    if (purchase && cratePurchaseError(purchase)) {
      return { success: false, message: purchase.error };
    }
    if (purchase && !cratePurchaseError(purchase)) {
      const packMessage = unitsPerPackConflict(beverage, purchase.unitsPerPack);
      if (packMessage) return { success: false, message: packMessage };
    }

    const now = Date.now();
    const storeInventoryId = await ctx.db.insert("storeInventories", {
      propertyId: args.propertyId,
      beverageId: args.beverageId,
      qtyInStore: 0,
      reorderThreshold: args.reorderThreshold,
      lastUpdated: now,
    });

    const created = await ctx.db.get(storeInventoryId);
    if (!created) {
      return {
        success: false,
        message: "Failed to create store inventory",
      };
    }

    if (purchase && !cratePurchaseError(purchase)) {
      const packMessage = await syncUnitsPerPack(ctx, beverage, purchase.unitsPerPack);
      if (packMessage) throw new Error(packMessage);
      const purchased = await applyStorePurchaseCost(
        ctx,
        created,
        beverage,
        purchase.qty,
        purchase.unitCost,
        purchase.totalCost,
      );
      await ctx.db.insert("storeTransactions", {
        propertyId: args.propertyId,
        beverageId: args.beverageId,
        txnType: "receive",
        ...crateReceiptFields(purchase),
        unitCost: purchased.unitCost,
        totalCost: purchased.totalCost,
        txnDate: now,
        txnDateKey: await propertyDateKey(ctx, args.propertyId, now),
        notes: "Opening quantity",
      });
    }

    const qtyInStore = purchase && !cratePurchaseError(purchase)
      ? await applyStoreQtyChange(ctx, created, purchase.qty)
      : 0;

    await maybeOpenReorderAlert(ctx, {
      propertyId: args.propertyId,
      beverageId: args.beverageId,
      qtyInStore,
      reorderThreshold: args.reorderThreshold,
    });

    return {
      success: true,
      message: "Store inventory created successfully",
      data: storeInventoryId,
    };
  },
});

export const getAllStoreInventories = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "inventory.read", args.propertyId);
    const storeInventories = await ctx.db
      .query("storeInventories")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    // Fetch related beverage information
    const storeInventoriesWithBeverages = await Promise.all(
      storeInventories.map(async (inventory) => {
        const beverage = await ctx.db.get(inventory.beverageId);
        const unitCost =
          inventory.unitCost ?? (await resolveBeverageUnitCost(ctx, beverage));
        return {
          ...inventory,
          beverage,
          unitCost,
          stockValue: inventory.qtyInStore * unitCost,
        };
      })
    );

    return {
      success: true,
      data: storeInventoriesWithBeverages,
    };
  },
});

export const getStoreInventoryById = query({
  args: {
    id: v.id("storeInventories"),
  },
  handler: async (ctx, args) => {
    const storeInventory = await ctx.db.get(args.id);
    
    if (!storeInventory) {
      return {
        success: false,
        message: "Store inventory not found",
      };
    }

    await requirePermission(ctx, "inventory.read", storeInventory.propertyId);

    // Fetch related beverage information
    const beverage = await ctx.db.get(storeInventory.beverageId);

    return {
      success: true,
      data: {
        ...storeInventory,
        beverage,
      },
    };
  },
});

export const updateStoreInventory = mutation({
  args: {
    id: v.id("storeInventories"),
    qtyInStore: v.optional(v.number()),
    reorderThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const storeInventory = await ctx.db.get(args.id);
    
    if (!storeInventory) {
      return {
        success: false,
        message: "Store inventory not found",
      };
    }

    await requirePermission(ctx, "inventory.update", storeInventory.propertyId);

    await ctx.db.patch(args.id, {
      lastUpdated: Date.now(),
      ...(args.reorderThreshold !== undefined ? { reorderThreshold: args.reorderThreshold } : {}),
    });

    return {
      success: true,
      message: "Store inventory updated successfully",
    };
  },
});

export const deleteStoreInventory = mutation({
  args: {
    id: v.id("storeInventories"),
  },
  handler: async (ctx, args) => {
    const storeInventory = await ctx.db.get(args.id);
    
    if (!storeInventory) {
      return {
        success: false,
        message: "Store inventory not found",
      };
    }

    await requirePermission(ctx, "inventory.delete", storeInventory.propertyId);

    await ctx.db.delete(args.id);

    return {
      success: true,
      message: "Store inventory deleted successfully",
    };
  },
});

export const adjustStoreInventory = mutation({
  args: {
    propertyId: v.id("properties"),
    beverageId: v.id("beverages"),
    adjustment: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "inventory.update", args.propertyId);
    return {
      success: false,
      message: "Use a receive or issue store transaction to change quantity",
    };
  },
});

