import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { utcDayFromIsoDate } from "./lib/payrollHelpers";
import {
  ensureRosterSlot,
  findAnyShiftForStaffDate,
  findHoursForStaffDate,
  getRosterSlotForScheduled,
  staffDisplayName,
} from "./lib/shiftHelpers";

export const listRosterForDate = query({
  args: {
    propertyId: v.id("properties"),
    shiftDate: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "staff.read", args.propertyId);
    const slots = await ctx.db
      .query("rosterSlots")
      .withIndex("by_propertyId_date", (q) =>
        q.eq("propertyId", args.propertyId).eq("shiftDate", args.shiftDate)
      )
      .collect();

    const assignedStaff = (
      await ctx.db
        .query("staffs")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
        .collect()
    ).filter((s) => s.employmentStatus !== "terminated" && s.shiftTemplateId);

    const rows = [];
    const seen = new Set<string>();

    for (const slot of slots) {
      seen.add(slot.scheduledEmployeeId);
      const [scheduled, working, template] = await Promise.all([
        ctx.db.get(slot.scheduledEmployeeId),
        ctx.db.get(slot.workingEmployeeId),
        ctx.db.get(slot.shiftTemplateId),
      ]);
      const [workingAttendance, scheduledAttendance, scheduledHours] = await Promise.all([
        findAnyShiftForStaffDate(ctx, slot.workingEmployeeId, args.shiftDate),
        findAnyShiftForStaffDate(ctx, slot.scheduledEmployeeId, args.shiftDate),
        findHoursForStaffDate(ctx, slot.scheduledEmployeeId, utcDayFromIsoDate(args.shiftDate)),
      ]);
      rows.push({
        slotId: slot._id,
        shiftDate: slot.shiftDate,
        scheduledEmployeeId: slot.scheduledEmployeeId,
        scheduledName: staffDisplayName(scheduled),
        workingEmployeeId: slot.workingEmployeeId,
        workingName: staffDisplayName(working),
        isCover: slot.scheduledEmployeeId !== slot.workingEmployeeId,
        templateName: template?.name,
        department: template?.department,
        startTime: template?.startTime,
        endTime: template?.endTime,
        hasAttendance: Boolean(workingAttendance),
        attendanceFinalized: workingAttendance?.isFinalized ?? false,
        hasHours: Boolean(scheduledHours),
        coverBlocked: Boolean(scheduledAttendance || scheduledHours),
        notes: slot.notes,
      });
    }

    for (const staff of assignedStaff) {
      if (seen.has(staff._id) || !staff.shiftTemplateId) continue;
      const template = await ctx.db.get(staff.shiftTemplateId);
      const [attendance, hours] = await Promise.all([
        findAnyShiftForStaffDate(ctx, staff._id, args.shiftDate),
        findHoursForStaffDate(ctx, staff._id, utcDayFromIsoDate(args.shiftDate)),
      ]);
      rows.push({
        slotId: null,
        shiftDate: args.shiftDate,
        scheduledEmployeeId: staff._id,
        scheduledName: staffDisplayName(staff),
        workingEmployeeId: staff._id,
        workingName: staffDisplayName(staff),
        isCover: false,
        templateName: template?.name,
        department: template?.department ?? staff.department,
        startTime: template?.startTime,
        endTime: template?.endTime,
        hasAttendance: Boolean(attendance),
        attendanceFinalized: attendance?.isFinalized ?? false,
        hasHours: Boolean(hours),
        coverBlocked: Boolean(attendance || hours),
        notes: undefined,
      });
    }

    rows.sort((a, b) => a.scheduledName.localeCompare(b.scheduledName));
    return { success: true, data: rows };
  },
});

export const coverRosterDay = mutation({
  args: {
    propertyId: v.id("properties"),
    shiftDate: v.string(),
    scheduledEmployeeId: v.id("staffs"),
    coveringEmployeeId: v.id("staffs"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, "staff.update", args.propertyId);
    if (args.scheduledEmployeeId === args.coveringEmployeeId) {
      return { success: false, message: "Pick a different staff member to cover" };
    }

    const covering = await ctx.db.get(args.coveringEmployeeId);
    if (!covering || covering.employmentStatus === "terminated") {
      return { success: false, message: "Covering staff member is not available" };
    }

    const scheduledAttendance = await findAnyShiftForStaffDate(
      ctx,
      args.scheduledEmployeeId,
      args.shiftDate
    );
    if (scheduledAttendance) {
      return {
        success: false,
        message: "This person already started a shift for that date. Hours were not changed.",
      };
    }

    const scheduledHours = await findHoursForStaffDate(
      ctx,
      args.scheduledEmployeeId,
      utcDayFromIsoDate(args.shiftDate)
    );
    if (scheduledHours) {
      return {
        success: false,
        message: "Hours already exist for the scheduled staff on that date and were left unchanged.",
      };
    }

    const coveringAttendance = await findAnyShiftForStaffDate(
      ctx,
      args.coveringEmployeeId,
      args.shiftDate
    );
    if (coveringAttendance) {
      return {
        success: false,
        message: "The covering staff member already started a shift that day.",
      };
    }

    const ensured = await ensureRosterSlot(ctx, {
      propertyId: args.propertyId,
      shiftDate: args.shiftDate,
      scheduledEmployeeId: args.scheduledEmployeeId,
    });
    if ("error" in ensured) {
      return { success: false, message: ensured.error };
    }

    await ctx.db.patch(ensured.slot._id, {
      workingEmployeeId: args.coveringEmployeeId,
      coveredAt: Date.now(),
      coveredBy: auth.user._id,
      notes: args.notes,
      updatedAt: Date.now(),
    });
    return { success: true, message: "Cover assigned. The original staff member's Hours were not changed." };
  },
});

export const clearRosterCover = mutation({
  args: { slotId: v.id("rosterSlots") },
  handler: async (ctx, args) => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) return { success: false, message: "Roster day not found" };
    await requirePermission(ctx, "staff.update", slot.propertyId);

    const workingAttendance = await findAnyShiftForStaffDate(
      ctx,
      slot.workingEmployeeId,
      slot.shiftDate
    );
    if (workingAttendance) {
      return {
        success: false,
        message: "Attendance already exists for the covering person. Hours were left unchanged.",
      };
    }

    await ctx.db.patch(args.slotId, {
      workingEmployeeId: slot.scheduledEmployeeId,
      coveredAt: undefined,
      coveredBy: undefined,
      notes: undefined,
      updatedAt: Date.now(),
    });
    return { success: true, message: "Cover cleared. The scheduled staff member is expected again." };
  },
});

export const getRosterSlot = query({
  args: {
    scheduledEmployeeId: v.id("staffs"),
    shiftDate: v.string(),
  },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.scheduledEmployeeId);
    if (!staff) return { success: false, data: null, message: "Staff not found" };
    await requirePermission(ctx, "staff.read", staff.propertyId);
    const slot = await getRosterSlotForScheduled(ctx, args.scheduledEmployeeId, args.shiftDate);
    return { success: true, data: slot };
  },
});
