import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/rbac';
import { maybeCreateRestockTask } from './lib/taskAssignment';
import { MutationCtx } from './_generated/server';
import { Id } from './_generated/dataModel';
import { postInventoryTransaction, quantityChangeForType, weightedAverageCost } from './lib/inventoryStock';

async function restockIfNeeded(ctx: MutationCtx, inventoryItemId: Id<'inventoryItems'>) {
  const item = await ctx.db.get(inventoryItemId);
  if (item) await maybeCreateRestockTask(ctx, item);
}

export const getAllInventoryTransactions = query({
  args: { 
    propertyId: v.optional(v.id('properties')),
    inventoryItemId: v.optional(v.id('inventoryItems')),
  },
  handler: async (ctx, args) => {
    if (args.propertyId) {
      await requirePermission(ctx, 'inventory.read', args.propertyId);
    } else if (args.inventoryItemId) {
      const inventoryItem = await ctx.db.get(args.inventoryItemId);
      if (!inventoryItem) {
        return { success: false, data: [], message: 'Inventory item not found' };
      }
      await requirePermission(ctx, 'inventory.read', inventoryItem.propertyId);
    } else {
      return { success: false, data: [], message: 'Either propertyId or inventoryItemId must be provided' };
    }

    try {
      let transactions;
      
      if (args.inventoryItemId) {
        // Get transactions for a specific inventory item
        const itemId = args.inventoryItemId;
        transactions = await ctx.db
          .query('inventoryTransactions')
          .withIndex('by_inventoryItemId', (q) => q.eq('inventoryItemId', itemId))
          .order('desc')
          .collect();
      } else if (args.propertyId) {
        // Get all transactions for a property (via inventory items)
        const propId = args.propertyId;
        const inventoryItems = await ctx.db
          .query('inventoryItems')
          .withIndex('by_propertyId', (q) => q.eq('propertyId', propId))
          .collect();
        
        const itemIds = inventoryItems.map(item => item._id);
        
        // Fetch transactions for all items
        const allTransactions = await Promise.all(
          itemIds.map(async (itemId) => {
            return await ctx.db
              .query('inventoryTransactions')
              .withIndex('by_inventoryItemId', (q) => q.eq('inventoryItemId', itemId))
              .collect();
          })
        );
        
        transactions = allTransactions.flat();
        // Sort by transaction date descending
        transactions.sort((a, b) => b.transactionDate - a.transactionDate);
      } else {
        return { success: false, data: [], message: 'Either propertyId or inventoryItemId must be provided' };
      }
      
      // Fetch related data
      const transactionsWithDetails = await Promise.all(
        transactions.map(async (transaction) => {
          const inventoryItem = await ctx.db.get(transaction.inventoryItemId);
          const performedBy = transaction.performedBy ? await ctx.db.get(transaction.performedBy) : null;
          
          return {
            ...transaction,
            inventoryItem,
            performedBy,
          };
        })
      );
      
      return { success: true, data: transactionsWithDetails };
    } catch (error) {
      console.log(`Failed to fetch inventory transactions: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch inventory transactions' };
    }
  },
});

export const getInventoryTransaction = query({
  args: { transactionId: v.id('inventoryTransactions') },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      return { success: false, data: null, message: 'Inventory transaction not found' };
    }
    const inventoryItem = await ctx.db.get(transaction.inventoryItemId);
    if (!inventoryItem) {
      return { success: false, data: null, message: 'Inventory item not found' };
    }
    await requirePermission(ctx, 'inventory.read', inventoryItem.propertyId);
    try {
      const performedByStaff = transaction.performedBy ? await ctx.db.get(transaction.performedBy) : null;
      
      return { success: true, data: { ...transaction, inventoryItem, performedByStaff } };
    } catch (error) {
      console.log(`Failed to fetch inventory transaction: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch inventory transaction' };
    }
  },
});

export const createInventoryTransaction = mutation({
  args: {
    inventoryItemId: v.id('inventoryItems'),
    transactionType: v.union(
      v.literal('purchase'),
      v.literal('usage'),
      v.literal('adjustment'),
      v.literal('waste'),
      v.literal('transfer')
    ),
    quantity: v.number(),
    unitCost: v.optional(v.number()),
    referenceType: v.optional(v.string()),
    referenceId: v.optional(v.string()),
    reason: v.optional(v.string()),
    performedBy: v.optional(v.id('staffs')),
    transactionDate: v.number(),
  },
  handler: async (ctx, args) => {
    const inventoryItem = await ctx.db.get(args.inventoryItemId);
    if (!inventoryItem) {
      return { success: false, message: 'Inventory item does not exist' };
    }
    await requirePermission(ctx, 'inventory.create', inventoryItem.propertyId);

    try {
      const posted = await postInventoryTransaction(ctx, {
        inventoryItemId: args.inventoryItemId,
        transactionType: args.transactionType,
        quantity: args.quantity,
        unitCost: args.unitCost,
        referenceType: args.referenceType,
        referenceId: args.referenceId,
        reason: args.reason,
        performedBy: args.performedBy,
        transactionDate: args.transactionDate,
      });
      if (!posted.success) {
        return { success: false, message: posted.message };
      }
      return { success: true, message: 'Inventory transaction created successfully', id: posted.id };
    } catch (error) {
      console.log(`Failed to create inventory transaction: ${error}`);
      return { success: false, message: 'Failed to create inventory transaction' };
    }
  },
});

export const updateInventoryTransaction = mutation({
  args: {
    transactionId: v.id('inventoryTransactions'),
    transactionType: v.union(
      v.literal('purchase'),
      v.literal('usage'),
      v.literal('adjustment'),
      v.literal('waste'),
      v.literal('transfer')
    ),
    quantity: v.number(),
    unitCost: v.optional(v.number()),
    referenceType: v.optional(v.string()),
    referenceId: v.optional(v.string()),
    reason: v.optional(v.string()),
    performedBy: v.optional(v.id('staffs')),
    transactionDate: v.number(),
  },
  handler: async (ctx, args) => {
    const existingTransaction = await ctx.db.get(args.transactionId);
    if (!existingTransaction) {
      return { success: false, message: 'Inventory transaction does not exist' };
    }

    const inventoryItem = await ctx.db.get(existingTransaction.inventoryItemId);
    if (!inventoryItem) {
      return { success: false, message: 'Inventory item does not exist' };
    }
    await requirePermission(ctx, 'inventory.update', inventoryItem.propertyId);

    try {
      const oldQuantityChange = -quantityChangeForType(
        existingTransaction.transactionType,
        existingTransaction.quantity,
      );
      const newQuantityChange = quantityChangeForType(args.transactionType, args.quantity);
      const netChange = oldQuantityChange + newQuantityChange;
      const newQuantity = inventoryItem.currentQuantity + netChange;

      // Check if new quantity would be negative
      if (newQuantity < 0 && args.transactionType !== 'adjustment') {
        return { 
          success: false, 
          message: `Insufficient inventory. Current quantity: ${inventoryItem.currentQuantity}, attempting to change by: ${netChange}` 
        };
      }

      // Calculate total cost
      const totalCost = args.unitCost !== undefined && args.unitCost !== null
        ? args.unitCost * Math.abs(args.quantity)
        : undefined;

      const now = Date.now();
      await ctx.db.patch(args.transactionId, {
        transactionType: args.transactionType,
        quantity: args.quantity,
        unitCost: args.unitCost,
        totalCost: totalCost,
        referenceType: args.referenceType,
        referenceId: args.referenceId,
        reason: args.reason,
        performedBy: args.performedBy,
        transactionDate: args.transactionDate,
      });

      const qtyAfterReverse = inventoryItem.currentQuantity + oldQuantityChange;
      const itemPatch: {
        currentQuantity: number;
        updatedAt: number;
        unitCost?: number;
        lastCostUpdate?: number;
      } = {
        currentQuantity: newQuantity,
        updatedAt: now,
      };
      if (args.transactionType === 'purchase' && args.unitCost !== undefined && args.unitCost !== null) {
        itemPatch.unitCost = weightedAverageCost(
          qtyAfterReverse,
          inventoryItem.unitCost ?? 0,
          Math.abs(args.quantity),
          args.unitCost,
        );
        itemPatch.lastCostUpdate = now;
      }
      await ctx.db.patch(existingTransaction.inventoryItemId, itemPatch);
      await restockIfNeeded(ctx, existingTransaction.inventoryItemId);

      return { success: true, message: 'Inventory transaction updated successfully' };
    } catch (error) {
      console.log(`Failed to update inventory transaction: ${error}`);
      return { success: false, message: 'Failed to update inventory transaction' };
    }
  },
});

export const deleteInventoryTransaction = mutation({
  args: { transactionId: v.id('inventoryTransactions') },
  handler: async (ctx, args) => {
    const existingTransaction = await ctx.db.get(args.transactionId);
    if (!existingTransaction) {
      return { success: false, message: 'Inventory transaction does not exist' };
    }

    const inventoryItem = await ctx.db.get(existingTransaction.inventoryItemId);
    if (!inventoryItem) {
      return { success: false, message: 'Inventory item does not exist' };
    }
    await requirePermission(ctx, 'inventory.delete', inventoryItem.propertyId);

    try {
      const quantityChange = -quantityChangeForType(
        existingTransaction.transactionType,
        existingTransaction.quantity,
      );
      const newQuantity = inventoryItem.currentQuantity + quantityChange;

      // Check if reverting would make quantity negative
      if (newQuantity < 0) {
        return { 
          success: false, 
          message: `Cannot delete transaction - would result in negative inventory quantity` 
        };
      }

      const now = Date.now();
      await ctx.db.delete(args.transactionId);

      // Update inventory item quantity
      await ctx.db.patch(existingTransaction.inventoryItemId, {
        currentQuantity: newQuantity,
        updatedAt: now,
      });
      await restockIfNeeded(ctx, existingTransaction.inventoryItemId);

      return { success: true, message: 'Inventory transaction deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete inventory transaction: ${error}`);
      return { success: false, message: 'Failed to delete inventory transaction' };
    }
  },
});
