import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getAllStoreTransactions = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      const transactions = await ctx.db
        .query('storeTransactions')
        .withIndex('by_propertyId_txnDate', (q) => 
          q.eq('propertyId', args.propertyId)
        )
        .collect();
      
      // Sort by txnDate descending (most recent first)
      transactions.sort((a, b) => b.txnDate - a.txnDate);
      
      // Fetch related data for each transaction
      const transactionsWithDetails = await Promise.all(
        transactions.map(async (transaction) => {
          const beverage = await ctx.db.get(transaction.beverageId);
          const bar = transaction.barId ? await ctx.db.get(transaction.barId) : null;
          const user = transaction.userId ? await ctx.db.get(transaction.userId) : null;
          
          return {
            ...transaction,
            beverage,
            bar,
            user,
          };
        })
      );
      
      return { success: true, data: transactionsWithDetails };
    } catch (error) {
      console.log(`Failed to fetch store transactions: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch store transactions' };
    }
  },
});

export const getStoreTransaction = query({
  args: { transactionId: v.id('storeTransactions') },
  handler: async (ctx, args) => {
    try {
      const transaction = await ctx.db.get(args.transactionId);
      if (!transaction) {
        return { success: false, data: null, message: 'Store transaction not found' };
      }
      
      // Fetch related data
      const beverage = await ctx.db.get(transaction.beverageId);
      const bar = transaction.barId ? await ctx.db.get(transaction.barId) : null;
      const user = transaction.userId ? await ctx.db.get(transaction.userId) : null;
      
      return { success: true, data: { ...transaction, beverage, bar, user } };
    } catch (error) {
      console.log(`Failed to fetch store transaction: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch store transaction' };
    }
  },
});

export const createStoreTransaction = mutation({
  args: {
    propertyId: v.id('properties'),
    beverageId: v.id('beverages'),
    barId: v.optional(v.id('bars')),
    userId: v.optional(v.id('users')),
    txnType: v.union(v.literal('receive'), v.literal('issue')),
    qty: v.number(),
    txnDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Verify beverage exists and belongs to the property
      const beverage = await ctx.db.get(args.beverageId);
      if (!beverage || beverage.propertyId !== args.propertyId) {
        return { success: false, message: 'Beverage does not exist or does not belong to this property' };
      }

      // If barId is provided, verify it exists and belongs to the property
      if (args.barId) {
        const bar = await ctx.db.get(args.barId);
        if (!bar || bar.propertyId !== args.propertyId) {
          return { success: false, message: 'Bar does not exist or does not belong to this property' };
        }
      }

      // If userId is provided, verify user exists
      if (args.userId) {
        const user = await ctx.db.get(args.userId);
        if (!user) {
          return { success: false, message: 'User does not exist' };
        }
      }

      // Validate quantity is positive
      if (args.qty <= 0) {
        return { success: false, message: 'Quantity must be greater than 0' };
      }

      // Generate ISO date key from txnDate
      const txnDateKey = new Date(args.txnDate).toISOString().split('T')[0];

      const transactionId = await ctx.db.insert('storeTransactions', {
        propertyId: args.propertyId,
        beverageId: args.beverageId,
        barId: args.barId,
        userId: args.userId,
        txnType: args.txnType,
        qty: args.qty,
        txnDate: args.txnDate,
        txnDateKey,
        notes: args.notes,
      });

      // Update store inventory
      const storeInventory = await ctx.db
        .query('storeInventories')
        .withIndex('by_propertyId_beverageId', (q) =>
          q.eq('propertyId', args.propertyId).eq('beverageId', args.beverageId)
        )
        .first();

      if (storeInventory) {
        const newQty = args.txnType === 'receive' 
          ? storeInventory.qtyInStore + args.qty
          : storeInventory.qtyInStore - args.qty;

        if (newQty < 0) {
          // Rollback transaction if inventory would go negative
          await ctx.db.delete(transactionId);
          return { success: false, message: 'Insufficient stock in store' };
        }

        await ctx.db.patch(storeInventory._id, {
          qtyInStore: newQty,
          lastUpdated: Date.now(),
        });
      } else {
        // Create store inventory record if it doesn't exist
        await ctx.db.insert('storeInventories', {
          propertyId: args.propertyId,
          beverageId: args.beverageId,
          qtyInStore: args.txnType === 'receive' ? args.qty : 0,
          reorderThreshold: beverage.reorderLevel || 10,
          lastUpdated: Date.now(),
        });
      }

      // If this is an issue transaction, update userStockLogs
      if (args.txnType === 'issue' && args.barId && args.userId) {
        // Create the stock log update inline to avoid circular imports
        const beverage = await ctx.db.get(args.beverageId);
        if (!beverage) {
          // Rollback transaction if beverage not found
          await ctx.db.delete(transactionId);
          return { success: false, message: 'Beverage does not exist' };
        }

        // Look for existing stock log for today
        const existingLog = await ctx.db
          .query('userStockLogs')
          .withIndex('by_userId_barId_bev_date', (q) =>
            q.eq('userId', args.userId!)
             .eq('barId', args.barId!)
             .eq('beverageId', args.beverageId)
             .eq('logDate', txnDateKey)
          )
          .first();

        if (existingLog) {
          // Check if finalized
          if (existingLog.isFinalized) {
            // Rollback transaction
            await ctx.db.delete(transactionId);
            return { success: false, message: 'Cannot issue stock to finalized day' };
          }

          // Update existing log
          const newStockReceived = existingLog.newStockReceived + args.qty;
          const totalStock = existingLog.openingStock + newStockReceived;
          const salesQuantity = totalStock - existingLog.closingStock;
          
          if (salesQuantity < 0) {
            // Rollback transaction
            await ctx.db.delete(transactionId);
            return { success: false, message: 'Stock issue would result in negative sales' };
          }

          const salesValue = salesQuantity * beverage.unitPrice;

          await ctx.db.patch(existingLog._id, {
            newStockReceived,
            totalStock,
            salesQuantity,
            salesValue,
            lastUpdatedAt: Date.now(),
          });
        } else {
          // Create new stock log for today
          // Get opening stock from previous day's closing stock
          const yesterday = new Date(txnDateKey);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          const previousLog = await ctx.db
            .query('userStockLogs')
            .withIndex('by_userId_barId_bev_date', (q) =>
              q.eq('userId', args.userId!)
               .eq('barId', args.barId!)
               .eq('beverageId', args.beverageId)
               .eq('logDate', yesterdayStr)
            )
            .first();

          const openingStock = previousLog?.closingStock || 0;
          const newStockReceived = args.qty;
          const totalStock = openingStock + newStockReceived;
          const closingStock = totalStock; // Assume no sales yet
          const salesQuantity = 0;
          const salesValue = 0;

          // Find or create a shift for today
          let shift = await ctx.db
            .query('shifts')
            .withIndex('by_userId_date', (q) =>
              q.eq('userId', args.userId!).eq('shiftDate', txnDateKey)
            )
            .first();

          if (!shift) {
            // Create a new shift for today
            const shiftId = await ctx.db.insert('shifts', {
              propertyId: args.propertyId,
              userId: args.userId,
              barId: args.barId,
              shiftDate: txnDateKey,
              startTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
              isFinalized: false,
            });
            shift = await ctx.db.get(shiftId);
          }

          await ctx.db.insert('userStockLogs', {
            propertyId: args.propertyId,
            shiftId: shift!._id,
            userId: args.userId!,
            barId: args.barId!,
            beverageId: args.beverageId,
            logDate: txnDateKey,
            openingStock,
            newStockReceived,
            totalStock,
            closingStock,
            salesQuantity,
            salesValue,
            isFinalized: false,
            lastUpdatedAt: Date.now(),
          });
        }
      }

      return { success: true, message: 'Store transaction created successfully', id: transactionId };
    } catch (error) {
      console.log(`Failed to create store transaction: ${error}`);
      return { success: false, message: 'Failed to create store transaction' };
    }
  },
});

export const updateStoreTransaction = mutation({
  args: {
    transactionId: v.id('storeTransactions'),
    beverageId: v.id('beverages'),
    barId: v.optional(v.id('bars')),
    userId: v.optional(v.id('users')),
    txnType: v.union(v.literal('receive'), v.literal('issue')),
    qty: v.number(),
    txnDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const existingTransaction = await ctx.db.get(args.transactionId);
      if (!existingTransaction) {
        return { success: false, message: 'Store transaction does not exist' };
      }

      // Verify beverage exists and belongs to the property
      const beverage = await ctx.db.get(args.beverageId);
      if (!beverage || beverage.propertyId !== existingTransaction.propertyId) {
        return { success: false, message: 'Beverage does not exist or does not belong to this property' };
      }

      // If barId is provided, verify it exists and belongs to the property
      if (args.barId) {
        const bar = await ctx.db.get(args.barId);
        if (!bar || bar.propertyId !== existingTransaction.propertyId) {
          return { success: false, message: 'Bar does not exist or does not belong to this property' };
        }
      }

      // If userId is provided, verify user exists
      if (args.userId) {
        const user = await ctx.db.get(args.userId);
        if (!user) {
          return { success: false, message: 'User does not exist' };
        }
      }

      // Validate quantity is positive
      if (args.qty <= 0) {
        return { success: false, message: 'Quantity must be greater than 0' };
      }

      // Generate ISO date key from txnDate
      const txnDateKey = new Date(args.txnDate).toISOString().split('T')[0];

      // Update store inventory - reverse old transaction first
      const storeInventory = await ctx.db
        .query('storeInventories')
        .withIndex('by_propertyId_beverageId', (q) =>
          q.eq('propertyId', existingTransaction.propertyId).eq('beverageId', existingTransaction.beverageId)
        )
        .first();

      if (storeInventory) {
        // Reverse the old transaction
        const oldReversedQty = existingTransaction.txnType === 'receive' 
          ? storeInventory.qtyInStore - existingTransaction.qty
          : storeInventory.qtyInStore + existingTransaction.qty;

        // Apply the new transaction
        let newQty;
        if (existingTransaction.beverageId !== args.beverageId) {
          // Beverage changed, handle different inventory
          const newStoreInventory = await ctx.db
            .query('storeInventories')
            .withIndex('by_propertyId_beverageId', (q) =>
              q.eq('propertyId', existingTransaction.propertyId).eq('beverageId', args.beverageId)
            )
            .first();

          if (newStoreInventory) {
            newQty = args.txnType === 'receive' 
              ? newStoreInventory.qtyInStore + args.qty
              : newStoreInventory.qtyInStore - args.qty;

            if (newQty < 0) {
              return { success: false, message: 'Insufficient stock in store for new beverage' };
            }

            await ctx.db.patch(newStoreInventory._id, {
              qtyInStore: newQty,
              lastUpdated: Date.now(),
            });
          } else {
            // Create new inventory record
            await ctx.db.insert('storeInventories', {
              propertyId: existingTransaction.propertyId,
              beverageId: args.beverageId,
              qtyInStore: args.txnType === 'receive' ? args.qty : 0,
              reorderThreshold: beverage.reorderLevel || 10,
              lastUpdated: Date.now(),
            });
          }

          // Update old inventory
          await ctx.db.patch(storeInventory._id, {
            qtyInStore: oldReversedQty,
            lastUpdated: Date.now(),
          });
        } else {
          // Same beverage, just update quantity
          newQty = args.txnType === 'receive' 
            ? oldReversedQty + args.qty
            : oldReversedQty - args.qty;

          if (newQty < 0) {
            return { success: false, message: 'Insufficient stock in store' };
          }

          await ctx.db.patch(storeInventory._id, {
            qtyInStore: newQty,
            lastUpdated: Date.now(),
          });
        }
      }

      await ctx.db.patch(args.transactionId, {
        beverageId: args.beverageId,
        barId: args.barId,
        userId: args.userId,
        txnType: args.txnType,
        qty: args.qty,
        txnDate: args.txnDate,
        txnDateKey,
        notes: args.notes,
      });

      return { success: true, message: 'Store transaction updated successfully' };
    } catch (error) {
      console.log(`Failed to update store transaction: ${error}`);
      return { success: false, message: 'Failed to update store transaction' };
    }
  },
});

export const deleteStoreTransaction = mutation({
  args: { transactionId: v.id('storeTransactions') },
  handler: async (ctx, args) => {
    try {
      const existingTransaction = await ctx.db.get(args.transactionId);
      if (!existingTransaction) {
        return { success: false, message: 'Store transaction does not exist' };
      }

      // Update store inventory - reverse the transaction
      const storeInventory = await ctx.db
        .query('storeInventories')
        .withIndex('by_propertyId_beverageId', (q) =>
          q.eq('propertyId', existingTransaction.propertyId).eq('beverageId', existingTransaction.beverageId)
        )
        .first();

      if (storeInventory) {
        const newQty = existingTransaction.txnType === 'receive' 
          ? storeInventory.qtyInStore - existingTransaction.qty
          : storeInventory.qtyInStore + existingTransaction.qty;

        if (newQty < 0) {
          return { success: false, message: 'Cannot delete transaction - would result in negative inventory' };
        }

        await ctx.db.patch(storeInventory._id, {
          qtyInStore: newQty,
          lastUpdated: Date.now(),
        });
      }

      await ctx.db.delete(args.transactionId);
      return { success: true, message: 'Store transaction deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete store transaction: ${error}`);
      return { success: false, message: 'Failed to delete store transaction' };
    }
  },
});
