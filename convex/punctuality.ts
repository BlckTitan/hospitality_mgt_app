import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import {
  AuthContext,
  requireAuthenticated,
  requirePermission,
  tryRequirePermission,
} from "./lib/rbac";
import { canSeeAllTeamRecords, currentUsersStaff, restrictToDirectReports } from "./lib/staffAccess";
import {
  isIsoDate,
  loadGraceMinutes,
  loadPropertyTimeZone,
  resolveShiftPunctuality,
  summarizePunctuality,
  type PunctualityDay,
} from "./lib/punctuality";
import { staffDisplayName } from "./lib/shiftHelpers";

async function requirePunctualityRead(ctx: QueryCtx, propertyId: Id<"properties">) {
  const timesheet = await tryRequirePermission(ctx, "payroll.timesheet.read", propertyId);
  if (timesheet) return timesheet;
  return await requirePermission(ctx, "staff.read", propertyId);
}

async function assertCanViewStaffPunctuality(
  ctx: QueryCtx,
  auth: AuthContext,
  employeeId: Id<"staffs">,
) {
  if (canSeeAllTeamRecords(auth)) return null;
  const me = await currentUsersStaff(ctx, auth.user._id);
  if (!me) return "You have no staff record to identify your team.";
  if (employeeId === me._id) return null;
  const staff = await ctx.db.get(employeeId);
  if (!staff) return "Staff not found";
  if (staff.managerId !== me._id) {
    return "You can only view punctuality for yourself and your direct reports.";
  }
  return null;
}

function inRange(shiftDate: string, fromDate: string, toDate: string) {
  return shiftDate >= fromDate && shiftDate <= toDate;
}

async function daysForShifts(
  ctx: QueryCtx,
  shifts: Doc<"shifts">[],
  graceMinutes: number,
  timeZone: string,
): Promise<PunctualityDay[]> {
  const scored = await Promise.all(
    shifts.map(async (shift) => {
      const template = shift.shiftTemplateId ? await ctx.db.get(shift.shiftTemplateId) : null;
      const resolved = resolveShiftPunctuality(shift, template, graceMinutes, timeZone);
      return {
        shiftId: shift._id,
        ...resolved,
      } satisfies PunctualityDay;
    }),
  );
  return scored.sort((a, b) => b.shiftDate.localeCompare(a.shiftDate));
}

export const getMyReport = query({
  args: {
    fromDate: v.string(),
    toDate: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticated(ctx);
    if (!isIsoDate(args.fromDate) || !isIsoDate(args.toDate) || args.fromDate > args.toDate) {
      return { success: false, message: "Choose a valid date range.", data: null };
    }
    const staff = await ctx.db
      .query("staffs")
      .withIndex("by_userId", (q) => q.eq("userId", auth.user._id))
      .first();
    if (!staff) {
      return {
        success: false,
        message: "No staff record is linked to your login.",
        data: null,
      };
    }
    const propertyId = staff.propertyId ?? auth.propertyIds[0];
    if (!propertyId) {
      return { success: false, message: "Staff is not assigned to a property.", data: null };
    }
    const [graceMinutes, timeZone] = await Promise.all([
      loadGraceMinutes(ctx, propertyId),
      loadPropertyTimeZone(ctx, propertyId),
    ]);
    const shifts = (
      await ctx.db
        .query("shifts")
        .withIndex("by_employeeId", (q) => q.eq("employeeId", staff._id))
        .collect()
    ).filter((shift) => inRange(shift.shiftDate, args.fromDate, args.toDate));
    const days = await daysForShifts(ctx, shifts, graceMinutes, timeZone);
    return {
      success: true,
      data: {
        staffId: staff._id,
        staffName: staffDisplayName(staff),
        fromDate: args.fromDate,
        toDate: args.toDate,
        graceMinutes,
        days,
        summary: summarizePunctuality(days),
      },
    };
  },
});

export const getStaffReport = query({
  args: {
    staffId: v.id("staffs"),
    fromDate: v.string(),
    toDate: v.string(),
  },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      return { success: false, message: "Staff not found", data: null };
    }
    const propertyId = staff.propertyId;
    if (!propertyId) {
      return { success: false, message: "Staff is not assigned to a property.", data: null };
    }
    const auth = await requirePunctualityRead(ctx, propertyId);
    const denied = await assertCanViewStaffPunctuality(ctx, auth, args.staffId);
    if (denied) {
      return { success: false, message: denied, data: null };
    }
    if (!isIsoDate(args.fromDate) || !isIsoDate(args.toDate) || args.fromDate > args.toDate) {
      return { success: false, message: "Choose a valid date range.", data: null };
    }
    const [graceMinutes, timeZone] = await Promise.all([
      loadGraceMinutes(ctx, propertyId),
      loadPropertyTimeZone(ctx, propertyId),
    ]);
    const shifts = (
      await ctx.db
        .query("shifts")
        .withIndex("by_employeeId", (q) => q.eq("employeeId", staff._id))
        .collect()
    ).filter((shift) => inRange(shift.shiftDate, args.fromDate, args.toDate));
    const days = await daysForShifts(ctx, shifts, graceMinutes, timeZone);
    return {
      success: true,
      data: {
        staffId: staff._id,
        staffName: staffDisplayName(staff),
        department: staff.department,
        fromDate: args.fromDate,
        toDate: args.toDate,
        graceMinutes,
        days,
        summary: summarizePunctuality(days),
      },
    };
  },
});

export const listPropertySummary = query({
  args: {
    propertyId: v.id("properties"),
    fromDate: v.string(),
    toDate: v.string(),
    department: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePunctualityRead(ctx, args.propertyId);
    if (!isIsoDate(args.fromDate) || !isIsoDate(args.toDate) || args.fromDate > args.toDate) {
      return { success: false, message: "Choose a valid date range.", data: [] };
    }
    const [graceMinutes, timeZone] = await Promise.all([
      loadGraceMinutes(ctx, args.propertyId),
      loadPropertyTimeZone(ctx, args.propertyId),
    ]);
    const shifts = (
      await ctx.db
        .query("shifts")
        .withIndex("by_propertyId_date", (q) =>
          q.eq("propertyId", args.propertyId).gte("shiftDate", args.fromDate).lte("shiftDate", args.toDate),
        )
        .collect()
    ).filter((shift) => Boolean(shift.employeeId));

    const visible = await restrictToDirectReports(
      ctx,
      auth,
      shifts.map((shift) => ({ ...shift, employeeId: shift.employeeId! })),
    );

    const byStaff = new Map<Id<"staffs">, typeof visible>();
    for (const shift of visible) {
      if (args.department && shift.department !== args.department) continue;
      const list = byStaff.get(shift.employeeId) ?? [];
      list.push(shift);
      byStaff.set(shift.employeeId, list);
    }

    const rows = await Promise.all(
      [...byStaff.entries()].map(async ([employeeId, staffShifts]) => {
        const staff = await ctx.db.get(employeeId);
        const days = await daysForShifts(ctx, staffShifts, graceMinutes, timeZone);
        return {
          staffId: employeeId,
          staffName: staffDisplayName(staff),
          department: staff?.department ?? staffShifts[0]?.department,
          summary: summarizePunctuality(days),
        };
      }),
    );

    rows.sort((a, b) => {
      const lateDiff = b.summary.daysLate - a.summary.daysLate;
      if (lateDiff !== 0) return lateDiff;
      return a.staffName.localeCompare(b.staffName);
    });

    return {
      success: true,
      data: rows,
      graceMinutes,
    };
  },
});
