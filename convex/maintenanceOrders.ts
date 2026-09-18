import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/rbac';
import { Id } from './_generated/dataModel';
import { postCashOutflow } from './lib/postCashOutflow';
import {
  addHelper,
  assignLeadAndHelpers,
  assertCanComplete,
  assertCanStart,
  canAssign,
  defaultLeadStaffId,
  dueAtFor,
  enrichAssignments,
  isOpenStatus,
  linkedStaffForUser,
  listAssignments,
  MODULE_PERMS,
  setLead,
  snapshotChecklist,
} from './lib/taskAssignment';

const orderTypeValidator = v.union(
  v.literal('preventive'),
  v.literal('corrective'),
  v.literal('emergency'),
  v.literal('inspection'),
);
const statusValidator = v.union(
  v.literal('pending'),
  v.literal('in-progress'),
  v.literal('completed'),
  v.literal('cancelled'),
);
const priorityValidator = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
  v.literal('urgent'),
);
const partInputValidator = v.object({
  inventoryItemId: v.optional(v.id('inventoryItems')),
  name: v.string(),
  quantity: v.number(),
  unitCost: v.number(),
});

type PartInput = {
  inventoryItemId?: Id<'inventoryItems'>;
  name: string;
  quantity: number;
  unitCost: number;
};

async function listParts(ctx: QueryCtx | MutationCtx, maintenanceOrderId: Id<'maintenanceOrders'>) {
  // Child rows for cost tracking; not stored as an array on the work order.
  return await ctx.db
    .query('maintenanceOrderParts')
    .withIndex('by_maintenanceOrderId', (q) => q.eq('maintenanceOrderId', maintenanceOrderId))
    .collect();
}

function partsCostOf(parts: Array<{ quantity: number; unitCost: number }>) {
  return parts.reduce((sum, part) => sum + part.quantity * part.unitCost, 0);
}

function oneOffPartsCost(
  parts: Array<{ inventoryItemId?: Id<'inventoryItems'>; quantity: number; unitCost: number }>,
) {
  return parts
    .filter((part) => !part.inventoryItemId)
    .reduce((sum, part) => sum + part.quantity * part.unitCost, 0);
}

async function normalizeParts(
  ctx: MutationCtx,
  propertyId: Id<'properties'>,
  parts: PartInput[],
) {
  const normalized: PartInput[] = [];
  for (const part of parts) {
    const name = part.name.trim();
    if (!name) {
      throw new Error('Each purchased item needs a name');
    }
    if (!Number.isFinite(part.quantity) || part.quantity <= 0) {
      throw new Error('Each purchased item needs a quantity greater than 0');
    }
    if (!Number.isFinite(part.unitCost) || part.unitCost < 0) {
      throw new Error('Each purchased item needs a unit cost of 0 or more');
    }
    let inventoryItemId = part.inventoryItemId;
    if (inventoryItemId) {
      const item = await ctx.db.get(inventoryItemId);
      if (!item || item.propertyId !== propertyId) {
        throw new Error('A purchased item is not in this property inventory');
      }
    }
    normalized.push({
      inventoryItemId,
      name,
      quantity: part.quantity,
      unitCost: part.unitCost,
    });
  }
  return normalized;
}

async function replaceParts(
  ctx: MutationCtx,
  args: {
    propertyId: Id<'properties'>;
    maintenanceOrderId: Id<'maintenanceOrders'>;
    parts: PartInput[];
  },
) {
  const existing = await listParts(ctx, args.maintenanceOrderId);
  for (const part of existing) {
    await ctx.db.delete(part._id);
  }
  const now = Date.now();
  for (const part of args.parts) {
    await ctx.db.insert('maintenanceOrderParts', {
      propertyId: args.propertyId,
      maintenanceOrderId: args.maintenanceOrderId,
      inventoryItemId: part.inventoryItemId,
      name: part.name,
      quantity: part.quantity,
      unitCost: part.unitCost,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export const listPartsCatalog = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, MODULE_PERMS.maintenance.read, args.propertyId);
    const items = await ctx.db
      .query('inventoryItems')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    return items
      .filter((item) => item.isActive)
      .map((item) => ({
        _id: item._id,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        unitCost: item.unitCost,
      }));
  },
});

export const getAllMaintenanceOrders = query({
  args: {
    propertyId: v.id('properties'),
    board: v.optional(v.union(v.literal('unassigned'), v.literal('mine'), v.literal('overdue'))),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, MODULE_PERMS.maintenance.read, args.propertyId);
    const linked = await linkedStaffForUser(ctx, auth.user._id);
    const rows = await ctx.db
      .query('maintenanceOrders')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    const now = Date.now();
    const data = await Promise.all(rows.map(async (row) => {
      const assignmentInfo = await enrichAssignments(ctx, { maintenanceOrderId: row._id });
      const asset = row.assetId ? await ctx.db.get(row.assetId) : null;
      const room = row.roomId ? await ctx.db.get(row.roomId) : null;
      const supplier = row.supplierId ? await ctx.db.get(row.supplierId) : null;
      const parts = await listParts(ctx, row._id);
      const partsCost = partsCostOf(parts);
      return {
        ...row,
        ...assignmentInfo,
        asset,
        room,
        supplier,
        partsCost,
        displayCost: row.actualCost ?? (partsCost > 0 ? partsCost : row.estimatedCost),
        overdue: isOpenStatus(row.status) && row.dueAt < now,
      };
    }));
    return {
      success: true,
      data: data.filter((row) => {
        if (!args.board) return true;
        if (args.board === 'unassigned') return !row.lead;
        if (args.board === 'overdue') return row.overdue;
        if (args.board === 'mine') {
          return linked ? row.assignments.some((a) => a.staffId === linked._id) : false;
        }
        return true;
      }),
    };
  },
});

export const getMaintenanceOrder = query({
  args: { maintenanceOrderId: v.id('maintenanceOrders') },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.maintenanceOrderId);
    if (!row) return { success: false, data: null, message: 'Maintenance order not found' };
    await requirePermission(ctx, MODULE_PERMS.maintenance.read, row.propertyId);
    const assignmentInfo = await enrichAssignments(ctx, { maintenanceOrderId: row._id });
    const asset = row.assetId ? await ctx.db.get(row.assetId) : null;
    const room = row.roomId ? await ctx.db.get(row.roomId) : null;
    const supplier = row.supplierId ? await ctx.db.get(row.supplierId) : null;
    const parts = await listParts(ctx, row._id);
    return {
      success: true,
      data: {
        ...row,
        ...assignmentInfo,
        asset,
        room,
        supplier,
        parts,
        partsCost: partsCostOf(parts),
      },
    };
  },
});

export const createMaintenanceOrder = mutation({
  args: {
    propertyId: v.id('properties'),
    assetId: v.optional(v.id('assets')),
    roomId: v.optional(v.id('rooms')),
    supplierId: v.optional(v.id('suppliers')),
    orderType: orderTypeValidator,
    priority: priorityValidator,
    title: v.string(),
    description: v.optional(v.string()),
    scheduledDate: v.optional(v.number()),
    estimatedCost: v.optional(v.number()),
    leadId: v.optional(v.id('staffs')),
    helperIds: v.optional(v.array(v.id('staffs'))),
    parts: v.optional(v.array(partInputValidator)),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, MODULE_PERMS.maintenance.assign, args.propertyId);
    if (args.orderType === 'preventive' && args.assetId) {
      const openPending = await ctx.db
        .query('maintenanceOrders')
        .withIndex('by_assetId_orderType_status', (q) =>
          q.eq('assetId', args.assetId!).eq('orderType', 'preventive').eq('status', 'pending'),
        )
        .first();
      const openBusy = await ctx.db
        .query('maintenanceOrders')
        .withIndex('by_assetId_orderType_status', (q) =>
          q.eq('assetId', args.assetId!).eq('orderType', 'preventive').eq('status', 'in-progress'),
        )
        .first();
      if (openPending || openBusy) {
        return { success: false, message: 'An open preventive work order already exists for this asset' };
      }
    }
    let parts: PartInput[] = [];
    try {
      parts = await normalizeParts(ctx, args.propertyId, args.parts ?? []);
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Invalid purchased items' };
    }
    const now = Date.now();
    const dueAt = await dueAtFor(ctx, args.propertyId, 'maintenance', args.orderType, now);
    const snap = await snapshotChecklist(ctx, args.propertyId, 'maintenance', args.orderType);
    const leadId = args.leadId ?? await defaultLeadStaffId(ctx, args.propertyId, 'maintenance', auth.user._id);
    const requestedBy = await linkedStaffForUser(ctx, auth.user._id);
    const partsCost = partsCostOf(parts);
    const id = await ctx.db.insert('maintenanceOrders', {
      propertyId: args.propertyId,
      assetId: args.assetId,
      roomId: args.roomId,
      supplierId: args.supplierId,
      requestedBy: requestedBy?._id,
      createdBy: auth.user._id,
      templateId: snap.templateId,
      orderType: args.orderType,
      source: 'manual',
      priority: args.priority,
      title: args.title,
      description: args.description,
      status: 'pending',
      scheduledDate: args.scheduledDate,
      dueAt,
      estimatedCost: args.estimatedCost ?? (partsCost > 0 ? partsCost : undefined),
      checklist: snap.checklist,
      createdAt: now,
      updatedAt: now,
    });
    await assignLeadAndHelpers(ctx, {
      propertyId: args.propertyId,
      parent: { maintenanceOrderId: id },
      leadId,
      helperIds: args.helperIds,
      assignedBy: auth.user._id,
    });
    await replaceParts(ctx, { propertyId: args.propertyId, maintenanceOrderId: id, parts });
    return { success: true, message: 'Maintenance order created', id };
  },
});

export const updateMaintenanceOrder = mutation({
  args: {
    maintenanceOrderId: v.id('maintenanceOrders'),
    assetId: v.optional(v.id('assets')),
    roomId: v.optional(v.id('rooms')),
    supplierId: v.optional(v.id('suppliers')),
    orderType: v.optional(orderTypeValidator),
    priority: v.optional(priorityValidator),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(statusValidator),
    scheduledDate: v.optional(v.number()),
    estimatedCost: v.optional(v.number()),
    actualCost: v.optional(v.number()),
    resolutionNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
    checklist: v.optional(v.any()),
    leadId: v.optional(v.id('staffs')),
    helperIds: v.optional(v.array(v.id('staffs'))),
    parts: v.optional(v.array(partInputValidator)),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.maintenanceOrderId);
    if (!existing) return { success: false, message: 'Maintenance order not found' };
    const auth = await requirePermission(ctx, MODULE_PERMS.maintenance.update, existing.propertyId);
    const linked = await linkedStaffForUser(ctx, auth.user._id);
    const assignments = await listAssignments(ctx, { maintenanceOrderId: args.maintenanceOrderId });

    if (args.status === 'in-progress' && existing.status !== 'in-progress') {
      assertCanStart({ auth, module: 'maintenance', assignments, staffId: linked?._id ?? null });
    }
    if (args.status === 'completed' && existing.status !== 'completed') {
      await requirePermission(ctx, MODULE_PERMS.maintenance.complete, existing.propertyId);
      assertCanComplete({ auth, module: 'maintenance', assignments, staffId: linked?._id ?? null });
    }
    if (args.status === 'cancelled') {
      if (!canAssign(auth, 'maintenance')) {
        return { success: false, message: 'Only a supervisor can cancel a work order' };
      }
      if (!args.notes && !existing.notes) {
        return { success: false, message: 'Notes are required when cancelling' };
      }
    }

    if (args.leadId && canAssign(auth, 'maintenance')) {
      await setLead(ctx, {
        propertyId: existing.propertyId,
        parent: { maintenanceOrderId: args.maintenanceOrderId },
        staffId: args.leadId,
        assignedBy: auth.user._id,
      });
    }
    if (args.helperIds && canAssign(auth, 'maintenance')) {
      for (const helperId of args.helperIds) {
        await addHelper(ctx, {
          propertyId: existing.propertyId,
          parent: { maintenanceOrderId: args.maintenanceOrderId },
          staffId: helperId,
          assignedBy: auth.user._id,
        });
      }
    }

    let partsCost: number | undefined;
    if (args.parts) {
      let parts: PartInput[] = [];
      try {
        parts = await normalizeParts(ctx, existing.propertyId, args.parts);
      } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : 'Invalid purchased items' };
      }
      await replaceParts(ctx, {
        propertyId: existing.propertyId,
        maintenanceOrderId: args.maintenanceOrderId,
        parts,
      });
      partsCost = partsCostOf(parts);
    }

    const now = Date.now();
    const patch: Record<string, unknown> = { updatedAt: now };
    for (const key of [
      'assetId', 'roomId', 'supplierId', 'orderType', 'priority', 'title',
      'description', 'status', 'scheduledDate', 'estimatedCost', 'actualCost',
      'resolutionNotes', 'notes', 'checklist',
    ] as const) {
      if (args[key] !== undefined) patch[key] = args[key];
    }
    if (args.actualCost === undefined && partsCost !== undefined && partsCost > 0) {
      patch.actualCost = partsCost;
    }
    if (args.status === 'in-progress' && existing.status !== 'in-progress') {
      patch.startedAt = now;
    }
    if (args.status === 'completed' && existing.status !== 'completed') {
      patch.completedAt = now;
      if (existing.orderType === 'preventive' && existing.assetId) {
        const asset = await ctx.db.get(existing.assetId);
        if (asset) {
          await ctx.db.patch(asset._id, {
            lastMaintenanceDate: now,
            nextMaintenanceDate: now + 90 * 24 * 60 * 60 * 1000,
            updatedAt: now,
          });
        }
      }
      const partsForCost = await listParts(ctx, args.maintenanceOrderId);
      const resolvedCost =
        (typeof args.actualCost === 'number' ? args.actualCost : undefined)
        ?? (typeof patch.actualCost === 'number' ? patch.actualCost : undefined)
        ?? existing.actualCost
        ?? oneOffPartsCost(partsForCost);
      if (resolvedCost > 0) {
        const supplierId = args.supplierId ?? existing.supplierId;
        const supplier = supplierId ? await ctx.db.get(supplierId) : null;
        const posted = await postCashOutflow(ctx, {
          propertyId: existing.propertyId,
          sourceType: 'MaintenanceOrder',
          sourceId: existing._id,
          amount: resolvedCost,
          category: 'maintenance',
          description: typeof args.title === 'string' ? args.title : existing.title,
          vendor: supplier?.name ?? 'Maintenance',
          paymentMethod: 'cash',
          paymentType: 'maintenance',
          createdBy: auth.user._id,
          expenseDate: now,
        });
        patch.expenseId = posted.expenseId;
      }
    }
    await ctx.db.patch(args.maintenanceOrderId, patch);
    return { success: true, message: 'Maintenance order updated' };
  },
});
