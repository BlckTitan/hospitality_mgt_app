import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/rbac';

const tableStatusValidator = v.union(
  v.literal('available'),
  v.literal('occupied'),
  v.literal('reserved'),
  v.literal('out-of-service'),
);

export const listTables = query({
  args: {
    propertyId: v.id('properties'),
    status: v.optional(tableStatusValidator),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'restaurant.read', args.propertyId);

    let rows =
      args.status !== undefined
        ? await ctx.db
            .query('restaurantTables')
            .withIndex('by_propertyId_status', (q) =>
              q.eq('propertyId', args.propertyId).eq('status', args.status!),
            )
            .collect()
        : await ctx.db
            .query('restaurantTables')
            .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
            .collect();

    if (args.isActive !== undefined) {
      rows = rows.filter((row) => row.isActive === args.isActive);
    }

    rows.sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true }));
    return { success: true, data: rows };
  },
});

export const getTable = query({
  args: { tableId: v.id('restaurantTables') },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.tableId);
    if (!table) {
      return { success: false, data: null, message: 'Table not found' };
    }
    await requirePermission(ctx, 'restaurant.read', table.propertyId);

    const currentOrder = table.currentOrderId
      ? await ctx.db.get(table.currentOrderId)
      : null;

    return { success: true, data: { ...table, currentOrder } };
  },
});

export const createTable = mutation({
  args: {
    propertyId: v.id('properties'),
    tableNumber: v.string(),
    capacity: v.number(),
    section: v.optional(v.string()),
    status: v.optional(tableStatusValidator),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'restaurant.create', args.propertyId);

    const tableNumber = args.tableNumber.trim();
    if (!tableNumber) {
      return { success: false, message: 'Table number is required' };
    }
    if (!Number.isFinite(args.capacity) || args.capacity <= 0) {
      return { success: false, message: 'Capacity must be greater than 0' };
    }

    const duplicate = await ctx.db
      .query('restaurantTables')
      .withIndex('by_propertyId_tableNumber', (q) =>
        q.eq('propertyId', args.propertyId).eq('tableNumber', tableNumber),
      )
      .first();
    if (duplicate) {
      return { success: false, message: 'A table with this number already exists' };
    }

    const now = Date.now();
    const tableId = await ctx.db.insert('restaurantTables', {
      propertyId: args.propertyId,
      tableNumber,
      capacity: args.capacity,
      section: args.section?.trim() || undefined,
      status: args.status ?? 'available',
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, data: { tableId }, message: 'Table created' };
  },
});

export const updateTable = mutation({
  args: {
    tableId: v.id('restaurantTables'),
    tableNumber: v.optional(v.string()),
    capacity: v.optional(v.number()),
    section: v.optional(v.union(v.string(), v.null())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.tableId);
    if (!table) {
      return { success: false, message: 'Table not found' };
    }
    await requirePermission(ctx, 'restaurant.update', table.propertyId);

    if (args.capacity !== undefined && (!Number.isFinite(args.capacity) || args.capacity <= 0)) {
      return { success: false, message: 'Capacity must be greater than 0' };
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.tableNumber !== undefined) {
      const tableNumber = args.tableNumber.trim();
      if (!tableNumber) {
        return { success: false, message: 'Table number is required' };
      }
      if (tableNumber !== table.tableNumber) {
        const duplicate = await ctx.db
          .query('restaurantTables')
          .withIndex('by_propertyId_tableNumber', (q) =>
            q.eq('propertyId', table.propertyId).eq('tableNumber', tableNumber),
          )
          .first();
        if (duplicate) {
          return { success: false, message: 'A table with this number already exists' };
        }
      }
      patch.tableNumber = tableNumber;
    }
    if (args.capacity !== undefined) patch.capacity = args.capacity;
    if (args.section !== undefined) {
      patch.section =
        args.section === null || args.section.trim() === ''
          ? undefined
          : args.section.trim();
    }
    if (args.isActive !== undefined) patch.isActive = args.isActive;

    await ctx.db.patch(args.tableId, patch);
    return { success: true, message: 'Table updated' };
  },
});

export const setStatus = mutation({
  args: {
    tableId: v.id('restaurantTables'),
    status: tableStatusValidator,
    clearCurrentOrder: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.tableId);
    if (!table) {
      return { success: false, message: 'Table not found' };
    }
    await requirePermission(ctx, 'restaurant.update', table.propertyId);

    const patch: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.clearCurrentOrder || args.status === 'available' || args.status === 'out-of-service') {
      patch.currentOrderId = undefined;
    }

    await ctx.db.patch(args.tableId, patch);
    return { success: true, message: 'Table status updated' };
  },
});
