import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { startOfUtcDay, workingDaysInclusive } from "./lib/payrollHelpers";

export const listTimeOff = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "payroll.leave.read", args.propertyId);
    const rows = await ctx.db
      .query("leaveEntries")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const staff = await ctx.db.get(row.employeeId);
        const leaveType = await ctx.db.get(row.leaveTypeId);
        return {
          ...row,
          staffName: staff ? `${staff.firstName} ${staff.lastName}` : "Unknown",
          leaveTypeName: leaveType?.name ?? "Unknown",
          paid: leaveType?.paid ?? true,
        };
      })
    );
    enriched.sort((a, b) => b.startDate - a.startDate);
    return { success: true, data: enriched };
  },
});

export const createTimeOff = mutation({
  args: {
    propertyId: v.id("properties"),
    employeeId: v.id("staffs"),
    leaveTypeId: v.id("leaveTypes"),
    startDate: v.number(),
    endDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "payroll.leave.create", args.propertyId);
    const startDate = startOfUtcDay(args.startDate);
    const endDate = startOfUtcDay(args.endDate);
    if (endDate < startDate) {
      return { success: false, message: "End date must be on or after start date" };
    }
    const now = Date.now();
    const id = await ctx.db.insert("leaveEntries", {
      propertyId: args.propertyId,
      employeeId: args.employeeId,
      leaveTypeId: args.leaveTypeId,
      startDate,
      endDate,
      days: workingDaysInclusive(startDate, endDate),
      status: "pending",
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, message: "Time off recorded", id };
  },
});

export const approveTimeOff = mutation({
  args: { leaveEntryId: v.id("leaveEntries") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.leaveEntryId);
    if (!row) return { success: false, message: "Time off not found" };
    const auth = await requirePermission(ctx, "payroll.leave.approve", row.propertyId);
    await ctx.db.patch(args.leaveEntryId, {
      status: "approved",
      approvedBy: auth.user._id,
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true, message: "Time off approved" };
  },
});

export const rejectTimeOff = mutation({
  args: { leaveEntryId: v.id("leaveEntries") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.leaveEntryId);
    if (!row) return { success: false, message: "Time off not found" };
    const auth = await requirePermission(ctx, "payroll.leave.approve", row.propertyId);
    await ctx.db.patch(args.leaveEntryId, {
      status: "rejected",
      approvedBy: auth.user._id,
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true, message: "Time off rejected" };
  },
});
