import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  applyStorePurchaseCost,
  applyStoreQtyChange,
  lineTotalCost,
  maybeOpenReorderAlert,
  propertyDateKey,
  purchaseUnitCost,
  resolveBeverageUnitCost,
} from "./lib/barStock";
import { requirePermission } from "./lib/rbac";

export const createStoreInventory = mutation({
  args: {
    propertyId: v.id("properties"),
    beverageId: v.id("beverages"),
    qtyInStore: v.number(),
    reorderThreshold: v.number(),
    unitCost: v.optional(v.number()),
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

    if (!Number.isFinite(args.qtyInStore) || args.qtyInStore < 0) {
      return {
        success: false,
        message: "Quantity in store cannot be negative",
      };
    }
    if (!Number.isFinite(args.reorderThreshold) || args.reorderThreshold < 0) {
      return {
        success: false,
        message: "Reorder threshold cannot be negative",
      };
    }
    if (args.qtyInStore > 0 && !purchaseUnitCost(args.unitCost)) {
      return {
        success: false,
        message: "Enter a unit cost of 0 or more for the quantity purchased",
      };
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

    if (args.qtyInStore > 0 && purchaseUnitCost(args.unitCost)) {
      await applyStorePurchaseCost(ctx, created, beverage, args.qtyInStore, args.unitCost);
      await ctx.db.insert("storeTransactions", {
        propertyId: args.propertyId,
        beverageId: args.beverageId,
        txnType: "receive",
        qty: args.qtyInStore,
        unitCost: args.unitCost,
        totalCost: lineTotalCost(args.qtyInStore, args.unitCost),
        txnDate: now,
        txnDateKey: await propertyDateKey(ctx, args.propertyId, now),
        notes: "Opening quantity",
      });
    }

    const qtyInStore =
      args.qtyInStore > 0 ? await applyStoreQtyChange(ctx, created, args.qtyInStore) : 0;

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

