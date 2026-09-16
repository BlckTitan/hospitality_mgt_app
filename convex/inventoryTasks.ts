import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/rbac';
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

const taskTypeValidator = v.union(v.literal('restock'), v.literal('putaway'));
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

export const getAllInventoryTasks = query({
  args: {
    propertyId: v.id('properties'),
    board: v.optional(v.union(v.literal('unassigned'), v.literal('mine'), v.literal('overdue'))),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, MODULE_PERMS.inventory.read, args.propertyId);
    const linked = await linkedStaffForUser(ctx, auth.user._id);
    const rows = await ctx.db
      .query('inventoryTasks')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    const now = Date.now();
    const data = await Promise.all(rows.map(async (row) => {
      const assignmentInfo = await enrichAssignments(ctx, { inventoryTaskId: row._id });
      const item = await ctx.db.get(row.inventoryItemId);
      const purchaseOrder = row.purchaseOrderId ? await ctx.db.get(row.purchaseOrderId) : null;
      return {
        ...row,
        ...assignmentInfo,
        item,
        purchaseOrder,
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

export const getInventoryTask = query({
  args: { inventoryTaskId: v.id('inventoryTasks') },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.inventoryTaskId);
    if (!row) return { success: false, data: null, message: 'Inventory task not found' };
    await requirePermission(ctx, MODULE_PERMS.inventory.read, row.propertyId);
    const assignmentInfo = await enrichAssignments(ctx, { inventoryTaskId: row._id });
    const item = await ctx.db.get(row.inventoryItemId);
    const purchaseOrder = row.purchaseOrderId ? await ctx.db.get(row.purchaseOrderId) : null;
    return { success: true, data: { ...row, ...assignmentInfo, item, purchaseOrder } };
  },
});

export const createInventoryTask = mutation({
  args: {
    propertyId: v.id('properties'),
    taskType: taskTypeValidator,
    inventoryItemId: v.id('inventoryItems'),
    suggestedQuantity: v.optional(v.number()),
    purchaseOrderId: v.optional(v.id('purchaseOrders')),
    priority: v.optional(priorityValidator),
    leadId: v.optional(v.id('staffs')),
    helperIds: v.optional(v.array(v.id('staffs'))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, MODULE_PERMS.inventory.assign, args.propertyId);
    if (args.taskType === 'putaway' && !args.purchaseOrderId) {
      return { success: false, message: 'Putaway tasks require a purchase order' };
    }
    if (args.taskType === 'putaway' && args.purchaseOrderId) {
      const existing = await ctx.db
        .query('inventoryTasks')
        .withIndex('by_purchaseOrderId', (q) => q.eq('purchaseOrderId', args.purchaseOrderId!))
        .collect();
      if (existing.some((row) => row.status === 'pending' || row.status === 'in-progress')) {
        return { success: false, message: 'An open putaway task already exists for this purchase order' };
      }
    }
    if (args.taskType === 'restock') {
      const pending = await ctx.db
        .query('inventoryTasks')
        .withIndex('by_inventoryItemId_taskType_status', (q) =>
          q.eq('inventoryItemId', args.inventoryItemId).eq('taskType', 'restock').eq('status', 'pending'),
        )
        .first();
      const busy = await ctx.db
        .query('inventoryTasks')
        .withIndex('by_inventoryItemId_taskType_status', (q) =>
          q.eq('inventoryItemId', args.inventoryItemId).eq('taskType', 'restock').eq('status', 'in-progress'),
        )
        .first();
      if (pending || busy) {
        return { success: false, message: 'An open restock task already exists for this item' };
      }
    }
    const now = Date.now();
    const dueAt = await dueAtFor(ctx, args.propertyId, 'inventory', args.taskType, now);
    const snap = await snapshotChecklist(ctx, args.propertyId, 'inventory', args.taskType);
    const leadId = args.leadId ?? await defaultLeadStaffId(ctx, args.propertyId, 'inventory', auth.user._id);
    const id = await ctx.db.insert('inventoryTasks', {
      propertyId: args.propertyId,
      taskType: args.taskType,
      inventoryItemId: args.inventoryItemId,
      suggestedQuantity: args.suggestedQuantity,
      source: 'manual',
      purchaseOrderId: args.purchaseOrderId,
      templateId: snap.templateId,
      createdBy: auth.user._id,
      status: 'pending',
      priority: args.priority ?? 'medium',
      dueAt,
      notes: args.notes,
      checklist: snap.checklist,
      createdAt: now,
      updatedAt: now,
    });
    await assignLeadAndHelpers(ctx, {
      propertyId: args.propertyId,
      parent: { inventoryTaskId: id },
      leadId,
      helperIds: args.helperIds,
      assignedBy: auth.user._id,
    });
    return { success: true, message: 'Inventory task created', id };
  },
});

export const updateInventoryTask = mutation({
  args: {
    inventoryTaskId: v.id('inventoryTasks'),
    status: v.optional(statusValidator),
    priority: v.optional(priorityValidator),
    notes: v.optional(v.string()),
    checklist: v.optional(v.any()),
    leadId: v.optional(v.id('staffs')),
    helperIds: v.optional(v.array(v.id('staffs'))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.inventoryTaskId);
    if (!existing) return { success: false, message: 'Inventory task not found' };
    const auth = await requirePermission(ctx, MODULE_PERMS.inventory.update, existing.propertyId);
    const linked = await linkedStaffForUser(ctx, auth.user._id);
    const assignments = await listAssignments(ctx, { inventoryTaskId: args.inventoryTaskId });

    if (args.status === 'in-progress' && existing.status !== 'in-progress') {
      assertCanStart({ auth, module: 'inventory', assignments, staffId: linked?._id ?? null });
    }
    if (args.status === 'completed' && existing.status !== 'completed') {
      await requirePermission(ctx, MODULE_PERMS.inventory.complete, existing.propertyId);
      assertCanComplete({ auth, module: 'inventory', assignments, staffId: linked?._id ?? null });
    }
    if (args.status === 'cancelled') {
      if (!canAssign(auth, 'inventory')) {
        return { success: false, message: 'Only a supervisor can cancel this task' };
      }
      if (!args.notes && !existing.notes) {
        return { success: false, message: 'Notes are required when cancelling' };
      }
    }

    if (args.leadId && canAssign(auth, 'inventory')) {
      await setLead(ctx, {
        propertyId: existing.propertyId,
        parent: { inventoryTaskId: args.inventoryTaskId },
        staffId: args.leadId,
        assignedBy: auth.user._id,
      });
    }
    if (args.helperIds && canAssign(auth, 'inventory')) {
      for (const helperId of args.helperIds) {
        await addHelper(ctx, {
          propertyId: existing.propertyId,
          parent: { inventoryTaskId: args.inventoryTaskId },
          staffId: helperId,
          assignedBy: auth.user._id,
        });
      }
    }

    const now = Date.now();
    const patch: Record<string, unknown> = { updatedAt: now };
    if (args.status !== undefined) patch.status = args.status;
    if (args.priority !== undefined) patch.priority = args.priority;
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.checklist !== undefined) patch.checklist = args.checklist;
    if (args.status === 'in-progress' && existing.status !== 'in-progress') patch.startedAt = now;
    if (args.status === 'completed' && existing.status !== 'completed') patch.completedAt = now;
    await ctx.db.patch(args.inventoryTaskId, patch);
    return { success: true, message: 'Inventory task updated' };
  },
});
