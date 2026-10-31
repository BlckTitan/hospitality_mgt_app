import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/rbac';
import { applyRestaurantStockChange, RESTAURANT_STOCK_TYPES } from './lib/restaurantStock';
import { recalculateRecipesForRestaurantInventoryItem } from './lib/restaurantCost';

const stockTypeValidator = v.union(
  v.literal('receive'),
  v.literal('usage'),
  v.literal('adjustment'),
  v.literal('waste'),
);

export const listInventoryItems = query({
  args: {
    propertyId: v.id('properties'),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'restaurant.read', args.propertyId);
    let rows = await ctx.db
      .query('restaurantInventoryItems')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    if (args.isActive !== undefined) {
      rows = rows.filter((row) => row.isActive === args.isActive);
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, data: rows };
  },
});

export const listTransactions = query({
  args: {
    propertyId: v.id('properties'),
    restaurantInventoryItemId: v.optional(v.id('restaurantInventoryItems')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'restaurant.read', args.propertyId);
    const limit = Math.min(Math.max(args.limit ?? 40, 1), 100);
    const rows = args.restaurantInventoryItemId
      ? await ctx.db
          .query('restaurantInventoryTransactions')
          .withIndex('by_restaurantInventoryItemId', (q) =>
            q.eq('restaurantInventoryItemId', args.restaurantInventoryItemId!),
          )
          .order('desc')
          .take(limit)
      : await ctx.db
          .query('restaurantInventoryTransactions')
          .withIndex('by_propertyId_transactionDate', (q) => q.eq('propertyId', args.propertyId))
          .order('desc')
          .take(limit);

    const data = await Promise.all(
      rows
        .filter((row) => row.propertyId === args.propertyId)
        .map(async (row) => {
          const item = await ctx.db.get(row.restaurantInventoryItemId);
          return { ...row, itemName: item?.name ?? '—', unit: item?.unit ?? '' };
        }),
    );
    return { success: true, data };
  },
});

export const createInventoryItem = mutation({
  args: {
    propertyId: v.id('properties'),
    sku: v.string(),
    name: v.string(),
    category: v.string(),
    unit: v.string(),
    openingQuantity: v.optional(v.number()),
    reorderPoint: v.optional(v.number()),
    unitCost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'restaurant.create', args.propertyId);
    const sku = args.sku.trim();
    const name = args.name.trim();
    const category = args.category.trim();
    const unit = args.unit.trim();
    if (!sku || !name || !category || !unit) {
      return { success: false, message: 'SKU, name, category, and unit are required' };
    }

    const existing = await ctx.db
      .query('restaurantInventoryItems')
      .withIndex('by_propertyId_sku', (q) => q.eq('propertyId', args.propertyId).eq('sku', sku))
      .first();
    if (existing) {
      return { success: false, message: 'An ingredient with this SKU already exists' };
    }

    const opening = args.openingQuantity ?? 0;
    if (!Number.isFinite(opening) || opening < 0) {
      return { success: false, message: 'Opening quantity must be 0 or more' };
    }
    if (
      args.unitCost !== undefined &&
      (!Number.isFinite(args.unitCost) || args.unitCost < 0)
    ) {
      return { success: false, message: 'Unit cost must be 0 or more' };
    }
    if (
      args.reorderPoint !== undefined &&
      (!Number.isFinite(args.reorderPoint) || args.reorderPoint < 0)
    ) {
      return { success: false, message: 'Reorder point must be 0 or more' };
    }

    const now = Date.now();
    const itemId = await ctx.db.insert('restaurantInventoryItems', {
      propertyId: args.propertyId,
      sku,
      name,
      category,
      unit,
      currentQuantity: 0,
      ...(args.reorderPoint !== undefined ? { reorderPoint: args.reorderPoint } : {}),
      ...(args.unitCost !== undefined ? { unitCost: args.unitCost } : {}),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    if (opening > 0) {
      const posted = await applyRestaurantStockChange(ctx, {
        itemId,
        transactionType: 'receive',
        quantity: opening,
        unitCost: args.unitCost,
        reason: 'Opening balance',
        performedByUserId: auth.user._id,
        transactionDate: now,
      });
      if (posted.success === false) return posted;
    }

    return { success: true, data: { itemId }, message: 'Ingredient added' };
  },
});

export const updateInventoryItem = mutation({
  args: {
    itemId: v.id('restaurantInventoryItems'),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    unit: v.optional(v.string()),
    reorderPoint: v.optional(v.union(v.number(), v.null())),
    unitCost: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return { success: false, message: 'Ingredient not found' };
    await requirePermission(ctx, 'restaurant.update', item.propertyId);

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) return { success: false, message: 'Name is required' };
      patch.name = name;
    }
    if (args.category !== undefined) {
      const category = args.category.trim();
      if (!category) return { success: false, message: 'Category is required' };
      patch.category = category;
    }
    if (args.unit !== undefined) {
      const unit = args.unit.trim();
      if (!unit) return { success: false, message: 'Unit is required' };
      patch.unit = unit;
    }
    if (args.reorderPoint !== undefined) {
      if (args.reorderPoint === null) {
        patch.reorderPoint = undefined;
      } else if (!Number.isFinite(args.reorderPoint) || args.reorderPoint < 0) {
        return { success: false, message: 'Reorder point must be 0 or more' };
      } else {
        patch.reorderPoint = args.reorderPoint;
      }
    }
    if (args.unitCost !== undefined) {
      if (!Number.isFinite(args.unitCost) || args.unitCost < 0) {
        return { success: false, message: 'Unit cost must be 0 or more' };
      }
      patch.unitCost = args.unitCost;
    }
    if (args.isActive !== undefined) patch.isActive = args.isActive;

    await ctx.db.patch(args.itemId, patch);
    if (args.unitCost !== undefined) {
      await recalculateRecipesForRestaurantInventoryItem(ctx, args.itemId);
    }
    return { success: true, message: 'Ingredient updated' };
  },
});

export const recordMovement = mutation({
  args: {
    itemId: v.id('restaurantInventoryItems'),
    transactionType: stockTypeValidator,
    quantity: v.number(),
    unitCost: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return { success: false, message: 'Ingredient not found' };
    const auth = await requirePermission(ctx, 'restaurant.update', item.propertyId);
    if (!item.isActive && args.transactionType === 'receive') {
      return { success: false, message: 'Reactivate the ingredient before receiving stock' };
    }
    if (!RESTAURANT_STOCK_TYPES.includes(args.transactionType)) {
      return { success: false, message: 'Unknown movement type' };
    }

    const posted = await applyRestaurantStockChange(ctx, {
      itemId: args.itemId,
      transactionType: args.transactionType,
      quantity: args.quantity,
      unitCost: args.unitCost,
      reason: args.reason,
      referenceType: 'RestaurantInventoryAdjustment',
      performedByUserId: auth.user._id,
    });
    if (posted.success === false) return posted;

    if (args.transactionType === 'receive' && args.unitCost !== undefined) {
      await recalculateRecipesForRestaurantInventoryItem(ctx, args.itemId);
    }
    return { success: true, message: 'Stock movement recorded' };
  },
});
