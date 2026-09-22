import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/rbac';
import {
  applyIssuedQtyToStockLog,
  applyStoreQtyChange,
  ensureStoreInventoryForReceive,
  findStoreInventory,
  maybeOpenReorderAlert,
  previewIssueToStockLog,
  propertyDateKey,
} from './lib/barStock';
export const getAllStoreTransactions = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'inventory.read', args.propertyId);
    const transactions = await ctx.db
      .query('storeTransactions')
      .withIndex('by_propertyId_txnDate', (q) => q.eq('propertyId', args.propertyId))
      .order('desc')
      .take(200);

    const data = await Promise.all(
      transactions.map(async (transaction) => {
        const beverage = await ctx.db.get(transaction.beverageId);
        const bar = transaction.barId ? await ctx.db.get(transaction.barId) : null;
        const user = transaction.userId ? await ctx.db.get(transaction.userId) : null;
        return { ...transaction, beverage, bar, user };
      }),
    );
    return { success: true, data };
  },
});

export const getStoreTransaction = query({
  args: { transactionId: v.id('storeTransactions') },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      return { success: false, data: null, message: 'Store transaction not found' };
    }
    await requirePermission(ctx, 'inventory.read', transaction.propertyId);
    const beverage = await ctx.db.get(transaction.beverageId);
    const bar = transaction.barId ? await ctx.db.get(transaction.barId) : null;
    const user = transaction.userId ? await ctx.db.get(transaction.userId) : null;
    return { success: true, data: { ...transaction, beverage, bar, user } };
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
    txnDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'inventory.create', args.propertyId);

    if (args.qty <= 0) {
      return { success: false, message: 'Quantity must be greater than 0' };
    }

    const beverage = await ctx.db.get(args.beverageId);
    if (!beverage || beverage.propertyId !== args.propertyId) {
      return { success: false, message: 'Beverage does not exist or does not belong to this property' };
    }

    const now = Date.now();
    const txnDateKey = await propertyDateKey(ctx, args.propertyId, now);

    if (args.txnType === 'issue') {
      if (!args.barId || !args.userId) {
        return { success: false, message: 'Issue transactions require a bar and a user' };
      }
      const bar = await ctx.db.get(args.barId);
      if (!bar || bar.propertyId !== args.propertyId) {
        return { success: false, message: 'Bar does not exist or does not belong to this property' };
      }
      const user = await ctx.db.get(args.userId);
      if (!user) {
        return { success: false, message: 'User does not exist' };
      }
      const inventory = await findStoreInventory(ctx, args.propertyId, args.beverageId);
      if (!inventory) {
        return { success: false, message: 'No store inventory exists for this beverage. Receive stock first.' };
      }
      if (inventory.qtyInStore < args.qty) {
        return { success: false, message: 'Insufficient stock in store' };
      }
      const preview = await previewIssueToStockLog(ctx, {
        userId: args.userId,
        barId: args.barId,
        beverageId: args.beverageId,
        logDate: txnDateKey,
        qty: args.qty,
      });
      if (preview.error) {
        return { success: false, message: preview.error };
      }

      const transactionId = await ctx.db.insert('storeTransactions', {
        propertyId: args.propertyId,
        beverageId: args.beverageId,
        barId: args.barId,
        userId: args.userId,
        txnType: 'issue',
        qty: args.qty,
        txnDate: now,
        txnDateKey,
        notes: args.notes,
      });
      const newQty = await applyStoreQtyChange(ctx, inventory, -args.qty);
      await applyIssuedQtyToStockLog(ctx, {
        propertyId: args.propertyId,
        userId: args.userId,
        barId: args.barId,
        beverageId: args.beverageId,
        logDate: txnDateKey,
        qty: args.qty,
        unitPrice: beverage.unitPrice,
      });
      await maybeOpenReorderAlert(ctx, {
        propertyId: args.propertyId,
        beverageId: args.beverageId,
        qtyInStore: newQty,
        reorderThreshold: inventory.reorderThreshold,
      });
      return { success: true, message: 'Store transaction created successfully', id: transactionId };
    }

    const inventory = await ensureStoreInventoryForReceive(ctx, {
      propertyId: args.propertyId,
      beverageId: args.beverageId,
      reorderThreshold: beverage.reorderLevel || 10,
    });
    const transactionId = await ctx.db.insert('storeTransactions', {
      propertyId: args.propertyId,
      beverageId: args.beverageId,
      barId: undefined,
      userId: undefined,
      txnType: 'receive',
      qty: args.qty,
      txnDate: now,
      txnDateKey,
      notes: args.notes,
    });
    await applyStoreQtyChange(ctx, inventory, args.qty);
    return { success: true, message: 'Store transaction created successfully', id: transactionId };
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
    txnDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.transactionId);
    if (!existing) {
      return { success: false, message: 'Store transaction does not exist' };
    }
    await requirePermission(ctx, 'inventory.update', existing.propertyId);

    if (args.qty <= 0) {
      return { success: false, message: 'Quantity must be greater than 0' };
    }

    const beverage = await ctx.db.get(args.beverageId);
    if (!beverage || beverage.propertyId !== existing.propertyId) {
      return { success: false, message: 'Beverage does not exist or does not belong to this property' };
    }

    if (args.txnType === 'issue' && (!args.barId || !args.userId)) {
      return { success: false, message: 'Issue transactions require a bar and a user' };
    }
    if (args.barId) {
      const bar = await ctx.db.get(args.barId);
      if (!bar || bar.propertyId !== existing.propertyId) {
        return { success: false, message: 'Bar does not exist or does not belong to this property' };
      }
    }
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      if (!user) {
        return { success: false, message: 'User does not exist' };
      }
    }

    const oldInventory = await findStoreInventory(
      ctx,
      existing.propertyId,
      existing.beverageId,
    );
    if (!oldInventory) {
      return { success: false, message: 'Store inventory is missing for the original beverage' };
    }

    const oldDelta = existing.txnType === 'receive' ? -existing.qty : existing.qty;
    if (oldInventory.qtyInStore + oldDelta < 0) {
      return { success: false, message: 'Cannot reverse the original transaction — store qty would go negative' };
    }

    if (existing.txnType === 'issue' && existing.userId && existing.barId) {
      const reversePreview = await previewIssueToStockLog(ctx, {
        userId: existing.userId,
        barId: existing.barId,
        beverageId: existing.beverageId,
        logDate: existing.txnDateKey,
        qty: -existing.qty,
      });
      if (reversePreview.error) {
        return { success: false, message: reversePreview.error };
      }
    }

    const newInventory =
      args.beverageId === existing.beverageId
        ? oldInventory
        : await findStoreInventory(ctx, existing.propertyId, args.beverageId);

    if (args.txnType === 'issue') {
      if (!newInventory && args.beverageId === existing.beverageId) {
        // same row, after reverse
      } else if (args.beverageId !== existing.beverageId && !newInventory) {
        return { success: false, message: 'No store inventory exists for the new beverage. Receive stock first.' };
      }
      const qtyAfterOldReverse =
        args.beverageId === existing.beverageId
          ? oldInventory.qtyInStore + oldDelta
          : (newInventory?.qtyInStore ?? 0);
      if (qtyAfterOldReverse - args.qty < 0) {
        return { success: false, message: 'Insufficient stock in store for the updated issue' };
      }
      const preview = await previewIssueToStockLog(ctx, {
        userId: args.userId!,
        barId: args.barId!,
        beverageId: args.beverageId,
        logDate: existing.txnDateKey,
        qty: args.qty,
      });
      if (preview.error) {
        return { success: false, message: preview.error };
      }
    }

    const oldBeverage = await ctx.db.get(existing.beverageId);
    const oldUnitPrice = oldBeverage?.unitPrice ?? 0;

    if (existing.txnType === 'issue' && existing.userId && existing.barId) {
      await applyIssuedQtyToStockLog(ctx, {
        propertyId: existing.propertyId,
        userId: existing.userId,
        barId: existing.barId,
        beverageId: existing.beverageId,
        logDate: existing.txnDateKey,
        qty: -existing.qty,
        unitPrice: oldUnitPrice,
      });
    }
    await applyStoreQtyChange(ctx, oldInventory, oldDelta);

    const inventoryForNew =
      args.beverageId === existing.beverageId
        ? (await findStoreInventory(ctx, existing.propertyId, args.beverageId))!
        : args.txnType === 'receive'
          ? await ensureStoreInventoryForReceive(ctx, {
              propertyId: existing.propertyId,
              beverageId: args.beverageId,
              reorderThreshold: beverage.reorderLevel || 10,
            })
          : (await findStoreInventory(ctx, existing.propertyId, args.beverageId))!;

    const newStoreDelta = args.txnType === 'receive' ? args.qty : -args.qty;
    const newQty = await applyStoreQtyChange(ctx, inventoryForNew, newStoreDelta);

    if (args.txnType === 'issue' && args.userId && args.barId) {
      await applyIssuedQtyToStockLog(ctx, {
        propertyId: existing.propertyId,
        userId: args.userId,
        barId: args.barId,
        beverageId: args.beverageId,
        logDate: existing.txnDateKey,
        qty: args.qty,
        unitPrice: beverage.unitPrice,
      });
      await maybeOpenReorderAlert(ctx, {
        propertyId: existing.propertyId,
        beverageId: args.beverageId,
        qtyInStore: newQty,
        reorderThreshold: inventoryForNew.reorderThreshold,
      });
    }

    await ctx.db.replace(args.transactionId, {
      propertyId: existing.propertyId,
      beverageId: args.beverageId,
      ...(args.txnType === 'issue' && args.barId ? { barId: args.barId } : {}),
      ...(args.txnType === 'issue' && args.userId ? { userId: args.userId } : {}),
      txnType: args.txnType,
      qty: args.qty,
      txnDate: existing.txnDate,
      txnDateKey: existing.txnDateKey,
      ...(args.notes ? { notes: args.notes } : {}),
    });

    return { success: true, message: 'Store transaction updated successfully' };
  },
});

export const deleteStoreTransaction = mutation({
  args: { transactionId: v.id('storeTransactions') },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.transactionId);
    if (!existing) {
      return { success: false, message: 'Store transaction does not exist' };
    }
    await requirePermission(ctx, 'inventory.delete', existing.propertyId);

    const inventory = await findStoreInventory(
      ctx,
      existing.propertyId,
      existing.beverageId,
    );
    if (!inventory) {
      return { success: false, message: 'Store inventory is missing for this beverage' };
    }

    const storeDelta = existing.txnType === 'receive' ? -existing.qty : existing.qty;
    if (inventory.qtyInStore + storeDelta < 0) {
      return { success: false, message: 'Cannot delete transaction — would result in negative inventory' };
    }

    if (existing.txnType === 'issue' && existing.userId && existing.barId) {
      const preview = await previewIssueToStockLog(ctx, {
        userId: existing.userId,
        barId: existing.barId,
        beverageId: existing.beverageId,
        logDate: existing.txnDateKey,
        qty: -existing.qty,
      });
      if (preview.error) {
        return { success: false, message: preview.error };
      }
    }

    const beverage = await ctx.db.get(existing.beverageId);
    if (existing.txnType === 'issue' && existing.userId && existing.barId) {
      await applyIssuedQtyToStockLog(ctx, {
        propertyId: existing.propertyId,
        userId: existing.userId,
        barId: existing.barId,
        beverageId: existing.beverageId,
        logDate: existing.txnDateKey,
        qty: -existing.qty,
        unitPrice: beverage?.unitPrice ?? 0,
      });
    }
    await applyStoreQtyChange(ctx, inventory, storeDelta);
    await ctx.db.delete(args.transactionId);
    return { success: true, message: 'Store transaction deleted successfully' };
  },
});
