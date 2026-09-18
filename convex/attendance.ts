import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticated } from "./lib/rbac";
import { currentUtcHHmm } from "./lib/payrollHelpers";
import { draftHoursFromShift } from "./hours";
import {
  ensureRosterSlot,
  findActiveShiftForStaffDate,
  findAnyShiftForStaffDate,
  getRosterSlotForScheduled,
  getRosterSlotForWorking,
  resolveStaffTemplate,
  staffDisplayName,
  todayIsoDate,
} from "./lib/shiftHelpers";
import { punctualityFieldsForClock, punctualityInsertFields } from "./lib/punctuality";

export const getMyDuty = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireAuthenticated(ctx);
    const staff = await ctx.db
      .query("staffs")
      .withIndex("by_userId", (q) => q.eq("userId", auth.user._id))
      .first();
    if (!staff) {
      return {
        success: false,
        message: "No staff record is linked to your login. Ask an admin to connect your user to Staff.",
        data: null,
      };
    }
    const propertyId = staff.propertyId ?? auth.propertyIds[0];
    if (!propertyId) {
      return { success: false, message: "Staff is not assigned to a property.", data: null };
    }

    const shiftDate = todayIsoDate();
    const template = await resolveStaffTemplate(ctx, staff, propertyId);
    const coveringSlot = await getRosterSlotForWorking(ctx, staff._id, shiftDate);
    const ownSlot = await getRosterSlotForScheduled(ctx, staff._id, shiftDate);
    const slot =
      coveringSlot && coveringSlot.workingEmployeeId === staff._id
        ? coveringSlot
        : ownSlot;
    const isCovering = Boolean(slot && slot.scheduledEmployeeId !== staff._id);
    const isCovered = Boolean(ownSlot && ownSlot.workingEmployeeId !== staff._id);
    const scheduled = slot ? await ctx.db.get(slot.scheduledEmployeeId) : staff;
    const working = slot ? await ctx.db.get(slot.workingEmployeeId) : staff;
    const slotTemplate = slot ? await ctx.db.get(slot.shiftTemplateId) : template;
    const dayShift = await findAnyShiftForStaffDate(ctx, staff._id, shiftDate);
    const activeShift = dayShift && !dayShift.isFinalized ? dayShift : null;

    return {
      success: true,
      data: {
        staffId: staff._id,
        staffName: staffDisplayName(staff),
        propertyId,
        shiftDate,
        department: slotTemplate?.department ?? staff.department,
        templateName: slotTemplate?.name ?? template?.name,
        expectedStart: slotTemplate?.startTime ?? template?.startTime,
        expectedEnd: slotTemplate?.endTime ?? template?.endTime,
        hasTemplate: Boolean(slotTemplate ?? template),
        isCovering,
        isCovered,
        scheduledName: staffDisplayName(scheduled),
        workingName: staffDisplayName(working),
        canStartShift: Boolean((slotTemplate ?? template) && !isCovered && !dayShift),
        canEndShift: Boolean(activeShift),
        activeShift: dayShift
          ? {
              _id: dayShift._id,
              startTime: dayShift.startTime,
              endTime: dayShift.endTime,
              isFinalized: dayShift.isFinalized,
              expectedStart: dayShift.expectedStart ?? slotTemplate?.startTime ?? template?.startTime,
              clockStartLocal: dayShift.clockStartLocal,
              minutesLate: dayShift.minutesLate,
              punctualityStatus: dayShift.punctualityStatus,
            }
          : null,
        blockedReason: !template && !slotTemplate
          ? "No department shift is assigned. An admin must define a shift for your department."
          : isCovered
            ? `You are covered today by ${staffDisplayName(working)}. You do not need to start a shift.`
            : dayShift?.isFinalized
              ? "You have already ended your shift for today."
              : undefined,
      },
    };
  },
});

export const startShift = mutation({
  args: {},
  handler: async (ctx) => {
    const auth = await requireAuthenticated(ctx);
    const staff = await ctx.db
      .query("staffs")
      .withIndex("by_userId", (q) => q.eq("userId", auth.user._id))
      .first();
    if (!staff) {
      return { success: false, message: "No staff record is linked to your login." };
    }
    const propertyId = staff.propertyId ?? auth.propertyIds[0];
    if (!propertyId) {
      return { success: false, message: "Staff is not assigned to a property." };
    }
    if (staff.employmentStatus === "terminated") {
      return { success: false, message: "Terminated staff cannot start a shift." };
    }

    const shiftDate = todayIsoDate();
    const coveringSlot = await getRosterSlotForWorking(ctx, staff._id, shiftDate);
    const ownCovered = await getRosterSlotForScheduled(ctx, staff._id, shiftDate);
    if (ownCovered && ownCovered.workingEmployeeId !== staff._id) {
      const cover = await ctx.db.get(ownCovered.workingEmployeeId);
      return {
        success: false,
        message: `You are covered today by ${staffDisplayName(cover)}. You cannot start this shift.`,
      };
    }

    const scheduledId =
      coveringSlot && coveringSlot.workingEmployeeId === staff._id
        ? coveringSlot.scheduledEmployeeId
        : staff._id;

    const ensured = await ensureRosterSlot(ctx, {
      propertyId,
      shiftDate,
      scheduledEmployeeId: scheduledId,
    });
    if ("error" in ensured) {
      return { success: false, message: ensured.error };
    }
    if (ensured.slot.workingEmployeeId !== staff._id) {
      return { success: false, message: "This roster day is assigned to someone else." };
    }

    const existing = await findAnyShiftForStaffDate(ctx, staff._id, shiftDate);
    if (existing) {
      return {
        success: false,
        message: existing.isFinalized
          ? "You have already ended your shift for today."
          : "Your shift is already started.",
      };
    }

    const template = ensured.template;
    if (template.department === "fnb" && !template.barId) {
      return { success: false, message: "This F&B shift has no default bar. Ask an admin to set one." };
    }

    const punctuality = await punctualityFieldsForClock(ctx, {
      propertyId,
      expectedStart: template.startTime,
      expectedEnd: template.endTime,
    });
    const shiftId = await ctx.db.insert("shifts", {
      propertyId,
      employeeId: staff._id,
      userId: staff.userId ?? auth.user._id,
      barId: template.barId,
      department: template.department,
      shiftDate,
      startTime: currentUtcHHmm(),
      isFinalized: false,
      shiftTemplateId: template._id,
      rosterSlotId: ensured.slot._id,
      ...punctualityInsertFields(punctuality),
    });
    const lateNote =
      punctuality.punctualityStatus === "late"
        ? ` You started ${punctuality.minutesLate} minute${punctuality.minutesLate === 1 ? "" : "s"} late.`
        : punctuality.punctualityStatus === "on_time"
          ? " You are on time."
          : "";
    return { success: true, id: shiftId, message: `Shift started.${lateNote} Click End shift when you finish work.` };
  },
});

export const endShift = mutation({
  args: {},
  handler: async (ctx) => {
    const auth = await requireAuthenticated(ctx);
    const staff = await ctx.db
      .query("staffs")
      .withIndex("by_userId", (q) => q.eq("userId", auth.user._id))
      .first();
    if (!staff) {
      return { success: false, message: "No staff record is linked to your login." };
    }
    const shiftDate = todayIsoDate();
    const shift = await findActiveShiftForStaffDate(ctx, staff._id, shiftDate);
    if (!shift) {
      return { success: false, message: "You have not started a shift." };
    }

    const endTime = currentUtcHHmm();
    await ctx.db.patch(shift._id, {
      isFinalized: true,
      endTime,
    });

    if (shift.barId) {
      const logs = await ctx.db
        .query("userStockLogs")
        .withIndex("by_shiftId", (q) => q.eq("shiftId", shift._id))
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

    const hoursResult = await draftHoursFromShift(ctx, {
      _id: shift._id,
      propertyId: shift.propertyId,
      employeeId: staff._id,
      userId: shift.userId,
      startTime: shift.startTime,
      endTime,
      shiftDate: shift.shiftDate,
    });
    if (hoursResult.status === "skipped") {
      return { success: true, message: hoursResult.message };
    }
    if (hoursResult.status === "no_staff") {
      return { success: true, message: "Shift ended, but Hours were not created." };
    }
    return { success: true, message: "Shift ended. Draft Hours are ready for supervisor approval." };
  },
});
