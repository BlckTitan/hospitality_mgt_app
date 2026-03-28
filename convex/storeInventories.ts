import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getAllStoreInventories = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      const storeInventories = await ctx.db
        .query('storeInventories')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();
      
      // Fetch beverage details for each inventory item
      const inventoryWithBeverages = await Promise.all(
        storeInventories.map(async (inventory) => {
          const beverage = await ctx.db.get(inventory.beverageId);
          return {
            ...inventory,
            beverage,
          };
        })
      );
      
      return { success: true, data: inventoryWithBeverages };
    } catch (error) {
      console.log(`Failed to fetch store inventories: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch store inventories' };
    }
  },
});

export const getStoreInventory = query({
  args: { inventoryId: v.id('storeInventories') },
  handler: async (ctx, args) => {
    try {
      const inventory = await ctx.db.get(args.inventoryId);
      if (!inventory) {
        return { success: false, data: null, message: 'Store inventory not found' };
      }
      
      // Fetch related beverage data
      const beverage = await ctx.db.get(inventory.beverageId);
      
      return { success: true, data: { ...inventory, beverage } };
    } catch (error) {
      console.log(`Failed to fetch store inventory: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch store inventory' };
    }
  },
});

export const createStoreInventory = mutation({
  args: {
    propertyId: v.id('properties'),
    beverageId: v.id('beverages'),
    qtyInStore: v.number(),
    reorderThreshold: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      // Check if inventory already exists for this beverage in this property
      const existingInventory = await ctx.db
        .query('storeInventories')
        .withIndex('by_propertyId_beverageId', (q) =>
          q.eq('propertyId', args.propertyId).eq('beverageId', args.beverageId)
        )
        .first();

      if (existingInventory) {
        return { success: false, message: 'Inventory already exists for this beverage' };
      }

      // Verify beverage exists and belongs to the same property
      const beverage = await ctx.db.get(args.beverageId);
      if (!beverage) {
        return { success: false, message: 'Beverage does not exist' };
      }

      if (beverage.propertyId !== args.propertyId) {
        return { success: false, message: 'Beverage does not belong to this property' };
      }

      const now = Date.now();
      const inventoryId = await ctx.db.insert('storeInventories', {
        propertyId: args.propertyId,
        beverageId: args.beverageId,
        qtyInStore: args.qtyInStore,
        reorderThreshold: args.reorderThreshold,
        lastUpdated: now,
      });

      return { success: true, message: 'Store inventory created successfully', id: inventoryId };
    } catch (error) {
      console.log(`Failed to create store inventory: ${error}`);
      return { success: false, message: 'Failed to create store inventory' };
    }
  },
});

export const updateStoreInventory = mutation({
  args: {
    inventoryId: v.id('storeInventories'),
    qtyInStore: v.number(),
    reorderThreshold: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const existingInventory = await ctx.db.get(args.inventoryId);

      if (!existingInventory) {
        return { success: false, message: 'Store inventory does not exist' };
      }

      const now = Date.now();
      await ctx.db.patch(args.inventoryId, {
        qtyInStore: args.qtyInStore,
        reorderThreshold: args.reorderThreshold,
        lastUpdated: now,
      });

      return { success: true, message: 'Store inventory updated successfully' };
    } catch (error) {
      console.log(`Failed to update store inventory: ${error}`);
      return { success: false, message: 'Failed to update store inventory' };
    }
  },
});

export const deleteStoreInventory = mutation({
  args: { inventoryId: v.id('storeInventories') },
  handler: async (ctx, args) => {
    try {
      const existingInventory = await ctx.db.get(args.inventoryId);

      if (!existingInventory) {
        return { success: false, message: 'Store inventory does not exist' };
      }

      // Check if there are any user stock logs referencing this inventory's beverage
      const stockLogs = await ctx.db
        .query('userStockLogs')
        .withIndex('by_beverageId', (q) => q.eq('beverageId', existingInventory.beverageId))
        .first();

      if (stockLogs) {
        return { success: false, message: 'Cannot delete inventory - beverage has stock logs' };
      }

      await ctx.db.delete(args.inventoryId);
      return { success: true, message: 'Store inventory deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete store inventory: ${error}`);
      return { success: false, message: 'Failed to delete store inventory' };
    }
  },
});

export const getBeveragesWithoutInventory = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      // Get all beverages for this property
      const beverages = await ctx.db
        .query('beverages')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();

      // Get all inventory items for this property
      const inventoryItems = await ctx.db
        .query('storeInventories')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();

      // Get beverage IDs that already have inventory
      const beverageIdsWithInventory = new Set(
        inventoryItems.map(item => item.beverageId.toString())
      );

      // Filter beverages that don't have inventory
      const availableBeverages = beverages.filter(
        beverage => !beverageIdsWithInventory.has(beverage._id.toString())
      );

      return { success: true, data: availableBeverages };
    } catch (error) {
      console.log(`Failed to get available beverages: ${error}`);
      return { success: false, data: [], message: 'Failed to get available beverages' };
    }
  },
});
