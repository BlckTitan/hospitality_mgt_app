import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/rbac';
import { balanceAt, ensureItemBalances, postInventoryTransaction } from './lib/inventoryStock';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export const listInventoryCounts = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'inventory.read', args.propertyId);
    const counts = await ctx.db
      .query('inventoryCounts')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .order('desc')
      .take(30);
    const data = await Promise.all(counts.map(async (count) => {
      const location = await ctx.db.get(count.locationId);
      return { ...count, locationName: location?.name ?? 'Location' };
    }));
    return { success: true, data };
  },
});

export const getActiveInventoryCount = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'inventory.read', args.propertyId);
    const draft = await ctx.db
      .query('inventoryCounts')
      .withIndex('by_propertyId_status', (q) => q.eq('propertyId', args.propertyId).eq('status', 'draft'))
      .order('desc')
      .first();
    if (!draft) return { success: true, data: null };
    const location = await ctx.db.get(draft.locationId);
    const lines = await ctx.db
      .query('inventoryCountLines')
      .withIndex('by_countId', (q) => q.eq('countId', draft._id))
      .collect();
    const linesWithItems = await Promise.all(lines.map(async (line) => {
      const item = await ctx.db.get(line.inventoryItemId);
      let liveBookQty = line.bookQty;
      if (item) {
        const balance = await ctx.db
          .query('inventoryBalances')
          .withIndex('by_item_location', (q) =>
            q.eq('inventoryItemId', item._id).eq('locationId', draft.locationId),
          )
          .unique();
        liveBookQty = balance?.quantity ?? 0;
      }
      return {
        ...line,
        item,
        itemName: item?.name ?? 'Item',
        sku: item?.sku ?? '',
        unit: item?.unit ?? '',
        liveBookQty,
      };
    }));
    return {
      success: true,
      data: {
        ...draft,
        locationName: location?.name ?? 'Location',
        lines: linesWithItems.sort((a, b) => (a.item?.name ?? '').localeCompare(b.item?.name ?? '')),
      },
    };
  },
});

export const startInventoryCount = mutation({
  args: {
    propertyId: v.id('properties'),
    locationId: v.id('stockLocations'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'inventory.update', args.propertyId);
    const location = await ctx.db.get(args.locationId);
    if (!location || location.propertyId !== args.propertyId || !location.isActive) {
      return { success: false, message: 'Choose a location at this property' };
    }
    const existing = await ctx.db
      .query('inventoryCounts')
      .withIndex('by_propertyId_status', (q) => q.eq('propertyId', args.propertyId).eq('status', 'draft'))
      .first();
    if (existing) {
      return { success: false, message: 'Finish the open count before starting another', id: existing._id };
    }
    const items = await ctx.db
      .query('inventoryItems')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    const active = items.filter((item) => item.isActive);
    if (active.length === 0) {
      return { success: false, message: 'Add catalog items before counting' };
    }
    const now = Date.now();
    const countId = await ctx.db.insert('inventoryCounts', {
      propertyId: args.propertyId,
      locationId: args.locationId,
      countDateKey: todayKey(),
      status: 'draft',
      countedByUserId: auth.user._id,
      notes: args.notes,
      createdAt: now,
    });
    for (const item of active) {
      await ensureItemBalances(ctx, item);
      const balance = await balanceAt(ctx, item, args.locationId);
      await ctx.db.insert('inventoryCountLines', {
        propertyId: args.propertyId,
        countId,
        inventoryItemId: item._id,
        bookQty: balance.quantity,
      });
    }
    return { success: true, message: `Count started for ${location.name}`, id: countId };
  },
});

export const saveInventoryCountLines = mutation({
  args: {
    countId: v.id('inventoryCounts'),
    lines: v.array(v.object({
      lineId: v.id('inventoryCountLines'),
      countedQty: v.number(),
      notes: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const count = await ctx.db.get(args.countId);
    if (!count) return { success: false, message: 'Count not found' };
    await requirePermission(ctx, 'inventory.update', count.propertyId);
    if (count.status !== 'draft') return { success: false, message: 'This count is already posted' };
    for (const patch of args.lines) {
      if (patch.countedQty < 0 || !Number.isFinite(patch.countedQty)) {
        return { success: false, message: 'Counted quantity cannot be negative' };
      }
      const line = await ctx.db.get(patch.lineId);
      if (!line || line.countId !== args.countId) return { success: false, message: 'Invalid count line' };
      await ctx.db.patch(patch.lineId, {
        countedQty: patch.countedQty,
        varianceQty: patch.countedQty - line.bookQty,
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      });
    }
    return { success: true, message: 'Count saved' };
  },
});

export const postInventoryCount = mutation({
  args: { countId: v.id('inventoryCounts') },
  handler: async (ctx, args) => {
    const count = await ctx.db.get(args.countId);
    if (!count) return { success: false, message: 'Count not found' };
    const auth = await requirePermission(ctx, 'inventory.update', count.propertyId);
    if (count.status !== 'draft') return { success: false, message: 'This count is already posted' };
    const lines = await ctx.db
      .query('inventoryCountLines')
      .withIndex('by_countId', (q) => q.eq('countId', count._id))
      .collect();
    if (lines.some((line) => line.countedQty === undefined || line.countedQty === null)) {
      return { success: false, message: 'Enter a counted quantity for every item' };
    }
    const now = Date.now();
    let netVarianceQty = 0;
    for (const line of lines) {
      const item = await ctx.db.get(line.inventoryItemId);
      if (!item) return { success: false, message: 'An item on this count no longer exists' };
      const balance = await balanceAt(ctx, item, count.locationId);
      const countedQty = line.countedQty ?? 0;
      const varianceQty = countedQty - balance.quantity;
      netVarianceQty += varianceQty;
      await ctx.db.patch(line._id, { bookQty: balance.quantity, countedQty, varianceQty });
      if (Math.abs(varianceQty) < 1e-9) continue;
      const posted = await postInventoryTransaction(ctx, {
        inventoryItemId: item._id,
        transactionType: 'adjustment',
        quantity: varianceQty,
        locationId: count.locationId,
        referenceType: 'InventoryCountLine',
        referenceId: line._id,
        reason: line.notes || 'Storeroom count',
        transactionDate: now,
      });
      if (posted.success === false) return posted;
    }
    await ctx.db.patch(count._id, {
      status: 'posted',
      postedAt: now,
      postedByUserId: auth.user._id,
      netVarianceQty,
    });
    return { success: true, message: 'Count posted. On-hand now matches what you counted.', netVarianceQty };
  },
});
