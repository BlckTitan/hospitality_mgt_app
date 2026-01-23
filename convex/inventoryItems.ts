import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getAllInventoryItems = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      const inventoryItems = await ctx.db
        .query('inventoryItems')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();
      
      // Fetch suppliers for each inventory item
      const itemsWithSuppliers = await Promise.all(
        inventoryItems.map(async (item) => {
          const supplier = item.supplierId ? await ctx.db.get(item.supplierId) : null;
          return {
            ...item,
            supplier,
          };
        })
      );
      
      return { success: true, data: itemsWithSuppliers };
    } catch (error) {
      console.log(`Failed to fetch inventory items: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch inventory items' };
    }
  },
});

export const getInventoryItem = query({
  args: { inventoryItemId: v.id('inventoryItems') },
  handler: async (ctx, args) => {
    try {
      const inventoryItem = await ctx.db.get(args.inventoryItemId);
      if (!inventoryItem) {
        return { success: false, data: null, message: 'Inventory item not found' };
      }
      
      // Fetch related data
      const supplier = inventoryItem.supplierId ? await ctx.db.get(inventoryItem.supplierId) : null;
      
      return { success: true, data: { ...inventoryItem, supplier } };
    } catch (error) {
      console.log(`Failed to fetch inventory item: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch inventory item' };
    }
  },
});

export const createInventoryItem = mutation({
  args: {
    propertyId: v.id('properties'),
    supplierId: v.optional(v.id('suppliers')),
    sku: v.string(),
    name: v.string(),
    category: v.string(),
    unit: v.string(),
    currentQuantity: v.number(),
    reorderPoint: v.optional(v.number()),
    reorderQuantity: v.optional(v.number()),
    unitCost: v.optional(v.number()),
    location: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      // Check if SKU already exists for this property
      const existingItem = await ctx.db
        .query('inventoryItems')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .filter((q) => q.eq(q.field('sku'), args.sku))
        .first();

      if (existingItem) {
        return { success: false, message: 'SKU already exists for this property' };
      }

      // Verify supplier exists if provided
      if (args.supplierId) {
        const supplier = await ctx.db.get(args.supplierId);
        if (!supplier) {
          return { success: false, message: 'Supplier does not exist' };
        }
      }

      const now = Date.now();
      const inventoryItemId = await ctx.db.insert('inventoryItems', {
        propertyId: args.propertyId,
        supplierId: args.supplierId,
        sku: args.sku,
        name: args.name,
        category: args.category,
        unit: args.unit,
        currentQuantity: args.currentQuantity,
        reorderPoint: args.reorderPoint,
        reorderQuantity: args.reorderQuantity,
        unitCost: args.unitCost,
        lastCostUpdate: args.unitCost ? now : undefined,
        location: args.location,
        isActive: args.isActive,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, message: 'Inventory item created successfully', id: inventoryItemId };
    } catch (error) {
      console.log(`Failed to create inventory item: ${error}`);
      return { success: false, message: 'Failed to create inventory item' };
    }
  },
});

export const updateInventoryItem = mutation({
  args: {
    inventoryItemId: v.id('inventoryItems'),
    supplierId: v.optional(v.id('suppliers')),
    sku: v.string(),
    name: v.string(),
    category: v.string(),
    unit: v.string(),
    currentQuantity: v.number(),
    reorderPoint: v.optional(v.number()),
    reorderQuantity: v.optional(v.number()),
    unitCost: v.optional(v.number()),
    location: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      const existingItem = await ctx.db.get(args.inventoryItemId);

      if (!existingItem) {
        return { success: false, message: 'Inventory item does not exist' };
      }

      // Check if SKU is being changed and if new SKU already exists
      if (args.sku !== existingItem.sku) {
        const duplicateItem = await ctx.db
          .query('inventoryItems')
          .withIndex('by_propertyId', (q) => q.eq('propertyId', existingItem.propertyId))
          .filter((q) => q.eq(q.field('sku'), args.sku))
          .first();

        if (duplicateItem) {
          return { success: false, message: 'SKU already exists for this property' };
        }
      }

      // Verify supplier exists if provided
      if (args.supplierId) {
        const supplier = await ctx.db.get(args.supplierId);
        if (!supplier) {
          return { success: false, message: 'Supplier does not exist' };
        }
      }

      const now = Date.now();
      const updateData: any = {
        supplierId: args.supplierId,
        sku: args.sku,
        name: args.name,
        category: args.category,
        unit: args.unit,
        currentQuantity: args.currentQuantity,
        reorderPoint: args.reorderPoint,
        reorderQuantity: args.reorderQuantity,
        location: args.location,
        isActive: args.isActive,
        updatedAt: now,
      };

      // Update unitCost and lastCostUpdate if unitCost is provided
      if (args.unitCost !== undefined) {
        updateData.unitCost = args.unitCost;
        updateData.lastCostUpdate = now;
      }

      await ctx.db.patch(args.inventoryItemId, updateData);

      return { success: true, message: 'Inventory item updated successfully' };
    } catch (error) {
      console.log(`Failed to update inventory item: ${error}`);
      return { success: false, message: 'Failed to update inventory item' };
    }
  },
});

export const deleteInventoryItem = mutation({
  args: { inventoryItemId: v.id('inventoryItems') },
  handler: async (ctx, args) => {
    try {
      const existingItem = await ctx.db.get(args.inventoryItemId);

      if (!existingItem) {
        return { success: false, message: 'Inventory item does not exist' };
      }

      // Check if inventory item has transactions
      const hasTransactions = await ctx.db
        .query('inventoryTransactions')
        .withIndex('by_inventoryItemId', (q) => q.eq('inventoryItemId', args.inventoryItemId))
        .first();

      if (hasTransactions) {
        return { success: false, message: 'Cannot delete inventory item - has associated transactions' };
      }

      // Check if inventory item is used in purchase orders
      const hasPurchaseOrders = await ctx.db
        .query('purchaseOrderLines')
        .withIndex('by_inventoryItemId', (q) => q.eq('inventoryItemId', args.inventoryItemId))
        .first();

      if (hasPurchaseOrders) {
        return { success: false, message: 'Cannot delete inventory item - is used in purchase orders' };
      }

      await ctx.db.delete(args.inventoryItemId);
      return { success: true, message: 'Inventory item deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete inventory item: ${error}`);
      return { success: false, message: 'Failed to delete inventory item' };
    }
  },
});
