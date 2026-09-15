import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { assertCanApproveStaff, restrictToDirectReports } from "./lib/staffAccess";
import {
  clockOnWorkDate,
  hoursFromClock,
  hoursFromClockWithOvernight,
  roundMoney,
  startOfUtcDay,
  utcDayFromIsoDate,
} from "./lib/payrollHelpers";

async function rejectIfLocked(sheet: { lockedAt?: number }) {
  if (sheet.lockedAt) {
    return "This Hours row is locked for payroll and cannot be edited";
  }
  return null;
}

export const listHours = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, "payroll.timesheet.read", args.propertyId);
    const rows = await restrictToDirectReports(
      ctx,
      auth,
      await ctx.db
        .query("hours")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
    );
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const staff = await ctx.db.get(row.employeeId);
        return {
          ...row,
          staffName: staff ? `${staff.firstName} ${staff.lastName}` : "Unknown",
          shiftId: row.shiftId,
          clockInTime: row.clockInTime,
          clockOutTime: row.clockOutTime,
        };
      })
    );
    enriched.sort((a, b) => b.workDate - a.workDate);
    return { success: true, data: enriched };
  },
});

export const getHours = query({
  args: { hoursId: v.id("hours") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.hoursId);
    if (!row) return { success: false, data: null, message: "Hours not found" };
    await requirePermission(ctx, "payroll.timesheet.read", row.propertyId);
    const staff = await ctx.db.get(row.employeeId);
    return { success: true, data: { ...row, staff } };
  },
});

export const createHours = mutation({
  args: {
    propertyId: v.id("properties"),
    employeeId: v.id("staffs"),
    workDate: v.number(),
    clockInTime: v.optional(v.number()),
    clockOutTime: v.optional(v.number()),
    regularHours: v.optional(v.number()),
    overtimeHours: v.optional(v.number()),
    breakDuration: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "payroll.timesheet.create", args.propertyId);
    const workDate = startOfUtcDay(args.workDate);
    const existing = await ctx.db
      .query("hours")
      .withIndex("by_employeeId_workDate", (q) =>
        q.eq("employeeId", args.employeeId).eq("workDate", workDate)
      )
      .first();
    if (existing) {
      return { success: false, message: "Hours already exist for this staff member on that date" };
    }

    const settings = await ctx.db
      .query("payrollSettings")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .first();
    const dailyLimit = settings?.regularHoursLimitDaily ?? 8;
    const fromClock = hoursFromClock(args.clockInTime, args.clockOutTime, args.breakDuration ?? 0);
    const total = args.regularHours !== undefined
      ? (args.regularHours ?? 0) + (args.overtimeHours ?? 0)
      : fromClock;
    const regularHours = args.regularHours ?? Math.min(total, dailyLimit);
    const overtimeHours = args.overtimeHours ?? Math.max(0, total - dailyLimit);
    const now = Date.now();

    const id = await ctx.db.insert("hours", {
      employeeId: args.employeeId,
      propertyId: args.propertyId,
      workDate,
      clockInTime: args.clockInTime,
      clockOutTime: args.clockOutTime,
      regularHours: roundMoney(regularHours),
      overtimeHours: roundMoney(overtimeHours),
      breakDuration: args.breakDuration,
      source: "manual",
      status: "submitted",
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, message: "Hours recorded", id };
  },
});

export const updateHours = mutation({
  args: {
    hoursId: v.id("hours"),
    clockInTime: v.optional(v.number()),
    clockOutTime: v.optional(v.number()),
    regularHours: v.optional(v.number()),
    overtimeHours: v.optional(v.number()),
    breakDuration: v.optional(v.number()),
    notes: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("approved"),
      v.literal("rejected")
    )),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.hoursId);
    if (!row) return { success: false, message: "Hours not found" };
    await requirePermission(ctx, "payroll.timesheet.update", row.propertyId);
    const locked = await rejectIfLocked(row);
    if (locked) return { success: false, message: locked };
    await ctx.db.patch(args.hoursId, {
      clockInTime: args.clockInTime ?? row.clockInTime,
      clockOutTime: args.clockOutTime ?? row.clockOutTime,
      regularHours: args.regularHours ?? row.regularHours,
      overtimeHours: args.overtimeHours ?? row.overtimeHours,
      breakDuration: args.breakDuration ?? row.breakDuration,
      notes: args.notes ?? row.notes,
      status: args.status ?? row.status,
      updatedAt: Date.now(),
    });
    return { success: true, message: "Hours updated" };
  },
});

export const approveHours = mutation({
  args: { hoursId: v.id("hours") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.hoursId);
    if (!row) return { success: false, message: "Hours not found" };
    const auth = await requirePermission(ctx, "payroll.timesheet.approve", row.propertyId);
    const teamError = await assertCanApproveStaff(ctx, auth, row.employeeId);
    if (teamError) return { success: false, message: teamError };
    const locked = await rejectIfLocked(row);
    if (locked) return { success: false, message: locked };
    await ctx.db.patch(args.hoursId, {
      status: "approved",
      approvedBy: auth.user._id,
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true, message: "Hours approved" };
  },
});

export const rejectHours = mutation({
  args: { hoursId: v.id("hours") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.hoursId);
    if (!row) return { success: false, message: "Hours not found" };
    const auth = await requirePermission(ctx, "payroll.timesheet.approve", row.propertyId);
    const teamError = await assertCanApproveStaff(ctx, auth, row.employeeId);
    if (teamError) return { success: false, message: teamError };
    const locked = await rejectIfLocked(row);
    if (locked) return { success: false, message: locked };
    await ctx.db.patch(args.hoursId, {
      status: "rejected",
      approvedBy: auth.user._id,
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true, message: "Hours rejected" };
  },
});

const DEFAULT_BREAK_MINUTES = 30;

export type DraftHoursFromShiftResult = {
  status: "created" | "updated" | "skipped" | "no_staff";
  message?: string;
};

/** Called when a Shift is finalized. Payroll still pays only approved Hours. */
export async function draftHoursFromShift(
  ctx: import("./_generated/server").MutationCtx,
  shift: {
    _id: import("./_generated/dataModel").Id<"shifts">;
    propertyId: import("./_generated/dataModel").Id<"properties">;
    employeeId?: import("./_generated/dataModel").Id<"staffs">;
    userId?: import("./_generated/dataModel").Id<"users">;
    startTime?: string;
    endTime?: string;
    shiftDate?: string;
  }
): Promise<DraftHoursFromShiftResult> {
  let staff = shift.employeeId ? await ctx.db.get(shift.employeeId) : null;
  if (!staff && shift.userId) {
    staff = await ctx.db
      .query("staffs")
      .withIndex("by_userId", (q) => q.eq("userId", shift.userId!))
      .first();
  }
  if (!staff) {
    return { status: "no_staff", message: "No staff record is linked to this shift" };
  }

  const workDate = shift.shiftDate
    ? utcDayFromIsoDate(shift.shiftDate)
    : startOfUtcDay(Date.now());

  const existing = await ctx.db
    .query("hours")
    .withIndex("by_employeeId_workDate", (q) =>
      q.eq("employeeId", staff._id).eq("workDate", workDate)
    )
    .first();

  const settings = await ctx.db
    .query("payrollSettings")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", shift.propertyId))
    .first();
  const dailyLimit = settings?.regularHoursLimitDaily ?? 8;
  const breakDuration = DEFAULT_BREAK_MINUTES;

  const clockInTime = clockOnWorkDate(workDate, shift.startTime);
  const parsedOut = clockOnWorkDate(workDate, shift.endTime);
  const { clockOut, total } = hoursFromClockWithOvernight(
    clockInTime,
    parsedOut,
    breakDuration
  );
  const now = Date.now();
  const regularHours = Math.min(total, dailyLimit);
  const overtimeHours = Math.max(0, total - dailyLimit);

  if (!existing) {
    await ctx.db.insert("hours", {
      employeeId: staff._id,
      propertyId: shift.propertyId,
      workDate,
      clockInTime,
      clockOutTime: clockOut,
      regularHours,
      overtimeHours,
      breakDuration,
      source: "shift",
      shiftId: shift._id,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
    return { status: "created" };
  }

  if (existing.status === "draft" && existing.source === "shift" && !existing.lockedAt) {
    await ctx.db.patch(existing._id, {
      clockInTime,
      clockOutTime: clockOut,
      regularHours,
      overtimeHours,
      shiftId: shift._id,
      updatedAt: now,
    });
    return { status: "updated" };
  }

  return {
    status: "skipped",
    message: `Shift finalized. Hours already exist for this staff on that date (${existing.status}${existing.lockedAt ? ", locked" : ""}) and were not overwritten`,
  };
}
