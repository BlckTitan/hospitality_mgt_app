import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { requirePermission } from './lib/rbac';
import {
  applyIssuedQtyToStockLog,
  applyStorePurchaseCost,
  applyStoreQtyChange,
  ensureStoreInventoryForReceive,
  findStoreInventory,
  issueStockToUser,
  lineTotalCost,
  maybeOpenReorderAlert,
  previewIssueToStockLog,
  propertyDateKey,
  purchaseUnitCost,
  resolveBeverageUnitCost,
  reverseStorePurchaseCost,
} from './lib/barStock';
import { moveCatalogStockToBar, reverseTransactionEffect } from './lib/inventoryStock';

const ISSUE_RECIPIENT_ROLES = new Set(['Bartender', 'Waiter']);

export const listIssueRecipients = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'inventory.read', args.propertyId);

    const recipients = new Map<Id<'users'>, { name: string; email: string; roles: string[] }>();
    for (const roleName of ISSUE_RECIPIENT_ROLES) {
      const role = await ctx.db
        .query('roles')
        .withIndex('by_name', (q) => q.eq('name', roleName))
        .first();
      if (!role) continue;

      const assignments = await ctx.db
        .query('userRoles')
        .withIndex('by_roleId_and_propertyId', (q) =>
          q.eq('roleId', role._id).eq('propertyId', args.propertyId),
        )
        .collect();

      for (const assignment of assignments) {
        const user = await ctx.db.get(assignment.userId);
        if (!user || !user.isActive) continue;
        const existing = recipients.get(user._id);
        if (existing) {
          existing.roles.push(role.name);
        } else {
          recipients.set(user._id, { name: user.name, email: user.email, roles: [role.name] });
        }
      }
    }

    const data = [...recipients.entries()]
      .map(([userId, user]) => ({
        _id: userId,
        name: user.name,
        email: user.email,
        roles: user.roles,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { success: true as const, data };
  },
});

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
    unitCost: v.optional(v.number()),
    txnDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'inventory.create', args.propertyId);

    if (args.qty <= 0) {
      return { success: false, message: 'Quantity must be greater than 0' };
    }
    if (args.txnType === 'receive' && !purchaseUnitCost(args.unitCost)) {
      return { success: false, message: 'Enter a unit cost of 0 or more for each item purchased' };
    }

    const beverage = await ctx.db.get(args.beverageId);
    if (!beverage || beverage.propertyId !== args.propertyId) {
      return { success: false, message: 'Beverage does not exist or does not belong to this property' };
    }

    const now = Date.now();
    const txnDateKey = await propertyDateKey(ctx, args.propertyId, now);

    if (args.txnType === 'issue') {
      if (!args.barId) {
        return { success: false, message: 'Issue transactions require a bar' };
      }
      const bar = await ctx.db.get(args.barId);
      if (!bar || bar.propertyId !== args.propertyId) {
        return { success: false, message: 'Bar does not exist or does not belong to this property' };
      }

      const issued = await issueStockToUser(ctx, {
        propertyId: args.propertyId,
        beverageId: args.beverageId,
        barId: args.barId,
        userId: auth.user._id,
        qty: args.qty,
        notes: args.notes,
        unitPrice: beverage.unitPrice,
        unitCost: await resolveBeverageUnitCost(ctx, beverage),
        now,
      });
      if (issued.success === false) {
        return { success: false, message: issued.message };
      }
      return { success: true, message: 'Store transaction created successfully', id: issued.transactionId };
    }

    if (beverage.inventoryItemId) {
      const item = await ctx.db.get(beverage.inventoryItemId);
      if (!item || item.propertyId !== args.propertyId) {
        return { success: false, message: 'The linked catalog item is not on this property' };
      }
      const posted = await moveCatalogStockToBar(ctx, {
        item,
        quantity: args.qty,
        reason: args.notes || `Moved ${beverage.name} from the storeroom into the bar`,
        transactionDate: now,
      });
      if (posted.success === false || !posted.id) {
        return { success: false, message: posted.success === false ? posted.message : 'Could not move catalog stock into the bar' };
      }
      const transactionId = await ctx.db.insert('storeTransactions', {
        propertyId: args.propertyId,
        beverageId: args.beverageId,
        txnType: 'receive',
        qty: args.qty,
        ...(purchaseUnitCost(args.unitCost)
          ? { unitCost: args.unitCost, totalCost: lineTotalCost(args.qty, args.unitCost) }
          : {}),
        txnDate: now,
        txnDateKey,
        notes: args.notes,
        inventoryTransactionId: posted.id,
      });
      return {
        success: true,
        message: `Moved ${args.qty} from the storeroom into the bar. Buy more on a purchase order if the storeroom is short.`,
        id: transactionId,
      };
    }

    const inventory = await ensureStoreInventoryForReceive(ctx, {
      propertyId: args.propertyId,
      beverageId: args.beverageId,
      reorderThreshold: beverage.reorderLevel || 10,
    });
    const purchased = purchaseUnitCost(args.unitCost)
      ? await applyStorePurchaseCost(ctx, inventory, beverage, args.qty, args.unitCost)
      : undefined;
    const transactionId = await ctx.db.insert('storeTransactions', {
      propertyId: args.propertyId,
      beverageId: args.beverageId,
      barId: undefined,
      userId: undefined,
      txnType: 'receive',
      qty: args.qty,
      ...(purchased ? { unitCost: purchased.unitCost, totalCost: purchased.totalCost } : {}),
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
    unitCost: v.optional(v.number()),
    txnDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.transactionId);
    if (!existing) {
      return { success: false, message: 'Store transaction does not exist' };
    }
    const auth = await requirePermission(ctx, 'inventory.update', existing.propertyId);
    if (existing.txnType === 'count_adjust') {
      return { success: false, message: 'Count adjustments cannot be edited. Run a new store count instead.' };
    }
    if (existing.inventoryTransactionId) {
      return { success: false, message: 'This receipt moved catalog stock. Delete it and enter a new receipt.' };
    }

    if (args.qty <= 0) {
      return { success: false, message: 'Quantity must be greater than 0' };
    }
    if (args.txnType === 'receive' && !purchaseUnitCost(args.unitCost)) {
      return { success: false, message: 'Enter a unit cost of 0 or more for each item purchased' };
    }

    const beverage = await ctx.db.get(args.beverageId);
    if (!beverage || beverage.propertyId !== existing.propertyId) {
      return { success: false, message: 'Beverage does not exist or does not belong to this property' };
    }

    if (args.txnType === 'issue' && !args.barId) {
      return { success: false, message: 'Issue transactions require a bar' };
    }
    if (args.barId) {
      const bar = await ctx.db.get(args.barId);
      if (!bar || bar.propertyId !== existing.propertyId) {
        return { success: false, message: 'Bar does not exist or does not belong to this property' };
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
    const oldUnitCost = await resolveBeverageUnitCost(ctx, oldBeverage);

    if (existing.txnType === 'issue' && existing.userId && existing.barId) {
      await applyIssuedQtyToStockLog(ctx, {
        propertyId: existing.propertyId,
        userId: existing.userId,
        barId: existing.barId,
        beverageId: existing.beverageId,
        logDate: existing.txnDateKey,
        qty: -existing.qty,
        unitPrice: oldUnitPrice,
        unitCost: oldUnitCost,
      });
    }
    if (existing.txnType === 'receive' && purchaseUnitCost(existing.unitCost) && oldBeverage) {
      await reverseStorePurchaseCost(ctx, oldInventory, oldBeverage, existing.qty, existing.unitCost);
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

    const purchased =
      args.txnType === 'receive' && purchaseUnitCost(args.unitCost)
        ? await applyStorePurchaseCost(ctx, inventoryForNew, beverage, args.qty, args.unitCost)
        : undefined;
    const newStoreDelta = args.txnType === 'receive' ? args.qty : -args.qty;
    const newQty = await applyStoreQtyChange(ctx, inventoryForNew, newStoreDelta);

    if (args.txnType === 'issue' && args.barId) {
      await applyIssuedQtyToStockLog(ctx, {
        propertyId: existing.propertyId,
        userId: args.userId ?? existing.userId ?? auth.user._id,
        barId: args.barId,
        beverageId: args.beverageId,
        logDate: existing.txnDateKey,
        qty: args.qty,
        unitPrice: beverage.unitPrice,
        unitCost: await resolveBeverageUnitCost(ctx, beverage),
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
      ...(args.txnType === 'issue'
        ? { userId: args.userId ?? existing.userId ?? auth.user._id }
        : {}),
      txnType: args.txnType,
      qty: args.qty,
      ...(purchased ? { unitCost: purchased.unitCost, totalCost: purchased.totalCost } : {}),
      txnDate: existing.txnDate,
      txnDateKey: existing.txnDateKey,
      ...(args.notes ? { notes: args.notes } : {}),
      ...(existing.stockRequestLineId ? { stockRequestLineId: existing.stockRequestLineId } : {}),
      ...(existing.storeCountLineId ? { storeCountLineId: existing.storeCountLineId } : {}),
      ...(existing.inventoryTransactionId ? { inventoryTransactionId: existing.inventoryTransactionId } : {}),
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
    if (existing.txnType === 'count_adjust') {
      return { success: false, message: 'Count adjustments cannot be deleted. Run a new store count instead.' };
    }
    if (existing.inventoryTransactionId) {
      const linked = await ctx.db.get(existing.inventoryTransactionId);
      if (!linked) return { success: false, message: 'The catalog transfer for this receipt is missing' };
      const reversed = await reverseTransactionEffect(ctx, linked);
      if (reversed.success === false) return { success: false, message: reversed.message };
      await ctx.db.delete(existing.inventoryTransactionId);
      await ctx.db.delete(args.transactionId);
      return { success: true, message: 'Receipt removed and stock returned to the storeroom' };
    }

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
    if (existing.txnType === 'receive' && purchaseUnitCost(existing.unitCost)) {
      await reverseStorePurchaseCost(ctx, inventory, beverage, existing.qty, existing.unitCost);
    }
    if (existing.txnType === 'issue' && existing.userId && existing.barId) {
      await applyIssuedQtyToStockLog(ctx, {
        propertyId: existing.propertyId,
        userId: existing.userId,
        barId: existing.barId,
        beverageId: existing.beverageId,
        logDate: existing.txnDateKey,
        qty: -existing.qty,
        unitPrice: beverage?.unitPrice ?? 0,
        unitCost: await resolveBeverageUnitCost(ctx, beverage),
      });
    }
    await applyStoreQtyChange(ctx, inventory, storeDelta);
    await ctx.db.delete(args.transactionId);
    return { success: true, message: 'Store transaction deleted successfully' };
  },
});
