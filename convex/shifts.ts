import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { isStaffAssignedToBar } from './lib/barAssignment';
import { requireAuthenticated, requirePermission, tryRequirePermission } from './lib/rbac';
import { draftHoursFromShift } from './hours';
import { propertyTimeZone } from './lib/billingPeriods';
import { punctualityInsertFields } from './lib/punctuality';
import { zonedWallTimeToUtc } from './lib/rotation';
import {
  findActiveShiftForStaffDate,
  findActiveShiftForUserDate,
  normalizeDepartment,
  resolveStaffForShift,
  resolveStaffTemplate,
  SHIFT_DEPARTMENTS,
  staffForUser,
} from './lib/shiftHelpers';
import {
  computeCogsSnapshot,
  priorStockHandoverBlock,
  propertyDateKey,
  refreshSalesSummariesForLogs,
} from './lib/barStock';

const departmentValidator = v.union(
  v.literal('front-office'),
  v.literal('housekeeping'),
  v.literal('fnb'),
  v.literal('restaurant'),
  v.literal('maintenance'),
  v.literal('finance'),
  v.literal('admin'),
  v.literal('other'),
);

function staffName(staff: { firstName: string; lastName: string } | null) {
  if (!staff) return 'Unknown';
  return `${staff.firstName} ${staff.lastName}`;
}

function publicStaff(staff: {
  _id: string;
  firstName: string;
  lastName: string;
  department?: string;
  userId?: string;
} | null) {
  if (!staff) return null;
  return {
    _id: staff._id,
    firstName: staff.firstName,
    lastName: staff.lastName,
    department: staff.department,
    userId: staff.userId,
  };
}

function publicUser(user: { _id: string; name: string; email: string } | null) {
  if (!user) return null;
  return { _id: user._id, name: user.name, email: user.email };
}

function paddedClock(value: string): string | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** End instant in the property timezone. An end clock at or before the start is the next day. */
function shiftEndInstant(
  shift: { shiftDate: string; startTime: string; endTime: string },
  timeZone: string,
): number | null {
  const endClock = paddedClock(shift.endTime);
  if (!endClock || !/^\d{4}-\d{2}-\d{2}$/.test(shift.shiftDate)) return null;
  const end = zonedWallTimeToUtc(`${shift.shiftDate}T${endClock}`, timeZone);
  if (end == null) return null;
  const startClock = paddedClock(shift.startTime);
  if (!startClock) return end;
  const start = zonedWallTimeToUtc(`${shift.shiftDate}T${startClock}`, timeZone);
  if (start != null && end <= start) return end + 24 * 60 * 60 * 1000;
  return end;
}

function finalizeGate(
  shift: { shiftDate: string; startTime: string; endTime?: string },
  timeZone: string,
  now: number,
): { message: string } | { endAt: number } {
  if (!shift.endTime) return { message: 'Set an end time before finalizing this shift.' };
  const endAt = shiftEndInstant(
    { shiftDate: shift.shiftDate, startTime: shift.startTime, endTime: shift.endTime },
    timeZone,
  );
  if (endAt == null) return { message: 'End time must be in HH:MM format.' };
  if (now < endAt) return { message: 'This shift has not ended yet.' };
  return { endAt };
}

async function requireShiftRead(
  ctx: Parameters<typeof requirePermission>[0],
  propertyId: Parameters<typeof requirePermission>[2]
) {
  const staffAuth = await tryRequirePermission(ctx, 'staff.read', propertyId);
  if (staffAuth) return staffAuth;
  return await requirePermission(ctx, 'fnb.read', propertyId);
}

export const getAllShifts = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticated(ctx);
    if (!auth.propertyIds.includes(args.propertyId)) {
      throw new Error('Unauthorized: no access to this property');
    }
    const canManage = Boolean(await tryRequirePermission(ctx, 'staff.read', args.propertyId));
    try {
      const property = await ctx.db.get(args.propertyId);
      const timeZone = propertyTimeZone(property);
      const now = Date.now();
      let shifts = await ctx.db
        .query('shifts')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();

      if (!canManage) {
        const linked = await staffForUser(ctx, auth.user._id);
        shifts = shifts.filter(
          (shift) => shift.employeeId === linked?._id || shift.userId === auth.user._id
        );
      }

      const shiftsWithDetails = await Promise.all(
        shifts.map(async (shift) => {
          const [user, bar, staff, hours] = await Promise.all([
            shift.userId ? ctx.db.get(shift.userId) : null,
            shift.barId ? ctx.db.get(shift.barId) : null,
            shift.employeeId
              ? ctx.db.get(shift.employeeId)
              : shift.userId
                ? ctx.db.query('staffs').withIndex('by_userId', (q) => q.eq('userId', shift.userId!)).first()
                : null,
            shift._id
              ? ctx.db.query('hours').withIndex('by_shiftId', (q) => q.eq('shiftId', shift._id)).first()
              : null,
          ]);
          const gate = shift.isFinalized ? null : finalizeGate(shift, timeZone, now);
          return {
            ...shift,
            user: publicUser(user),
            bar,
            staff: publicStaff(staff),
            staffName: staffName(staff),
            hoursStatus: hours?.status,
            hoursId: hours?._id,
            finalizeBlock: gate && 'message' in gate ? gate.message : null,
          };
        })
      );

      shiftsWithDetails.sort((a, b) => b.shiftDate.localeCompare(a.shiftDate));
      return { success: true, data: shiftsWithDetails, canManage };
    } catch (error) {
      console.log(`Failed to fetch shifts: ${error}`);
      return { success: false, data: [], canManage, message: 'Failed to fetch shifts' };
    }
  },
});

export const getShift = query({
  args: { shiftId: v.id('shifts') },
  handler: async (ctx, args) => {
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) {
      return { success: false, data: null, message: 'Shift not found' };
    }
    const canManage = Boolean(await tryRequirePermission(ctx, 'staff.read', shift.propertyId));
    if (!canManage) {
      const auth = await requireAuthenticated(ctx);
      const linked = await staffForUser(ctx, auth.user._id);
      const isOwn = shift.employeeId === linked?._id || shift.userId === auth.user._id;
      if (!isOwn) {
        return { success: false, data: null, message: 'Shift not found' };
      }
    }
    try {
      const [user, bar, staff, hours] = await Promise.all([
        shift.userId ? ctx.db.get(shift.userId) : null,
        shift.barId ? ctx.db.get(shift.barId) : null,
        shift.employeeId ? ctx.db.get(shift.employeeId) : null,
        ctx.db.query('hours').withIndex('by_shiftId', (q) => q.eq('shiftId', shift._id)).first(),
      ]);
      return {
        success: true,
        data: { ...shift, user: publicUser(user), bar, staff: publicStaff(staff), hours },
      };
    } catch (error) {
      console.log(`Failed to fetch shift: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch shift' };
    }
  },
});

export const listStaffForShifts = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'staff.read', args.propertyId);
    const staffs = await ctx.db
      .query('staffs')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    const merged = staffs.filter(
      (s) => s.employmentStatus !== 'terminated'
    );
    return {
      success: true,
      data: merged.map((s) => ({
        _id: s._id,
        firstName: s.firstName,
        lastName: s.lastName,
        department: s.department,
        userId: s.userId,
      })),
    };
  },
});

export const createShift = mutation({
  args: {
    propertyId: v.id('properties'),
    employeeId: v.id('staffs'),
    barId: v.optional(v.id('bars')),
    department: departmentValidator,
    shiftDate: v.string(),
    startTime: v.string(),
    endTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'staff.create', args.propertyId);
    try {
      const staff = await ctx.db.get(args.employeeId);
      if (!staff) {
        return { success: false, message: 'Staff member not found' };
      }
      if (staff.employmentStatus === 'terminated') {
        return { success: false, message: 'Cannot assign a shift to terminated staff' };
      }

      const department = normalizeDepartment(args.department || staff.department);
      if (department === 'fnb') {
        if (!args.barId) {
          return { success: false, message: 'F&B shifts require a bar' };
        }
        const bar = await ctx.db.get(args.barId);
        if (!bar || !bar.isActive) {
          return { success: false, message: 'Bar not found or inactive' };
        }
        if (!(await isStaffAssignedToBar(ctx, staff, args.barId))) {
          return { success: false, message: 'Link this person to the bar before putting them on its shift' };
        }
        const today = await propertyDateKey(ctx, args.propertyId);
        if (args.shiftDate >= today) {
          const blocked = await priorStockHandoverBlock(ctx, {
            barId: args.barId,
            beforeDate: args.shiftDate,
            actorUserId: staff.userId,
            allowOwner: true,
            action: 'starting this shift',
          });
          if (blocked) return { success: false, message: blocked };
        }
      }

      const existing = await findActiveShiftForStaffDate(ctx, args.employeeId, args.shiftDate);
      const existingByUser = staff.userId
        ? await findActiveShiftForUserDate(ctx, staff.userId, args.shiftDate)
        : null;
      if (existing || existingByUser) {
        return { success: false, message: 'This staff member already has an active shift on that date' };
      }

      const template = await resolveStaffTemplate(ctx, staff, args.propertyId);
      const punctuality = {
        expectedStart: template?.startTime,
        expectedEnd: template?.endTime,
        clockStartLocal: args.startTime,
        minutesLate: 0,
        punctualityStatus: 'unscheduled' as const,
      };

      const shiftId = await ctx.db.insert('shifts', {
        propertyId: args.propertyId,
        employeeId: args.employeeId,
        userId: staff.userId,
        barId: department === 'fnb' ? args.barId : undefined,
        department,
        shiftDate: args.shiftDate,
        startTime: args.startTime,
        endTime: args.endTime,
        isFinalized: false,
        shiftTemplateId: template?._id,
        ...punctualityInsertFields(punctuality),
      });
      return { success: true, data: shiftId, message: 'Shift created successfully' };
    } catch (error) {
      console.log(`Failed to create shift: ${error}`);
      return { success: false, message: 'Failed to create shift' };
    }
  },
});

export const updateShift = mutation({
  args: {
    shiftId: v.id('shifts'),
    employeeId: v.optional(v.id('staffs')),
    barId: v.optional(v.id('bars')),
    department: v.optional(departmentValidator),
    shiftDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingShift = await ctx.db.get(args.shiftId);
    if (!existingShift) {
      return { success: false, message: 'Shift not found' };
    }
    await requirePermission(ctx, 'staff.update', existingShift.propertyId);

    try {
      if (existingShift.isFinalized) {
        return { success: false, message: 'Cannot update finalized shift' };
      }

      const employeeId = args.employeeId ?? existingShift.employeeId;
      const staff = employeeId ? await ctx.db.get(employeeId) : null;
      if (args.employeeId && !staff) {
        return { success: false, message: 'Staff member not found' };
      }

      const department = normalizeDepartment(
        args.department ?? existingShift.department ?? staff?.department
      );
      const barId = department === 'fnb' ? (args.barId ?? existingShift.barId) : undefined;
      if (department === 'fnb') {
        if (!barId) {
          return { success: false, message: 'F&B shifts require a bar' };
        }
        const bar = await ctx.db.get(barId);
        if (!bar || !bar.isActive) {
          return { success: false, message: 'Bar not found or inactive' };
        }
        if (staff && !(await isStaffAssignedToBar(ctx, staff, barId))) {
          return { success: false, message: 'Link this person to the bar before putting them on its shift' };
        }
        const today = await propertyDateKey(ctx, existingShift.propertyId);
        const nextUserId = staff?.userId ?? existingShift.userId;
        const assignmentChanged =
          barId !== existingShift.barId ||
          nextUserId !== existingShift.userId ||
          (args.shiftDate !== undefined && args.shiftDate !== existingShift.shiftDate);
        const shiftDate = args.shiftDate ?? existingShift.shiftDate;
        if (assignmentChanged && shiftDate >= today) {
          const blocked = await priorStockHandoverBlock(ctx, {
            barId,
            beforeDate: shiftDate,
            actorUserId: nextUserId,
            allowOwner: true,
            action: 'starting this shift',
          });
          if (blocked) return { success: false, message: blocked };
        }
      }

      const shiftDate = args.shiftDate ?? existingShift.shiftDate;
      if (employeeId && (args.employeeId || args.shiftDate)) {
        const other = await findActiveShiftForStaffDate(ctx, employeeId, shiftDate);
        if (other && other._id !== args.shiftId) {
          return { success: false, message: 'This staff member already has an active shift on that date' };
        }
      }

      const startTime = args.startTime ?? existingShift.startTime;
      const endTime = args.endTime === "" ? undefined : (args.endTime ?? existingShift.endTime);
      const template = staff
        ? await resolveStaffTemplate(ctx, staff, existingShift.propertyId)
        : null;
      const typedClock = args.startTime && args.startTime !== existingShift.startTime
        ? punctualityInsertFields({
            expectedStart: existingShift.expectedStart ?? template?.startTime,
            expectedEnd: existingShift.expectedEnd ?? template?.endTime,
            clockStartLocal: args.startTime,
            minutesLate: 0,
            punctualityStatus: 'unscheduled',
          })
        : {};

      await ctx.db.patch(args.shiftId, {
        employeeId: employeeId,
        userId: staff?.userId ?? existingShift.userId,
        barId,
        department,
        shiftDate,
        startTime,
        endTime,
        ...typedClock,
      });
      return { success: true, message: 'Shift updated successfully' };
    } catch (error) {
      console.log(`Failed to update shift: ${error}`);
      return { success: false, message: 'Failed to update shift' };
    }
  },
});

export const deleteShift = mutation({
  args: { shiftId: v.id('shifts') },
  handler: async (ctx, args) => {
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) {
      return { success: false, message: 'Shift not found' };
    }
    await requirePermission(ctx, 'staff.delete', shift.propertyId);

    try {
      if (shift.isFinalized) {
        return { success: false, message: 'Cannot delete finalized shift' };
      }
      const stockLog = await ctx.db
        .query('userStockLogs')
        .withIndex('by_shiftId', (q) => q.eq('shiftId', args.shiftId))
        .first();
      if (stockLog) {
        return { success: false, message: 'Cannot delete a shift that has stock logs' };
      }
      const hours = await ctx.db
        .query('hours')
        .withIndex('by_shiftId', (q) => q.eq('shiftId', args.shiftId))
        .first();
      if (hours) {
        return { success: false, message: 'Cannot delete a shift that has Hours' };
      }
      await ctx.db.delete(args.shiftId);
      return { success: true, message: 'Shift deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete shift: ${error}`);
      return { success: false, message: 'Failed to delete shift' };
    }
  },
});

export const finalizeShift = mutation({
  args: { shiftId: v.id('shifts') },
  handler: async (ctx, args) => {
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) {
      return { success: false, message: 'Shift not found' };
    }
    await requirePermission(ctx, 'staff.update', shift.propertyId);

    try {
      if (shift.isFinalized) {
        return { success: false, message: 'Shift is already finalized' };
      }

      const property = await ctx.db.get(shift.propertyId);
      const gate = finalizeGate(shift, propertyTimeZone(property), Date.now());
      if ('message' in gate) {
        return { success: false, message: gate.message };
      }

      const clockOutAt = shift.clockInAt ? gate.endAt : undefined;
      await ctx.db.patch(args.shiftId, {
        isFinalized: true,
        endTime: shift.endTime,
        ...(clockOutAt ? { clockOutAt } : {}),
      });

      if (shift.barId) {
        const logs = await ctx.db
          .query('userStockLogs')
          .withIndex('by_shiftId', (q) => q.eq('shiftId', args.shiftId))
          .collect();
        const refreshed = [];
        for (const log of logs) {
          if (log.holder === 'bar') continue;
          const cogs = await computeCogsSnapshot(ctx, log);
          if (!log.isFinalized) {
            await ctx.db.patch(log._id, {
              isFinalized: true,
              ...cogs,
              lastUpdatedAt: Date.now(),
            });
          } else if (log.cogsValue === undefined || log.unitCostAtSale === undefined) {
            await ctx.db.patch(log._id, cogs);
          }
          refreshed.push({ ...log, ...cogs });
        }
        await refreshSalesSummariesForLogs(ctx, refreshed);
      }

      const staff = await resolveStaffForShift(ctx, {
        employeeId: shift.employeeId,
        userId: shift.userId,
      });
      const hoursResult = await draftHoursFromShift(ctx, {
        _id: shift._id,
        propertyId: shift.propertyId,
        employeeId: staff?._id ?? shift.employeeId,
        userId: shift.userId,
        startTime: shift.startTime,
        endTime: shift.endTime,
        shiftDate: shift.shiftDate,
        clockInAt: shift.clockInAt,
        clockOutAt,
      });

      if (hoursResult.status === 'no_staff') {
        return {
          success: true,
          message: 'Shift finalized, but Hours were not created — this shift has no staff record',
        };
      }
      if (hoursResult.status === 'skipped') {
        return {
          success: true,
          message: hoursResult.message ?? 'Shift finalized. Existing Hours for that date were left unchanged',
        };
      }
      return { success: true, message: 'Shift finalized. Draft Hours created for approval' };
    } catch (error) {
      console.log(`Failed to finalize shift: ${error}`);
      return { success: false, message: 'Failed to finalize shift' };
    }
  },
});

export const getActiveUsers = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'staff.read', args.propertyId);
    try {
      const users = await ctx.db
        .query('users')
        .filter((q) => q.eq(q.field('isActive'), true))
        .collect();
      return { success: true, data: users };
    } catch (error) {
      console.log(`Failed to fetch users: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch users' };
    }
  },
});

export const getActiveBars = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requireShiftRead(ctx, args.propertyId);
    try {
      const bars = await ctx.db
        .query('bars')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .filter((q) => q.eq(q.field('isActive'), true))
        .collect();
      return { success: true, data: bars };
    } catch (error) {
      console.log(`Failed to fetch bars: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch bars' };
    }
  },
});

export const shiftDepartments = query({
  args: {},
  handler: async () => SHIFT_DEPARTMENTS,
});
