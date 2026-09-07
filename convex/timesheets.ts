import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { hoursFromClock, roundMoney, startOfUtcDay } from "./lib/payrollHelpers";

async function rejectIfLocked(sheet: { lockedAt?: number }) {
  if (sheet.lockedAt) {
    return "This Hours row is locked for payroll and cannot be edited";
  }
  return null;
}

export const listHours = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "payroll.timesheet.read", args.propertyId);
    const rows = await ctx.db
      .query("timesheets")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const staff = await ctx.db.get(row.employeeId);
        return {
          ...row,
          staffName: staff ? `${staff.firstName} ${staff.lastName}` : "Unknown",
        };
      })
    );
    enriched.sort((a, b) => b.workDate - a.workDate);
    return { success: true, data: enriched };
  },
});

export const getHours = query({
  args: { timesheetId: v.id("timesheets") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.timesheetId);
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
      .query("timesheets")
      .withIndex("by_employeeId_workDate", (q) =>
        q.eq("employeeId", args.employeeId).eq("workDate", workDate)
      )
      .first();
    if (existing) {
      return { success: false, message: "Hours already exist for this staff member on that date" };
    }

    const settings = await ctx.db
      .query("propertyPayrollSettings")
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

    const id = await ctx.db.insert("timesheets", {
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
    timesheetId: v.id("timesheets"),
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
    const row = await ctx.db.get(args.timesheetId);
    if (!row) return { success: false, message: "Hours not found" };
    await requirePermission(ctx, "payroll.timesheet.update", row.propertyId);
    const locked = await rejectIfLocked(row);
    if (locked) return { success: false, message: locked };
    await ctx.db.patch(args.timesheetId, {
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
  args: { timesheetId: v.id("timesheets") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.timesheetId);
    if (!row) return { success: false, message: "Hours not found" };
    const auth = await requirePermission(ctx, "payroll.timesheet.approve", row.propertyId);
    const locked = await rejectIfLocked(row);
    if (locked) return { success: false, message: locked };
    await ctx.db.patch(args.timesheetId, {
      status: "approved",
      approvedBy: auth.user._id,
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true, message: "Hours approved" };
  },
});

export const rejectHours = mutation({
  args: { timesheetId: v.id("timesheets") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.timesheetId);
    if (!row) return { success: false, message: "Hours not found" };
    const auth = await requirePermission(ctx, "payroll.timesheet.approve", row.propertyId);
    const locked = await rejectIfLocked(row);
    if (locked) return { success: false, message: locked };
    await ctx.db.patch(args.timesheetId, {
      status: "rejected",
      approvedBy: auth.user._id,
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true, message: "Hours rejected" };
  },
});

/** Called when a bar Shift is finalized. */
export async function draftHoursFromShift(
  ctx: import("./_generated/server").MutationCtx,
  shift: {
    _id: import("./_generated/dataModel").Id<"shifts">;
    propertyId: import("./_generated/dataModel").Id<"properties">;
    userId: import("./_generated/dataModel").Id<"users">;
    startTime?: string;
    endTime?: string;
    shiftDate?: string;
  }
) {
  const staff = await ctx.db
    .query("staffs")
    .withIndex("by_userId", (q) => q.eq("userId", shift.userId))
    .first();
  if (!staff) return;

  const workDate = shift.shiftDate
    ? startOfUtcDay(new Date(shift.shiftDate).getTime())
    : startOfUtcDay(Date.now());

  const existing = await ctx.db
    .query("timesheets")
    .withIndex("by_employeeId_workDate", (q) =>
      q.eq("employeeId", staff._id).eq("workDate", workDate)
    )
    .first();

  const settings = await ctx.db
    .query("propertyPayrollSettings")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", shift.propertyId))
    .first();
  const dailyLimit = settings?.regularHoursLimitDaily ?? 8;

  const parseClock = (time?: string) => {
    if (!time) return undefined;
    const [h, m] = time.split(":").map(Number);
    if (Number.isNaN(h)) return undefined;
    return workDate + ((h || 0) * 60 + (m || 0)) * 60 * 1000;
  };
  const clockInTime = parseClock(shift.startTime);
  const clockOutTime = parseClock(shift.endTime);
  const total = hoursFromClock(clockInTime, clockOutTime, 30);
  const now = Date.now();

  if (!existing) {
    await ctx.db.insert("timesheets", {
      employeeId: staff._id,
      propertyId: shift.propertyId,
      workDate,
      clockInTime,
      clockOutTime,
      regularHours: Math.min(total, dailyLimit),
      overtimeHours: Math.max(0, total - dailyLimit),
      breakDuration: 30,
      source: "shift",
      shiftId: shift._id,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  if (existing.status === "draft" && existing.source === "shift" && !existing.lockedAt) {
    await ctx.db.patch(existing._id, {
      clockInTime,
      clockOutTime,
      regularHours: Math.min(total, dailyLimit),
      overtimeHours: Math.max(0, total - dailyLimit),
      updatedAt: now,
    });
  }
}
