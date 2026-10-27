import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission, tryRequirePermission } from './lib/rbac';
import { Doc, Id } from './_generated/dataModel';
import { postCashOutflow } from './lib/postCashOutflow';
import { postInventoryTransaction } from './lib/inventoryStock';
import { currentUsersStaff } from './lib/staffAccess';
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

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function addMonths(timestamp: number, months: number) {
  const date = new Date(timestamp);
  const day = date.getDate();
  date.setMonth(date.getMonth() + months);
  if (date.getDate() !== day) date.setDate(0);
  return date.getTime();
}

function nextOccurrence(from: number, months: number, now: number) {
  let next = addMonths(from, months);
  for (let i = 0; i < 36 && next <= now; i += 1) {
    next = addMonths(next, months);
  }
  return next;
}

type ScheduleInput = {
  isScheduled?: boolean;
  scheduledDate?: number;
  intervalMonths?: number;
  reminderDays?: number;
};

type ScheduleValue = {
  isScheduled: boolean;
  scheduledDate?: number;
  intervalMonths?: number;
  reminderDays?: number;
};

type ScheduleResult =
  | { ok: true; value: ScheduleValue }
  | { ok: false; message: string };

function readSchedule(args: ScheduleInput): ScheduleResult {
  if (!args.isScheduled) {
    return { ok: true, value: { isScheduled: false } };
  }
  if (args.scheduledDate == null || !Number.isFinite(args.scheduledDate)) {
    return { ok: false, message: 'Choose the maintenance date' };
  }
  const intervalMonths = args.intervalMonths ?? 0;
  if (!Number.isInteger(intervalMonths) || intervalMonths < 0 || intervalMonths > 60) {
    return { ok: false, message: 'Repeat interval must be a whole number from 1 to 60 months' };
  }
  const reminderDays = args.reminderDays ?? 7;
  if (!Number.isInteger(reminderDays) || reminderDays < 0 || reminderDays > 90) {
    return { ok: false, message: 'Reminder must be a whole number from 0 to 90 days before the date' };
  }
  return {
    ok: true,
    value: {
      isScheduled: true,
      scheduledDate: args.scheduledDate,
      intervalMonths,
      reminderDays,
    },
  };
}

function maintenanceReminder(
  row: {
    isScheduled?: boolean;
    scheduledDate?: number;
    reminderDays?: number;
    status: string;
  },
  now: number,
) {
  if (!row.isScheduled || row.scheduledDate == null || !isOpenStatus(row.status)) return null;
  const daysUntil = Math.round((startOfLocalDay(row.scheduledDate) - startOfLocalDay(now)) / DAY_MS);
  const lead = row.reminderDays ?? 7;
  if (daysUntil > lead) return null;
  return { daysUntil, scheduledDate: row.scheduledDate };
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
    board: v.optional(v.union(
      v.literal('unassigned'),
      v.literal('mine'),
      v.literal('overdue'),
      v.literal('dueSoon'),
    )),
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
        reminder: maintenanceReminder(row, now),
      };
    }));
    const reminders = data
      .filter((row) => row.reminder)
      .sort((a, b) => (a.scheduledDate ?? 0) - (b.scheduledDate ?? 0))
      .map((row) => ({
        _id: row._id,
        title: row.title,
        scheduledDate: row.scheduledDate as number,
        intervalMonths: row.intervalMonths,
        daysUntil: row.reminder!.daysUntil,
      }));
    return {
      success: true,
      reminders,
      data: data.filter((row) => {
        if (!args.board) return true;
        if (args.board === 'unassigned') return !row.lead;
        if (args.board === 'overdue') return row.overdue;
        if (args.board === 'dueSoon') return row.reminder != null;
        if (args.board === 'mine') {
          return linked ? row.assignments.some((a) => a.staffId === linked._id) : false;
        }
        return true;
      }),
    };
  },
});

export const getMaintenanceReminders = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    const auth = await tryRequirePermission(ctx, MODULE_PERMS.maintenance.read, args.propertyId);
    if (!auth) return [];
    const now = Date.now();
    const pending = await ctx.db
      .query('maintenanceOrders')
      .withIndex('by_propertyId_status', (q) => q.eq('propertyId', args.propertyId).eq('status', 'pending'))
      .take(200);
    const inProgress = await ctx.db
      .query('maintenanceOrders')
      .withIndex('by_propertyId_status', (q) => q.eq('propertyId', args.propertyId).eq('status', 'in-progress'))
      .take(200);
    return [...pending, ...inProgress]
      .map((row) => {
        const reminder = maintenanceReminder(row, now);
        if (!reminder) return null;
        return {
          _id: row._id,
          title: row.title,
          scheduledDate: reminder.scheduledDate,
          intervalMonths: row.intervalMonths,
          daysUntil: reminder.daysUntil,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
      .sort((a, b) => a.scheduledDate - b.scheduledDate);
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
    isScheduled: v.optional(v.boolean()),
    scheduledDate: v.optional(v.number()),
    intervalMonths: v.optional(v.number()),
    reminderDays: v.optional(v.number()),
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
    const schedule = readSchedule(args);
    if (schedule.ok === false) return { success: false, message: schedule.message };
    const now = Date.now();
    const dueAt = schedule.value.isScheduled && schedule.value.scheduledDate
      ? schedule.value.scheduledDate
      : await dueAtFor(ctx, args.propertyId, 'maintenance', args.orderType, now);
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
      ...(schedule.value.isScheduled
        ? {
            isScheduled: true as const,
            scheduledDate: schedule.value.scheduledDate,
            intervalMonths: schedule.value.intervalMonths,
            reminderDays: schedule.value.reminderDays,
          }
        : {}),
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

async function scheduleNextOccurrence(
  ctx: MutationCtx,
  existing: Doc<'maintenanceOrders'>,
  actorUserId: Id<'users'>,
) {
  if (!existing.isScheduled || !existing.intervalMonths || existing.intervalMonths < 1 || existing.scheduledDate == null) {
    return false;
  }
  const nextDate = nextOccurrence(existing.scheduledDate, existing.intervalMonths, Date.now());
  const pending = await ctx.db
    .query('maintenanceOrders')
    .withIndex('by_propertyId_status', (q) => q.eq('propertyId', existing.propertyId).eq('status', 'pending'))
    .take(200);
  const inProgress = await ctx.db
    .query('maintenanceOrders')
    .withIndex('by_propertyId_status', (q) => q.eq('propertyId', existing.propertyId).eq('status', 'in-progress'))
    .take(200);
  const duplicate = [...pending, ...inProgress].some((row) => (
    row.isScheduled && row.title === existing.title && row.scheduledDate === nextDate
  ));
  if (duplicate) return false;

  const now = Date.now();
  const snap = await snapshotChecklist(ctx, existing.propertyId, 'maintenance', existing.orderType);
  const assignments = await listAssignments(ctx, { maintenanceOrderId: existing._id });
  const leadId = assignments.find((row) => row.role === 'lead')?.staffId;
  const helperIds = assignments.filter((row) => row.role === 'helper').map((row) => row.staffId);
  const id = await ctx.db.insert('maintenanceOrders', {
    propertyId: existing.propertyId,
    assetId: existing.assetId,
    roomId: existing.roomId,
    supplierId: existing.supplierId,
    requestedBy: existing.requestedBy,
    createdBy: actorUserId,
    templateId: snap.templateId,
    orderType: existing.orderType,
    source: 'manual',
    priority: existing.priority,
    title: existing.title,
    description: existing.description,
    status: 'pending',
    isScheduled: true,
    scheduledDate: nextDate,
    intervalMonths: existing.intervalMonths,
    reminderDays: existing.reminderDays,
    dueAt: nextDate,
    estimatedCost: existing.estimatedCost,
    checklist: snap.checklist,
    createdAt: now,
    updatedAt: now,
  });
  await assignLeadAndHelpers(ctx, {
    propertyId: existing.propertyId,
    parent: { maintenanceOrderId: id },
    leadId,
    helperIds,
    assignedBy: actorUserId,
  });
  return true;
}

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
    isScheduled: v.optional(v.boolean()),
    scheduledDate: v.optional(v.number()),
    intervalMonths: v.optional(v.number()),
    reminderDays: v.optional(v.number()),
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
      'description', 'status', 'estimatedCost', 'actualCost',
      'resolutionNotes', 'notes', 'checklist',
    ] as const) {
      if (args[key] !== undefined) patch[key] = args[key];
    }
    if (args.isScheduled !== undefined) {
      const schedule = readSchedule(args);
      if (schedule.ok === false) return { success: false, message: schedule.message };
      patch.isScheduled = schedule.value.isScheduled;
      if (schedule.value.isScheduled) {
        patch.scheduledDate = schedule.value.scheduledDate;
        patch.intervalMonths = schedule.value.intervalMonths;
        patch.reminderDays = schedule.value.reminderDays;
        if (isOpenStatus(args.status ?? existing.status) && schedule.value.scheduledDate) {
          patch.dueAt = schedule.value.scheduledDate;
        }
      } else if (isOpenStatus(args.status ?? existing.status)) {
        patch.dueAt = await dueAtFor(
          ctx,
          existing.propertyId,
          'maintenance',
          args.orderType ?? existing.orderType,
          now,
        );
      }
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
          const scheduled = typeof patch.isScheduled === 'boolean' ? patch.isScheduled : existing.isScheduled;
          const interval = typeof patch.intervalMonths === 'number'
            ? patch.intervalMonths
            : (existing.intervalMonths ?? 0);
          const from = typeof patch.scheduledDate === 'number'
            ? patch.scheduledDate
            : (existing.scheduledDate ?? now);
          await ctx.db.patch(asset._id, {
            lastMaintenanceDate: now,
            nextMaintenanceDate: scheduled && interval > 0
              ? nextOccurrence(from, interval, now)
              : now + 90 * DAY_MS,
            updatedAt: now,
          });
        }
      }
      const partsForCost = await listParts(ctx, args.maintenanceOrderId);
      const staff = await currentUsersStaff(ctx, auth.user._id);
      for (const part of partsForCost) {
        if (!part.inventoryItemId) continue;
        const posted = await postInventoryTransaction(ctx, {
          inventoryItemId: part.inventoryItemId,
          transactionType: 'usage',
          quantity: part.quantity,
          unitCost: part.unitCost,
          referenceType: 'MaintenanceOrderPart',
          referenceId: part._id,
          reason: `Used on maintenance: ${existing.title}`,
          performedBy: staff?._id,
          recordShortage: true,
        });
        if (posted.success === false) {
          return { success: false, message: posted.message };
        }
      }
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
    let message = 'Maintenance order updated';
    if (args.status === 'completed' && existing.status !== 'completed') {
      const saved = await ctx.db.get(args.maintenanceOrderId);
      if (saved && await scheduleNextOccurrence(ctx, saved, auth.user._id)) {
        message = 'Maintenance order updated. The next scheduled visit was created.';
      }
    }
    return { success: true, message };
  },
});
