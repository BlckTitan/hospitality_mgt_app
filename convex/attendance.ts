import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import {
  AuthContext,
  requireAuthenticated,
  tryRequirePermission,
} from "./lib/rbac";
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
import { canSeeAllTeamRecords, currentUsersStaff, isActiveStatus } from "./lib/staffAccess";
import { resolveStaffClockMethod, type ShiftClockMethod } from "./lib/clockMethod";
import { refreshSalesSummariesForLogs } from "./lib/barStock";

type DbCtx = MutationCtx | QueryCtx;

type ActiveShiftView = {
  _id: Id<"shifts">;
  startTime: string;
  endTime?: string;
  isFinalized: boolean;
  expectedStart?: string;
  clockStartLocal?: string;
  minutesLate?: number;
  punctualityStatus?: "on_time" | "late" | "unscheduled";
  clockMethod?: ShiftClockMethod;
};

type DutyView = {
  staffId: Id<"staffs">;
  staffName: string;
  propertyId: Id<"properties">;
  shiftDate: string;
  department?: string;
  templateName?: string;
  expectedStart?: string;
  expectedEnd?: string;
  hasTemplate: boolean;
  clockMethod: ReturnType<typeof resolveStaffClockMethod>;
  isCovering: boolean;
  isCovered: boolean;
  isSelf: boolean;
  scheduledName: string;
  workingName: string;
  canStartShift: boolean;
  canEndShift: boolean;
  canStartFor: boolean;
  canEndFor: boolean;
  activeShift: ActiveShiftView | null;
  blockedReason?: string;
};

async function buildDuty(
  ctx: DbCtx,
  staff: Doc<"staffs">,
  propertyId: Id<"properties">,
  shiftDate: string,
  actorStaffId?: Id<"staffs">,
): Promise<DutyView> {
  const clockMethod = resolveStaffClockMethod(staff);
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
  const hasTemplate = Boolean(slotTemplate ?? template);
  const dayShift = await findAnyShiftForStaffDate(ctx, staff._id, shiftDate);
  const activeShift = dayShift && !dayShift.isFinalized ? dayShift : null;
  const isSelf = actorStaffId === staff._id;
  const expectedStart = slotTemplate?.startTime ?? template?.startTime;
  const expectedEnd = slotTemplate?.endTime ?? template?.endTime;

  let blockedReason: string | undefined;
  if (!hasTemplate) {
    blockedReason = isSelf
      ? "No department shift is assigned. An admin must define a shift for your department."
      : "No department shift is assigned.";
  } else if (isCovered) {
    blockedReason = isSelf
      ? `You are covered today by ${staffDisplayName(working)}. You do not need to start a shift.`
      : `Covered today by ${staffDisplayName(working)}.`;
  } else if (dayShift?.isFinalized) {
    blockedReason = isSelf
      ? "You have already ended your shift for today."
      : "Shift already ended today.";
  } else if (isSelf && clockMethod !== "self" && !dayShift) {
    blockedReason =
      clockMethod === "kiosk"
        ? "You clock in at the property. Ask a supervisor to start your shift."
        : "A supervisor starts your shift on site. You cannot start from this page.";
  }

  return {
    staffId: staff._id,
    staffName: staffDisplayName(staff),
    propertyId,
    shiftDate,
    department: slotTemplate?.department ?? staff.department,
    templateName: slotTemplate?.name ?? template?.name,
    expectedStart,
    expectedEnd,
    hasTemplate,
    clockMethod,
    isCovering,
    isCovered,
    isSelf,
    scheduledName: staffDisplayName(scheduled),
    workingName: staffDisplayName(working),
    canStartShift: Boolean(hasTemplate && !isCovered && !dayShift && clockMethod === "self"),
    canEndShift: Boolean(activeShift && clockMethod === "self"),
    canStartFor: Boolean(!isSelf && hasTemplate && !isCovered && !dayShift),
    canEndFor: Boolean(!isSelf && activeShift),
    activeShift: dayShift
      ? {
          _id: dayShift._id,
          startTime: dayShift.startTime,
          endTime: dayShift.endTime,
          isFinalized: dayShift.isFinalized,
          expectedStart: dayShift.expectedStart ?? expectedStart,
          clockStartLocal: dayShift.clockStartLocal,
          minutesLate: dayShift.minutesLate,
          punctualityStatus: dayShift.punctualityStatus,
          clockMethod: dayShift.clockMethod,
        }
      : null,
    blockedReason,
  };
}

async function resolveFloorAccess(ctx: DbCtx, propertyId: Id<"properties">) {
  const canUpdate = await tryRequirePermission(ctx, "staff.update", propertyId);
  const canApprove = await tryRequirePermission(ctx, "payroll.timesheet.approve", propertyId);
  const canRead = await tryRequirePermission(ctx, "staff.read", propertyId);
  const auth = canUpdate ?? canApprove ?? canRead;
  if (!auth) return null;
  const canProxy = Boolean(canUpdate || canApprove);
  const seeAll = Boolean(canUpdate || canSeeAllTeamRecords(auth) || (canRead && !canApprove));
  return { auth, canProxy, canView: true, seeAll };
}

async function assertCanProxyStaff(
  ctx: DbCtx,
  access: { auth: AuthContext; seeAll: boolean },
  staff: Doc<"staffs">,
): Promise<string | null> {
  const me = await currentUsersStaff(ctx, access.auth.user._id);
  if (me && me._id === staff._id) {
    return "Start your own shift under My duty.";
  }
  if (access.seeAll) return null;
  if (!me) return "You have no staff record to identify your team.";
  if (staff.managerId !== me._id) {
    return "You can only clock attendance for your direct reports.";
  }
  return null;
}

function startMessage(
  punctuality: { punctualityStatus: string; minutesLate: number },
  forName?: string,
) {
  const who = forName ? ` for ${forName}` : "";
  const lateNote =
    punctuality.punctualityStatus === "late"
      ? ` Started ${punctuality.minutesLate} minute${punctuality.minutesLate === 1 ? "" : "s"} late.`
      : punctuality.punctualityStatus === "on_time"
        ? " On time."
        : "";
  return `Shift started${who}.${lateNote}`;
}

async function startStaffShift(
  ctx: MutationCtx,
  args: {
    staff: Doc<"staffs">;
    propertyId: Id<"properties">;
    recordedByUserId: Id<"users">;
    kind: "self" | "proxy";
  },
) {
  if (args.staff.employmentStatus === "terminated") {
    return { success: false as const, message: "Terminated staff cannot start a shift." };
  }
  if (args.kind === "self" && resolveStaffClockMethod(args.staff) !== "self") {
    return {
      success: false as const,
      message: "A supervisor must start this shift on site.",
    };
  }

  const shiftDate = todayIsoDate();
  const coveringSlot = await getRosterSlotForWorking(ctx, args.staff._id, shiftDate);
  const ownCovered = await getRosterSlotForScheduled(ctx, args.staff._id, shiftDate);
  if (ownCovered && ownCovered.workingEmployeeId !== args.staff._id) {
    const cover = await ctx.db.get(ownCovered.workingEmployeeId);
    return {
      success: false as const,
      message: `${staffDisplayName(args.staff)} is covered today by ${staffDisplayName(cover)}.`,
    };
  }

  const scheduledId =
    coveringSlot && coveringSlot.workingEmployeeId === args.staff._id
      ? coveringSlot.scheduledEmployeeId
      : args.staff._id;

  const ensured = await ensureRosterSlot(ctx, {
    propertyId: args.propertyId,
    shiftDate,
    scheduledEmployeeId: scheduledId,
  });
  if ("error" in ensured) {
    return { success: false as const, message: ensured.error };
  }
  if (ensured.slot.workingEmployeeId !== args.staff._id) {
    return { success: false as const, message: "This roster day is assigned to someone else." };
  }

  const existing = await findAnyShiftForStaffDate(ctx, args.staff._id, shiftDate);
  if (existing) {
    return {
      success: false as const,
      message: existing.isFinalized
        ? "This shift has already ended today."
        : "This shift is already started.",
    };
  }

  const template = ensured.template;
  if (template.department === "fnb" && !template.barId) {
    return { success: false as const, message: "This F&B shift has no default bar. Ask an admin to set one." };
  }

  const punctuality = await punctualityFieldsForClock(ctx, {
    propertyId: args.propertyId,
    expectedStart: template.startTime,
    expectedEnd: template.endTime,
  });
  const shiftId = await ctx.db.insert("shifts", {
    propertyId: args.propertyId,
    employeeId: args.staff._id,
    userId: args.staff.userId,
    barId: template.barId,
    department: template.department,
    shiftDate,
    startTime: currentUtcHHmm(),
    isFinalized: false,
    shiftTemplateId: template._id,
    rosterSlotId: ensured.slot._id,
    clockMethod: args.kind,
    recordedByUserId: args.recordedByUserId,
    ...punctualityInsertFields(punctuality),
  });
  const suffix = args.kind === "self" ? " Click End shift when you finish work." : "";
  return {
    success: true as const,
    id: shiftId,
    message: `${startMessage(punctuality, args.kind === "proxy" ? staffDisplayName(args.staff) : undefined)}${suffix}`,
  };
}

async function endStaffShift(ctx: MutationCtx, staff: Doc<"staffs">) {
  const shiftDate = todayIsoDate();
  const shift = await findActiveShiftForStaffDate(ctx, staff._id, shiftDate);
  if (!shift) {
    return { success: false as const, message: "This person has not started a shift." };
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
    await refreshSalesSummariesForLogs(ctx, logs);
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
    return { success: true as const, message: hoursResult.message };
  }
  if (hoursResult.status === "no_staff") {
    return { success: true as const, message: "Shift ended, but Hours were not created." };
  }
  return { success: true as const, message: "Shift ended. Draft Hours are ready for supervisor approval." };
}

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
    return {
      success: true,
      data: await buildDuty(ctx, staff, propertyId, todayIsoDate(), staff._id),
    };
  },
});

export const getFloorDuty = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireAuthenticated(ctx);
    const shiftDate = todayIsoDate();
    const propertyId = auth.propertyIds[0];
    if (!propertyId) {
      return { success: true, canView: false, canProxy: false, shiftDate, data: [] };
    }
    const access = await resolveFloorAccess(ctx, propertyId);
    if (!access) {
      return { success: true, canView: false, canProxy: false, shiftDate, data: [] };
    }

    const me = await currentUsersStaff(ctx, access.auth.user._id);
    const slots = await ctx.db
      .query("rosterSlots")
      .withIndex("by_propertyId_date", (q) =>
        q.eq("propertyId", propertyId).eq("shiftDate", shiftDate),
      )
      .collect();

    const assigned = (
      await ctx.db
        .query("staffs")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
        .collect()
    ).filter((row) => isActiveStatus(row.employmentStatus) && row.shiftTemplateId);

    const staffIds = new Set<Id<"staffs">>();
    for (const row of assigned) staffIds.add(row._id);
    for (const slot of slots) {
      staffIds.add(slot.scheduledEmployeeId);
      staffIds.add(slot.workingEmployeeId);
    }

    const candidates = await Promise.all(
      [...staffIds].map(async (staffId) => {
        const staff = await ctx.db.get(staffId);
        if (!staff || staff.employmentStatus === "terminated") return null;
        if (!access.seeAll) {
          if (!me) return null;
          if (staff._id !== me._id && staff.managerId !== me._id) return null;
        }
        return await buildDuty(ctx, staff, propertyId, shiftDate, me?._id);
      }),
    );
    const rows = candidates.filter((row): row is DutyView => row !== null);
    rows.sort((a, b) => a.staffName.localeCompare(b.staffName));
    return {
      success: true,
      canView: true,
      canProxy: access.canProxy,
      shiftDate,
      data: rows,
    };
  },
});

export const getStaffTodayDuty = query({
  args: { staffId: v.id("staffs") },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticated(ctx);
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      return { success: false, message: "Staff not found.", data: null, canProxy: false };
    }
    const propertyId = staff.propertyId ?? auth.propertyIds[0];
    if (!propertyId) {
      return { success: false, message: "Staff is not assigned to a property.", data: null, canProxy: false };
    }
    const access = await resolveFloorAccess(ctx, propertyId);
    if (!access) {
      return { success: false, message: "You cannot view this attendance.", data: null, canProxy: false };
    }
    const me = await currentUsersStaff(ctx, access.auth.user._id);
    if (!access.seeAll && me && staff._id !== me._id && staff.managerId !== me._id) {
      return { success: false, message: "You can only view attendance for your team.", data: null, canProxy: false };
    }
    const data = await buildDuty(ctx, staff, propertyId, todayIsoDate(), me?._id);
    const proxyError = access.canProxy ? await assertCanProxyStaff(ctx, access, staff) : "You cannot clock attendance for other staff.";
    return {
      success: true,
      canProxy: access.canProxy && !proxyError,
      data,
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
    return await startStaffShift(ctx, {
      staff,
      propertyId,
      recordedByUserId: auth.user._id,
      kind: "self",
    });
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
    if (resolveStaffClockMethod(staff) !== "self") {
      return { success: false, message: "A supervisor must end this shift on site." };
    }
    return await endStaffShift(ctx, staff);
  },
});

export const startShiftFor = mutation({
  args: { staffId: v.id("staffs") },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId);
    if (!staff) return { success: false, message: "Staff not found." };
    const propertyId = staff.propertyId;
    if (!propertyId) return { success: false, message: "Staff is not assigned to a property." };
    const access = await resolveFloorAccess(ctx, propertyId);
    if (!access?.canProxy) {
      return { success: false, message: "You cannot clock attendance for other staff." };
    }
    const proxyError = await assertCanProxyStaff(ctx, access, staff);
    if (proxyError) return { success: false, message: proxyError };
    return await startStaffShift(ctx, {
      staff,
      propertyId,
      recordedByUserId: access.auth.user._id,
      kind: "proxy",
    });
  },
});

export const endShiftFor = mutation({
  args: { staffId: v.id("staffs") },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId);
    if (!staff) return { success: false, message: "Staff not found." };
    const propertyId = staff.propertyId;
    if (!propertyId) return { success: false, message: "Staff is not assigned to a property." };
    const access = await resolveFloorAccess(ctx, propertyId);
    if (!access?.canProxy) {
      return { success: false, message: "You cannot clock attendance for other staff." };
    }
    const proxyError = await assertCanProxyStaff(ctx, access, staff);
    if (proxyError) return { success: false, message: proxyError };
    return await endStaffShift(ctx, staff);
  },
});
