import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createStoreInventory = mutation({
  args: {
    propertyId: v.id("properties"),
    beverageId: v.id("beverages"),
    qtyInStore: v.number(),
    reorderThreshold: v.number(),
  },
  handler: async (ctx, args) => {
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

    const storeInventoryId = await ctx.db.insert("storeInventories", {
      propertyId: args.propertyId,
      beverageId: args.beverageId,
      qtyInStore: args.qtyInStore,
      reorderThreshold: args.reorderThreshold,
      lastUpdated: Date.now(),
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
    const storeInventories = await ctx.db
      .query("storeInventories")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    // Fetch related beverage information
    const storeInventoriesWithBeverages = await Promise.all(
      storeInventories.map(async (inventory) => {
        const beverage = await ctx.db.get(inventory.beverageId);
        return {
          ...inventory,
          beverage,
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

    const updateData: any = {
      lastUpdated: Date.now(),
    };

    if (args.qtyInStore !== undefined) {
      updateData.qtyInStore = args.qtyInStore;
    }

    if (args.reorderThreshold !== undefined) {
      updateData.reorderThreshold = args.reorderThreshold;
    }

    await ctx.db.patch(args.id, updateData);

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
    adjustment: v.number(), // Positive for addition, negative for subtraction
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find existing store inventory
    const existingInventory = await ctx.db
      .query("storeInventories")
      .withIndex("by_propertyId_beverageId", (q) => 
        q.eq("propertyId", args.propertyId).eq("beverageId", args.beverageId)
      )
      .first();

    if (!existingInventory) {
      return {
        success: false,
        message: "Store inventory not found for this beverage",
      };
    }

    const newQuantity = existingInventory.qtyInStore + args.adjustment;

    if (newQuantity < 0) {
      return {
        success: false,
        message: "Cannot adjust inventory below zero",
      };
    }

    await ctx.db.patch(existingInventory._id, {
      qtyInStore: newQuantity,
      lastUpdated: Date.now(),
    });

    return {
      success: true,
      message: "Store inventory adjusted successfully",
      data: {
        previousQuantity: existingInventory.qtyInStore,
        newQuantity: newQuantity,
        adjustment: args.adjustment,
      },
    };
  },
});
