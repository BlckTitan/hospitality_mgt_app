import { mutation, query, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/rbac';
import { maybeCreatePreventiveOrder } from './lib/taskAssignment';

export const getAllAssets = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'maintenance.read', args.propertyId);
    const data = await ctx.db
      .query('assets')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    return { success: true, data };
  },
});

export const createAsset = mutation({
  args: {
    propertyId: v.id('properties'),
    roomId: v.optional(v.id('rooms')),
    assetTag: v.string(),
    name: v.string(),
    category: v.string(),
    status: v.optional(
      v.union(v.literal('operational'), v.literal('maintenance'), v.literal('retired')),
    ),
    nextMaintenanceDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'maintenance.update', args.propertyId);
    const now = Date.now();
    const id = await ctx.db.insert('assets', {
      propertyId: args.propertyId,
      roomId: args.roomId,
      assetTag: args.assetTag,
      name: args.name,
      category: args.category,
      status: args.status ?? 'operational',
      nextMaintenanceDate: args.nextMaintenanceDate,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, id, message: 'Asset created' };
  },
});

export const createPreventiveOrdersDue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const assets = await ctx.db.query('assets').collect();
    for (const asset of assets) {
      await maybeCreatePreventiveOrder(ctx, asset);
    }
  },
});
