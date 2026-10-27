import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/rbac';
import { ensureBarLocation, ensureDefaultLocation, listStockLocations } from './lib/inventoryStock';

export const getStockLocations = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'inventory.read', args.propertyId);
    const rows = await listStockLocations(ctx, args.propertyId);
    return { success: true, data: rows.filter((row) => row.isActive) };
  },
});

export const ensureDefaultStockLocation = mutation({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'inventory.update', args.propertyId);
    const location = await ensureDefaultLocation(ctx, args.propertyId);
    await ensureBarLocation(ctx, args.propertyId);
    return { success: true as const, name: location.name, id: location._id };
  },
});

export const ensureCoreLocations = mutation({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'inventory.update', args.propertyId);
    await ensureDefaultLocation(ctx, args.propertyId);
    await ensureBarLocation(ctx, args.propertyId);
    const rows = await listStockLocations(ctx, args.propertyId);
    return { success: true, data: rows.filter((row) => row.isActive) };
  },
});

export const createStockLocation = mutation({
  args: {
    propertyId: v.id('properties'),
    name: v.string(),
    kind: v.union(
      v.literal('storeroom'),
      v.literal('outlet'),
      v.literal('floor'),
      v.literal('bar'),
    ),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'inventory.create', args.propertyId);
    const name = args.name.trim();
    if (name.length < 2) return { success: false, message: 'Location name is too short' };
    const rows = await listStockLocations(ctx, args.propertyId);
    if (rows.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
      return { success: false, message: 'A location with that name already exists' };
    }
    const now = Date.now();
    const id = await ctx.db.insert('stockLocations', {
      propertyId: args.propertyId,
      name,
      kind: args.kind,
      isDefault: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, message: 'Location created', id };
  },
});
