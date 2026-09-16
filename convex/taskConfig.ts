import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission, tryRequirePermission } from './lib/rbac';
import { ensureSlaDefaults, MODULE_PERMS, SLA_SEEDS } from './lib/taskAssignment';

const moduleValidator = v.union(
  v.literal('housekeeping'),
  v.literal('maintenance'),
  v.literal('inventory'),
);

async function requireAnyAssign(ctx: Parameters<typeof requirePermission>[0], propertyId: Parameters<typeof requirePermission>[2]) {
  const auth =
    (await tryRequirePermission(ctx, MODULE_PERMS.housekeeping.assign, propertyId))
    || (await tryRequirePermission(ctx, MODULE_PERMS.maintenance.assign, propertyId))
    || (await tryRequirePermission(ctx, MODULE_PERMS.inventory.assign, propertyId));
  if (!auth) throw new Error('Unauthorized');
  return auth;
}

export const listTemplates = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requireAnyAssign(ctx, args.propertyId);
    const rows = await ctx.db
      .query('taskTemplates')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    return { success: true, data: rows };
  },
});

export const upsertTemplate = mutation({
  args: {
    templateId: v.optional(v.id('taskTemplates')),
    propertyId: v.id('properties'),
    module: moduleValidator,
    typeKey: v.string(),
    roomTypeId: v.optional(v.id('roomTypes')),
    steps: v.array(v.object({ id: v.string(), label: v.string() })),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, MODULE_PERMS[args.module].assign, args.propertyId);
    const now = Date.now();
    if (args.templateId) {
      await ctx.db.patch(args.templateId, {
        typeKey: args.typeKey,
        roomTypeId: args.roomTypeId,
        steps: args.steps,
        isActive: args.isActive,
        updatedAt: now,
      });
      return { success: true, id: args.templateId, message: 'Template updated' };
    }
    const id = await ctx.db.insert('taskTemplates', {
      propertyId: args.propertyId,
      module: args.module,
      typeKey: args.typeKey,
      roomTypeId: args.roomTypeId,
      steps: args.steps,
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, id, message: 'Template created' };
  },
});

export const listSlaDefaults = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requireAnyAssign(ctx, args.propertyId);
    const rows = await ctx.db
      .query('taskSlaDefaults')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    return { success: true, data: rows.length ? rows : SLA_SEEDS };
  },
});

export const seedSlaDefaults = mutation({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requireAnyAssign(ctx, args.propertyId);
    await ensureSlaDefaults(ctx, args.propertyId);
    return { success: true, message: 'SLA defaults ready' };
  },
});

export const updateSlaDefault = mutation({
  args: {
    propertyId: v.id('properties'),
    module: moduleValidator,
    typeKey: v.string(),
    dueMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, MODULE_PERMS[args.module].assign, args.propertyId);
    await ensureSlaDefaults(ctx, args.propertyId);
    const existing = await ctx.db
      .query('taskSlaDefaults')
      .withIndex('by_propertyId_module_typeKey', (q) =>
        q.eq('propertyId', args.propertyId).eq('module', args.module).eq('typeKey', args.typeKey),
      )
      .collect();
    const now = Date.now();
    if (existing[0]) {
      await ctx.db.patch(existing[0]._id, { dueMinutes: args.dueMinutes, updatedAt: now });
      return { success: true, message: 'SLA updated' };
    }
    await ctx.db.insert('taskSlaDefaults', {
      propertyId: args.propertyId,
      module: args.module,
      typeKey: args.typeKey,
      dueMinutes: args.dueMinutes,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, message: 'SLA created' };
  },
});
