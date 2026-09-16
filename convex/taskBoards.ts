import { query } from './_generated/server';
import { v } from 'convex/values';
import { hasGranularPermission, requireAuthenticated, scopeAuthContextToProperty } from './lib/rbac';
import {
  enrichAssignments,
  isOpenStatus,
  linkedStaffForUser,
  MODULE_PERMS,
} from './lib/taskAssignment';

export const getMyTasks = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticated(ctx);
    const scoped = scopeAuthContextToProperty(auth, args.propertyId);
    const canRead =
      hasGranularPermission(scoped, MODULE_PERMS.housekeeping.read)
      || hasGranularPermission(scoped, MODULE_PERMS.maintenance.read)
      || hasGranularPermission(scoped, MODULE_PERMS.inventory.read);
    if (!canRead) throw new Error('Unauthorized');

    const linked = await linkedStaffForUser(ctx, auth.user._id);
    if (!linked) return { success: true, data: [] };

    const rows = await ctx.db
      .query('taskAssignments')
      .withIndex('by_staffId', (q) => q.eq('staffId', linked._id))
      .collect();

    const now = Date.now();
    const items = [];
    for (const row of rows) {
      if (row.housekeepingTaskId) {
        const task = await ctx.db.get(row.housekeepingTaskId);
        if (!task || task.propertyId !== args.propertyId) continue;
        const assignmentInfo = await enrichAssignments(ctx, { housekeepingTaskId: task._id });
        const room = await ctx.db.get(task.roomId);
        items.push({
          kind: 'housekeeping' as const,
          role: row.role,
          status: task.status,
          dueAt: task.dueAt,
          overdue: Boolean(task.dueAt && isOpenStatus(task.status) && task.dueAt < now),
          title: `${task.taskType} — Room ${room?.roomNumber ?? ''}`,
          href: `/admin/room-management/housekeeping-task/edit?task_id=${task._id}`,
          task,
          ...assignmentInfo,
        });
      } else if (row.maintenanceOrderId) {
        const task = await ctx.db.get(row.maintenanceOrderId);
        if (!task || task.propertyId !== args.propertyId) continue;
        const assignmentInfo = await enrichAssignments(ctx, { maintenanceOrderId: task._id });
        items.push({
          kind: 'maintenance' as const,
          role: row.role,
          status: task.status,
          dueAt: task.dueAt,
          overdue: isOpenStatus(task.status) && task.dueAt < now,
          title: task.title,
          href: `/admin/maintenance/edit?order_id=${task._id}`,
          task,
          ...assignmentInfo,
        });
      } else if (row.inventoryTaskId) {
        const task = await ctx.db.get(row.inventoryTaskId);
        if (!task || task.propertyId !== args.propertyId) continue;
        const assignmentInfo = await enrichAssignments(ctx, { inventoryTaskId: task._id });
        const item = await ctx.db.get(task.inventoryItemId);
        items.push({
          kind: 'inventory' as const,
          role: row.role,
          status: task.status,
          dueAt: task.dueAt,
          overdue: isOpenStatus(task.status) && task.dueAt < now,
          title: `${task.taskType} — ${item?.name ?? 'item'}`,
          href: `/admin/inventory-management/tasks/edit?task_id=${task._id}`,
          task,
          ...assignmentInfo,
        });
      }
    }
    items.sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0));
    return { success: true, data: items };
  },
});
