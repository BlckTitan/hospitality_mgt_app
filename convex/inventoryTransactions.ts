import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getAllInventoryTransactions = query({
  args: { 
    propertyId: v.optional(v.id('properties')),
    inventoryItemId: v.optional(v.id('inventoryItems')),
  },
  handler: async (ctx, args) => {
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
    try {
      const transaction = await ctx.db.get(args.transactionId);
      if (!transaction) {
        return { success: false, data: null, message: 'Inventory transaction not found' };
      }
      
      // Fetch related data
      const inventoryItem = await ctx.db.get(transaction.inventoryItemId);
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
    try {
      const inventoryItem = await ctx.db.get(args.inventoryItemId);
      if (!inventoryItem) {
        return { success: false, message: 'Inventory item does not exist' };
      }

      // Calculate total cost
      const totalCost = args.unitCost !== undefined && args.unitCost !== null
        ? args.unitCost * Math.abs(args.quantity)
        : undefined;

      // Determine quantity change based on transaction type
      let quantityChange = 0;
      switch (args.transactionType) {
        case 'purchase':
          quantityChange = Math.abs(args.quantity); // Always positive
          break;
        case 'usage':
        case 'waste':
          quantityChange = -Math.abs(args.quantity); // Always negative
          break;
        case 'adjustment':
          quantityChange = args.quantity; // Can be positive or negative
          break;
        case 'transfer':
          // Transfer doesn't change total quantity, just moves it
          // For now, we'll treat it as an adjustment
          quantityChange = args.quantity;
          break;
      }

      // Check if new quantity would be negative
      const newQuantity = inventoryItem.currentQuantity + quantityChange;
      if (newQuantity < 0 && args.transactionType !== 'adjustment') {
        return { 
          success: false, 
          message: `Insufficient inventory. Current quantity: ${inventoryItem.currentQuantity}, attempting to remove: ${Math.abs(quantityChange)}` 
        };
      }

      const now = Date.now();
      const transactionId = await ctx.db.insert('inventoryTransactions', {
        inventoryItemId: args.inventoryItemId,
        transactionType: args.transactionType,
        quantity: args.quantity,
        unitCost: args.unitCost,
        totalCost: totalCost,
        referenceType: args.referenceType,
        referenceId: args.referenceId,
        reason: args.reason,
        performedBy: args.performedBy,
        transactionDate: args.transactionDate,
        createdAt: now,
      });

      // Update inventory item quantity
      const updatedQuantity = inventoryItem.currentQuantity + quantityChange;
      await ctx.db.patch(args.inventoryItemId, {
        currentQuantity: updatedQuantity,
        updatedAt: now,
      });

      // Update unit cost if provided and it's a purchase transaction
      if (args.transactionType === 'purchase' && args.unitCost !== undefined && args.unitCost !== null) {
        await ctx.db.patch(args.inventoryItemId, {
          unitCost: args.unitCost,
          lastCostUpdate: now,
        });
      }

      return { success: true, message: 'Inventory transaction created successfully', id: transactionId };
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
    try {
      const existingTransaction = await ctx.db.get(args.transactionId);
      if (!existingTransaction) {
        return { success: false, message: 'Inventory transaction does not exist' };
      }

      const inventoryItem = await ctx.db.get(existingTransaction.inventoryItemId);
      if (!inventoryItem) {
        return { success: false, message: 'Inventory item does not exist' };
      }

      // Revert the old transaction's effect on quantity
      let oldQuantityChange = 0;
      switch (existingTransaction.transactionType) {
        case 'purchase':
          oldQuantityChange = -Math.abs(existingTransaction.quantity);
          break;
        case 'usage':
        case 'waste':
          oldQuantityChange = Math.abs(existingTransaction.quantity);
          break;
        case 'adjustment':
        case 'transfer':
          oldQuantityChange = -existingTransaction.quantity;
          break;
      }

      // Calculate new quantity change
      let newQuantityChange = 0;
      switch (args.transactionType) {
        case 'purchase':
          newQuantityChange = Math.abs(args.quantity);
          break;
        case 'usage':
        case 'waste':
          newQuantityChange = -Math.abs(args.quantity);
          break;
        case 'adjustment':
        case 'transfer':
          newQuantityChange = args.quantity;
          break;
      }

      // Calculate net change and new quantity
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

      // Update inventory item quantity
      await ctx.db.patch(existingTransaction.inventoryItemId, {
        currentQuantity: newQuantity,
        updatedAt: now,
      });

      // Update unit cost if it's a purchase transaction
      if (args.transactionType === 'purchase' && args.unitCost !== undefined && args.unitCost !== null) {
        await ctx.db.patch(existingTransaction.inventoryItemId, {
          unitCost: args.unitCost,
          lastCostUpdate: now,
        });
      }

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
    try {
      const existingTransaction = await ctx.db.get(args.transactionId);
      if (!existingTransaction) {
        return { success: false, message: 'Inventory transaction does not exist' };
      }

      const inventoryItem = await ctx.db.get(existingTransaction.inventoryItemId);
      if (!inventoryItem) {
        return { success: false, message: 'Inventory item does not exist' };
      }

      // Revert the transaction's effect on quantity
      let quantityChange = 0;
      switch (existingTransaction.transactionType) {
        case 'purchase':
          quantityChange = -Math.abs(existingTransaction.quantity);
          break;
        case 'usage':
        case 'waste':
          quantityChange = Math.abs(existingTransaction.quantity);
          break;
        case 'adjustment':
        case 'transfer':
          quantityChange = -existingTransaction.quantity;
          break;
      }

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

      return { success: true, message: 'Inventory transaction deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete inventory transaction: ${error}`);
      return { success: false, message: 'Failed to delete inventory transaction' };
    }
  },
});
