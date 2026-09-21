import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuthenticated, requirePermission, tryRequirePermission } from './lib/rbac';
import { draftHoursFromShift } from './hours';
import { currentUtcHHmm } from './lib/payrollHelpers';
import { punctualityInsertFields } from './lib/punctuality';
import {
  findActiveShiftForStaffDate,
  findActiveShiftForUserDate,
  normalizeDepartment,
  resolveStaffForShift,
  resolveStaffTemplate,
  SHIFT_DEPARTMENTS,
  staffForUser,
} from './lib/shiftHelpers';

const departmentValidator = v.union(
  v.literal('front-office'),
  v.literal('housekeeping'),
  v.literal('fnb'),
  v.literal('maintenance'),
  v.literal('finance'),
  v.literal('admin'),
  v.literal('other'),
);

function staffName(staff: { firstName: string; lastName: string } | null) {
  if (!staff) return 'Unknown';
  return `${staff.firstName} ${staff.lastName}`;
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
          return {
            ...shift,
            user,
            bar,
            staff,
            staffName: staffName(staff),
            hoursStatus: hours?.status,
            hoursId: hours?._id,
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
      return { success: true, data: { ...shift, user, bar, staff, hours } };
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
    const unscoped = (await ctx.db.query('staffs').collect()).filter((s) => !s.propertyId);
    const merged = [...staffs, ...unscoped].filter(
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
      }

      const shiftDate = args.shiftDate ?? existingShift.shiftDate;
      if (employeeId && (args.employeeId || args.shiftDate)) {
        const other = await findActiveShiftForStaffDate(ctx, employeeId, shiftDate);
        if (other && other._id !== args.shiftId) {
          return { success: false, message: 'This staff member already has an active shift on that date' };
        }
      }

      const startTime = args.startTime ?? existingShift.startTime;
      const template = staff
        ? await resolveStaffTemplate(ctx, staff, existingShift.propertyId)
        : null;
      const typedClock = args.startTime
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
        endTime: args.endTime ?? existingShift.endTime,
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

      const endTime = shift.endTime || currentUtcHHmm();
      await ctx.db.patch(args.shiftId, {
        isFinalized: true,
        endTime,
      });

      if (shift.barId) {
        const logs = await ctx.db
          .query('userStockLogs')
          .withIndex('by_shiftId', (q) => q.eq('shiftId', args.shiftId))
          .collect();
        for (const log of logs) {
          if (!log.isFinalized) {
            await ctx.db.patch(log._id, {
              isFinalized: true,
              lastUpdatedAt: Date.now(),
            });
          }
        }
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
        endTime,
        shiftDate: shift.shiftDate,
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
