import { MutationCtx, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { currentUtcHHmm } from "./payrollHelpers";
import { punctualityFieldsForClock, punctualityInsertFields } from "./punctuality";

type DbCtx = MutationCtx | QueryCtx;

export const SHIFT_DEPARTMENTS = [
  "front-office",
  "housekeeping",
  "fnb",
  "maintenance",
  "finance",
  "admin",
  "other",
] as const;

export type ShiftDepartment = (typeof SHIFT_DEPARTMENTS)[number];

export const ROLE_TO_DEPARTMENT: Record<string, ShiftDepartment> = {
  Housekeeper: "housekeeping",
  "Laundry Attendant": "housekeeping",
  Receptionist: "front-office",
  Griller: "fnb",
  Security: "other",
  Manager: "admin",
  "Assistant Manager": "admin",
  Supervisor: "admin",
};

export function normalizeDepartment(value?: string | null): ShiftDepartment {
  if (value && (SHIFT_DEPARTMENTS as readonly string[]).includes(value)) {
    return value as ShiftDepartment;
  }
  return "other";
}

export function departmentFromRole(role?: string | null): ShiftDepartment {
  if (!role) return "other";
  return ROLE_TO_DEPARTMENT[role] ?? "other";
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function staffDisplayName(staff: { firstName: string; lastName: string } | null) {
  if (!staff) return "Unknown";
  return `${staff.firstName} ${staff.lastName}`;
}

export async function staffForUser(ctx: DbCtx, userId: Id<"users">) {
  return await ctx.db
    .query("staffs")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
}

export async function resolveStaffForShift(
  ctx: DbCtx,
  args: { employeeId?: Id<"staffs">; userId?: Id<"users"> }
): Promise<Doc<"staffs"> | null> {
  if (args.employeeId) {
    const staff = await ctx.db.get(args.employeeId);
    return staff ?? null;
  }
  if (args.userId) {
    return await ctx.db
      .query("staffs")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  }
  return null;
}

export async function findActiveShiftForStaffDate(
  ctx: DbCtx,
  employeeId: Id<"staffs">,
  shiftDate: string
) {
  const rows = await ctx.db
    .query("shifts")
    .withIndex("by_employeeId_date", (q) =>
      q.eq("employeeId", employeeId).eq("shiftDate", shiftDate)
    )
    .collect();
  return rows.find((row) => !row.isFinalized) ?? null;
}

export async function findAnyShiftForStaffDate(
  ctx: DbCtx,
  employeeId: Id<"staffs">,
  shiftDate: string
) {
  return await ctx.db
    .query("shifts")
    .withIndex("by_employeeId_date", (q) =>
      q.eq("employeeId", employeeId).eq("shiftDate", shiftDate)
    )
    .first();
}

export async function findHoursForStaffDate(
  ctx: DbCtx,
  employeeId: Id<"staffs">,
  workDateMs: number
) {
  return await ctx.db
    .query("hours")
    .withIndex("by_employeeId_workDate", (q) =>
      q.eq("employeeId", employeeId).eq("workDate", workDateMs)
    )
    .first();
}

export async function findActiveShiftForUserDate(
  ctx: DbCtx,
  userId: Id<"users">,
  shiftDate: string
) {
  const rows = await ctx.db
    .query("shifts")
    .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("shiftDate", shiftDate))
    .collect();
  return rows.find((row) => !row.isFinalized) ?? null;
}

export async function getDefaultShiftTemplate(
  ctx: DbCtx,
  propertyId: Id<"properties">,
  department: ShiftDepartment
) {
  const rows = await ctx.db
    .query("shiftTemplates")
    .withIndex("by_propertyId_department", (q) =>
      q.eq("propertyId", propertyId).eq("department", department)
    )
    .collect();
  return rows.find((row) => row.isActive && row.isDefault) ?? rows.find((row) => row.isActive) ?? null;
}

export async function resolveStaffTemplate(
  ctx: DbCtx,
  staff: Doc<"staffs">,
  propertyId: Id<"properties">
) {
  if (staff.shiftTemplateId) {
    const assigned = await ctx.db.get(staff.shiftTemplateId);
    if (assigned && assigned.isActive) return assigned;
  }
  return await getDefaultShiftTemplate(ctx, propertyId, normalizeDepartment(staff.department));
}

export async function assignDefaultShiftTemplate(
  ctx: MutationCtx,
  staffId: Id<"staffs">,
  propertyId: Id<"properties">,
  department: ShiftDepartment
) {
  const template = await getDefaultShiftTemplate(ctx, propertyId, department);
  await ctx.db.patch(staffId, { shiftTemplateId: template?._id, department });
  return template;
}

export async function getRosterSlotForScheduled(
  ctx: DbCtx,
  scheduledEmployeeId: Id<"staffs">,
  shiftDate: string
) {
  return await ctx.db
    .query("rosterSlots")
    .withIndex("by_scheduled_date", (q) =>
      q.eq("scheduledEmployeeId", scheduledEmployeeId).eq("shiftDate", shiftDate)
    )
    .first();
}

export async function getRosterSlotForWorking(
  ctx: DbCtx,
  workingEmployeeId: Id<"staffs">,
  shiftDate: string
) {
  return await ctx.db
    .query("rosterSlots")
    .withIndex("by_working_date", (q) =>
      q.eq("workingEmployeeId", workingEmployeeId).eq("shiftDate", shiftDate)
    )
    .first();
}

export async function ensureRosterSlot(
  ctx: MutationCtx,
  args: {
    propertyId: Id<"properties">;
    shiftDate: string;
    scheduledEmployeeId: Id<"staffs">;
  }
): Promise<{ slot: Doc<"rosterSlots">; template: Doc<"shiftTemplates"> } | { error: string }> {
  const existing = await getRosterSlotForScheduled(ctx, args.scheduledEmployeeId, args.shiftDate);
  if (existing) {
    const template = await ctx.db.get(existing.shiftTemplateId);
    if (!template) return { error: "Shift template is missing for this roster day" };
    return { slot: existing, template };
  }

  const staff = await ctx.db.get(args.scheduledEmployeeId);
  if (!staff) return { error: "Staff member not found" };
  const template = await resolveStaffTemplate(ctx, staff, args.propertyId);
  if (!template) {
    return { error: "No shift is defined for this staff member's department. An admin must create a department shift first." };
  }

  const now = Date.now();
  const slotId = await ctx.db.insert("rosterSlots", {
    propertyId: args.propertyId,
    shiftDate: args.shiftDate,
    shiftTemplateId: template._id,
    scheduledEmployeeId: args.scheduledEmployeeId,
    workingEmployeeId: args.scheduledEmployeeId,
    createdAt: now,
    updatedAt: now,
  });
  const slot = await ctx.db.get(slotId);
  if (!slot) return { error: "Failed to create roster day" };
  return { slot, template };
}

/** Reuse today's open shift, or open an F&B shift, when stock is issued. */
export async function findOrCreateFnBShift(
  ctx: MutationCtx,
  args: {
    propertyId: Id<"properties">;
    userId: Id<"users">;
    barId: Id<"bars">;
    shiftDate: string;
  }
): Promise<Id<"shifts">> {
  const staff = await resolveStaffForShift(ctx, { userId: args.userId });

  if (staff) {
    const open = await findActiveShiftForStaffDate(ctx, staff._id, args.shiftDate);
    if (open) return open._id;
  }

  const openByUser = await findActiveShiftForUserDate(ctx, args.userId, args.shiftDate);
  if (openByUser) return openByUser._id;

  const template = staff ? await resolveStaffTemplate(ctx, staff, args.propertyId) : null;
  const punctuality = await punctualityFieldsForClock(ctx, {
    propertyId: args.propertyId,
    expectedStart: template?.startTime,
    expectedEnd: template?.endTime,
  });

  return await ctx.db.insert("shifts", {
    propertyId: args.propertyId,
    employeeId: staff?._id,
    userId: args.userId,
    barId: args.barId,
    department: "fnb",
    shiftDate: args.shiftDate,
    startTime: currentUtcHHmm(),
    isFinalized: false,
    shiftTemplateId: template?._id,
    clockMethod: "self",
    recordedByUserId: args.userId,
    ...punctualityInsertFields(punctuality),
  });
}
