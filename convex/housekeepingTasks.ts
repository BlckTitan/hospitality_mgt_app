import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission, tryRequirePermission } from './lib/rbac';
import {
  addHelper,
  assignLeadAndHelpers,
  assertCanComplete,
  assertCanStart,
  canAssign,
  createHousekeepingWork,
  enrichAssignments,
  isOpenStatus,
  linkedStaffForUser,
  listAssignments,
  MODULE_PERMS,
  setLead,
} from './lib/taskAssignment';
import { Id } from './_generated/dataModel';
import { isActiveStatus } from './lib/staffAccess';

const taskTypeValidator = v.union(
  v.literal('checkout'),
  v.literal('stayover'),
  v.literal('deep-clean'),
  v.literal('inspection'),
);
const statusValidator = v.union(
  v.literal('pending'),
  v.literal('in-progress'),
  v.literal('completed'),
  v.literal('skipped'),
);
const priorityValidator = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
  v.literal('urgent'),
);

async function enrichTask(ctx: Parameters<typeof enrichAssignments>[0], task: {
  _id: Id<'housekeepingTasks'>;
  roomId: Id<'rooms'>;
  assignedTo?: Id<'staffs'>;
  dueAt?: number;
  status: string;
}) {
  const room = await ctx.db.get(task.roomId);
  const roomType = room ? await ctx.db.get(room.roomTypeId) : null;
  const assignmentInfo = await enrichAssignments(ctx, { housekeepingTaskId: task._id });
  const legacyLead = !assignmentInfo.lead && task.assignedTo
    ? await ctx.db.get(task.assignedTo)
    : null;
  const leadStaff = assignmentInfo.lead?.staff
    ?? (legacyLead
      ? { _id: legacyLead._id, firstName: legacyLead.firstName, lastName: legacyLead.lastName }
      : null);
  return {
    ...task,
    room: room ? { ...room, roomType } : null,
    lead: assignmentInfo.lead,
    helpers: assignmentInfo.helpers,
    assignments: assignmentInfo.assignments,
    assignedToStaff: leadStaff,
    overdue: Boolean(task.dueAt && isOpenStatus(task.status) && task.dueAt < Date.now()),
  };
}

export const getAllHousekeepingTasks = query({
  args: {
    propertyId: v.id('properties'),
    board: v.optional(v.union(v.literal('unassigned'), v.literal('mine'), v.literal('overdue'))),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, MODULE_PERMS.housekeeping.read, args.propertyId);
    try {
      const auth = await requirePermission(ctx, MODULE_PERMS.housekeeping.read, args.propertyId);
      const linked = await linkedStaffForUser(ctx, auth.user._id);
      const tasks = await ctx.db
        .query('housekeepingTasks')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();

      const tasksWithDetails = await Promise.all(tasks.map((task) => enrichTask(ctx, task)));
      const now = Date.now();
      const filtered = tasksWithDetails.filter((task) => {
        if (!args.board) return true;
        if (args.board === 'unassigned') return !task.lead && !task.assignedToStaff;
        if (args.board === 'overdue') {
          return Boolean(task.dueAt && isOpenStatus(task.status) && task.dueAt < now);
        }
        if (args.board === 'mine') {
          if (!linked) return false;
          return task.assignments.some((row) => row.staffId === linked._id)
            || task.assignedTo === linked._id;
        }
        return true;
      });

      return { success: true, data: filtered };
    } catch (error) {
      console.log(`Failed to fetch housekeeping tasks: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch housekeeping tasks' };
    }
  },
});

export const getHousekeepingTask = query({
  args: { taskId: v.id('housekeepingTasks') },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return { success: false, data: null, message: 'Housekeeping task not found' };
    }
    await requirePermission(ctx, MODULE_PERMS.housekeeping.read, task.propertyId);
    try {
      return { success: true, data: await enrichTask(ctx, task) };
    } catch (error) {
      console.log(`Failed to fetch housekeeping task: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch housekeeping task' };
    }
  },
});

export const listAssignableStaff = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    const allowed =
      (await tryRequirePermission(ctx, MODULE_PERMS.housekeeping.read, args.propertyId))
      || (await tryRequirePermission(ctx, MODULE_PERMS.maintenance.read, args.propertyId))
      || (await tryRequirePermission(ctx, MODULE_PERMS.inventory.read, args.propertyId));
    if (!allowed) {
      throw new Error('Unauthorized');
    }
    const staff = await ctx.db
      .query('staffs')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    return staff
      .filter((row) => isActiveStatus(row.employmentStatus))
      .map((row) => ({
        _id: row._id,
        firstName: row.firstName,
        lastName: row.lastName,
        department: row.department,
      }));
  },
});

export const createHousekeepingTask = mutation({
  args: {
    propertyId: v.id('properties'),
    roomId: v.id('rooms'),
    assignedTo: v.optional(v.id('staffs')),
    helperIds: v.optional(v.array(v.id('staffs'))),
    taskType: taskTypeValidator,
    status: v.optional(statusValidator),
    priority: v.optional(priorityValidator),
    scheduledAt: v.optional(v.number()),
    estimatedDuration: v.optional(v.number()),
    notes: v.optional(v.string()),
    checklist: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, MODULE_PERMS.housekeeping.assign, args.propertyId);
    try {
      const result = await createHousekeepingWork(ctx, {
        propertyId: args.propertyId,
        roomId: args.roomId,
        taskType: args.taskType,
        source: 'manual',
        priority: args.priority,
        scheduledAt: args.scheduledAt,
        estimatedDuration: args.estimatedDuration,
        notes: args.notes,
        createdBy: auth.user._id,
        leadId: args.assignedTo,
        helperIds: args.helperIds,
      });
      if (result.success && args.checklist) {
        await ctx.db.patch(result.id, { checklist: args.checklist });
      }
      return result;
    } catch (error) {
      console.log(`Failed to create housekeeping task: ${error}`);
      return { success: false, message: error instanceof Error ? error.message : 'Failed to create housekeeping task' };
    }
  },
});

export const updateHousekeepingTask = mutation({
  args: {
    taskId: v.id('housekeepingTasks'),
    roomId: v.optional(v.id('rooms')),
    assignedTo: v.optional(v.id('staffs')),
    helperIds: v.optional(v.array(v.id('staffs'))),
    taskType: v.optional(taskTypeValidator),
    status: v.optional(statusValidator),
    priority: v.optional(priorityValidator),
    scheduledAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    estimatedDuration: v.optional(v.number()),
    actualDuration: v.optional(v.number()),
    notes: v.optional(v.string()),
    checklist: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existingTask = await ctx.db.get(args.taskId);
    if (!existingTask) {
      return { success: false, message: 'Housekeeping task not found' };
    }
    const auth = await requirePermission(ctx, MODULE_PERMS.housekeeping.update, existingTask.propertyId);
    const linked = await linkedStaffForUser(ctx, auth.user._id);
    const assignments = await listAssignments(ctx, { housekeepingTaskId: args.taskId });

    try {
      if (args.status === 'in-progress' && existingTask.status !== 'in-progress') {
        assertCanStart({ auth, module: 'housekeeping', assignments, staffId: linked?._id ?? null });
      }
      if (args.status === 'completed' && existingTask.status !== 'completed') {
        await requirePermission(ctx, MODULE_PERMS.housekeeping.complete, existingTask.propertyId);
        assertCanComplete({ auth, module: 'housekeeping', assignments, staffId: linked?._id ?? null });
        if (!assignments.some((row) => row.role === 'lead') && !canAssign(auth, 'housekeeping')) {
          return { success: false, message: 'A lead must be assigned before completion' };
        }
      }
      if (args.status === 'skipped') {
        if (!canAssign(auth, 'housekeeping')) {
          return { success: false, message: 'Only a supervisor can skip a task' };
        }
        if (!args.notes && !existingTask.notes) {
          return { success: false, message: 'Notes are required when skipping a task' };
        }
      }

      if (args.roomId) {
        const room = await ctx.db.get(args.roomId);
        if (!room) return { success: false, message: 'Room does not exist' };
        if (room.propertyId !== existingTask.propertyId) {
          return { success: false, message: 'Room does not belong to this property' };
        }
      }

      if (args.assignedTo && canAssign(auth, 'housekeeping')) {
        await setLead(ctx, {
          propertyId: existingTask.propertyId,
          parent: { housekeepingTaskId: args.taskId },
          staffId: args.assignedTo,
          assignedBy: auth.user._id,
        });
      }
      if (args.helperIds && canAssign(auth, 'housekeeping')) {
        for (const helperId of args.helperIds) {
          await addHelper(ctx, {
            propertyId: existingTask.propertyId,
            parent: { housekeepingTaskId: args.taskId },
            staffId: helperId,
            assignedBy: auth.user._id,
          });
        }
      }

      const now = Date.now();
      const updateData: Record<string, unknown> = { updatedAt: now };
      if (args.roomId !== undefined) updateData.roomId = args.roomId;
      if (args.taskType !== undefined) updateData.taskType = args.taskType;
      if (args.status !== undefined) updateData.status = args.status;
      if (args.priority !== undefined) updateData.priority = args.priority;
      if (args.scheduledAt !== undefined) updateData.scheduledAt = args.scheduledAt;
      if (args.estimatedDuration !== undefined) updateData.estimatedDuration = args.estimatedDuration;
      if (args.notes !== undefined) updateData.notes = args.notes;
      if (args.checklist !== undefined) updateData.checklist = args.checklist;

      if (args.status === 'in-progress' && existingTask.status !== 'in-progress' && !args.startedAt) {
        updateData.startedAt = now;
      } else if (args.startedAt !== undefined) {
        updateData.startedAt = args.startedAt;
      }

      if (args.status === 'completed' && existingTask.status !== 'completed') {
        updateData.completedAt = now;
        const startTime = args.startedAt || existingTask.startedAt || now;
        updateData.actualDuration = Math.round((now - startTime) / (1000 * 60));
        await ctx.db.patch(existingTask.roomId, { lastCleanedAt: now, updatedAt: now });
      } else if (args.completedAt !== undefined) {
        updateData.completedAt = args.completedAt;
      }
      if (args.actualDuration !== undefined) {
        updateData.actualDuration = args.actualDuration;
      }

      await ctx.db.patch(args.taskId, updateData);
      return { success: true, message: 'Housekeeping task updated successfully' };
    } catch (error) {
      console.log(`Failed to update housekeeping task: ${error}`);
      return { success: false, message: error instanceof Error ? error.message : 'Failed to update housekeeping task' };
    }
  },
});

export const deleteHousekeepingTask = mutation({
  args: { taskId: v.id('housekeepingTasks') },
  handler: async (ctx, args) => {
    const existingTask = await ctx.db.get(args.taskId);
    if (!existingTask) {
      return { success: false, message: 'Housekeeping task not found' };
    }
    await requirePermission(ctx, MODULE_PERMS.housekeeping.assign, existingTask.propertyId);

    try {
      if (existingTask.status === 'in-progress' || existingTask.status === 'completed') {
        return { success: false, message: 'Cannot delete in-progress or completed tasks' };
      }
      const assignments = await listAssignments(ctx, { housekeepingTaskId: args.taskId });
      for (const row of assignments) {
        await ctx.db.delete(row._id);
      }
      await ctx.db.delete(args.taskId);
      return { success: true, message: 'Housekeeping task deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete housekeeping task: ${error}`);
      return { success: false, message: 'Failed to delete housekeeping task' };
    }
  },
});

export const migrateAssignedTo = mutation({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, MODULE_PERMS.housekeeping.assign, args.propertyId);
    const tasks = await ctx.db
      .query('housekeepingTasks')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    let migrated = 0;
    for (const task of tasks) {
      if (!task.assignedTo) continue;
      const existing = await listAssignments(ctx, { housekeepingTaskId: task._id });
      if (existing.some((row) => row.role === 'lead')) continue;
      await assignLeadAndHelpers(ctx, {
        propertyId: args.propertyId,
        parent: { housekeepingTaskId: task._id },
        leadId: task.assignedTo,
      });
      migrated += 1;
    }
    return { success: true, message: `Migrated ${migrated} housekeeping assignments` };
  },
});
