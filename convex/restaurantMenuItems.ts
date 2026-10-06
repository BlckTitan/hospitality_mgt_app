import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/rbac';

const stationValidator = v.union(
  v.literal('kitchen'),
  v.literal('grill'),
  v.literal('other'),
);

export const listMenuItems = query({
  args: {
    propertyId: v.id('properties'),
    station: v.optional(stationValidator),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'restaurant.read', args.propertyId);

    let rows =
      args.station !== undefined
        ? await ctx.db
            .query('restaurantMenuItems')
            .withIndex('by_propertyId_station', (q) =>
              q.eq('propertyId', args.propertyId).eq('station', args.station!),
            )
            .collect()
        : await ctx.db
            .query('restaurantMenuItems')
            .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
            .collect();

    if (args.isActive !== undefined) {
      rows = rows.filter((row) => row.isActive === args.isActive);
    }

    rows.sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, data: rows };
  },
});

export const getMenuItem = query({
  args: { menuItemId: v.id('restaurantMenuItems') },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.menuItemId);
    if (!item) {
      return { success: false, data: null, message: 'Menu item not found' };
    }
    await requirePermission(ctx, 'restaurant.read', item.propertyId);

    const recipe = await ctx.db
      .query('recipes')
      .withIndex('by_menuItemId', (q) => q.eq('menuItemId', args.menuItemId))
      .first();

    return { success: true, data: { ...item, recipe } };
  },
});

export const createMenuItem = mutation({
  args: {
    propertyId: v.id('properties'),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    subcategory: v.optional(v.string()),
    station: stationValidator,
    price: v.number(),
    cost: v.optional(v.number()),
    isAvailable: v.optional(v.boolean()),
    imageUrl: v.optional(v.string()),
    preparationTime: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'restaurant.create', args.propertyId);

    const name = args.name.trim();
    if (!name) {
      return { success: false, message: 'Name is required' };
    }
    if (!Number.isFinite(args.price) || args.price < 0) {
      return { success: false, message: 'Price must be a non-negative number' };
    }

    const now = Date.now();
    const menuItemId = await ctx.db.insert('restaurantMenuItems', {
      propertyId: args.propertyId,
      name,
      description: args.description?.trim() || undefined,
      category: args.category.trim(),
      subcategory: args.subcategory?.trim() || undefined,
      station: args.station,
      price: args.price,
      ...(args.cost !== undefined ? { cost: args.cost } : {}),
      isAvailable: args.isAvailable ?? true,
      imageUrl: args.imageUrl?.trim() || undefined,
      preparationTime: args.preparationTime,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, data: { menuItemId }, message: 'Menu item created' };
  },
});

export const updateMenuItem = mutation({
  args: {
    menuItemId: v.id('restaurantMenuItems'),
    name: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    category: v.optional(v.string()),
    subcategory: v.optional(v.union(v.string(), v.null())),
    station: v.optional(stationValidator),
    price: v.optional(v.number()),
    cost: v.optional(v.number()),
    isAvailable: v.optional(v.boolean()),
    imageUrl: v.optional(v.union(v.string(), v.null())),
    preparationTime: v.optional(v.union(v.number(), v.null())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.menuItemId);
    if (!item) {
      return { success: false, message: 'Menu item not found' };
    }
    await requirePermission(ctx, 'restaurant.update', item.propertyId);

    if (args.price !== undefined && (!Number.isFinite(args.price) || args.price < 0)) {
      return { success: false, message: 'Price must be a non-negative number' };
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) return { success: false, message: 'Name is required' };
      patch.name = name;
    }
    if (args.description !== undefined) {
      patch.description =
        args.description === null || args.description.trim() === ''
          ? undefined
          : args.description.trim();
    }
    if (args.category !== undefined) patch.category = args.category.trim();
    if (args.subcategory !== undefined) {
      patch.subcategory =
        args.subcategory === null || args.subcategory.trim() === ''
          ? undefined
          : args.subcategory.trim();
    }
    if (args.station !== undefined) patch.station = args.station;
    if (args.price !== undefined) patch.price = args.price;
    if (args.cost !== undefined) patch.cost = args.cost;
    if (args.isAvailable !== undefined) patch.isAvailable = args.isAvailable;
    if (args.imageUrl !== undefined) {
      patch.imageUrl =
        args.imageUrl === null || args.imageUrl.trim() === ''
          ? undefined
          : args.imageUrl.trim();
    }
    if (args.preparationTime !== undefined) {
      patch.preparationTime = args.preparationTime === null ? undefined : args.preparationTime;
    }
    if (args.isActive !== undefined) patch.isActive = args.isActive;

    await ctx.db.patch(args.menuItemId, patch);
    return { success: true, message: 'Menu item updated' };
  },
});

/** Soft-delete: deactivate the menu item. */
export const deactivateMenuItem = mutation({
  args: { menuItemId: v.id('restaurantMenuItems') },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.menuItemId);
    if (!item) {
      return { success: false, message: 'Menu item not found' };
    }
    await requirePermission(ctx, 'restaurant.delete', item.propertyId);

    await ctx.db.patch(args.menuItemId, {
      isActive: false,
      isAvailable: false,
      updatedAt: Date.now(),
    });
    return { success: true, message: 'Menu item deactivated' };
  },
});

/** Alias for deactivateMenuItem. */
export const softDeleteMenuItem = deactivateMenuItem;
