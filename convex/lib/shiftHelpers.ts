import { MutationCtx, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { currentUtcHHmm } from "./payrollHelpers";
import { punctualityFieldsForClock, punctualityInsertFields } from "./punctuality";
import { isActiveStatus } from "./staffAccess";
import { addIsoDays } from "./rotation";

type DbCtx = MutationCtx | QueryCtx;

export const SHIFT_DEPARTMENTS = [
  "front-office",
  "housekeeping",
  "fnb",
  "restaurant",
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
  Griller: "restaurant",
  Cook: "restaurant",
  Chef: "restaurant",
  "Cook / Chef": "restaurant",
  "Kitchen Assistant": "restaurant",
  "kitchen Assistant": "restaurant",
  Security: "other",
  Waiter: "fnb",
  Bartender: "fnb",
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

/** Bar for an F&B worked shift. Uses a legacy template bar, or the property's only active bar. */
export async function resolveFnBBarId(
  ctx: DbCtx,
  propertyId: Id<"properties">,
  templateBarId?: Id<"bars">,
): Promise<Id<"bars"> | undefined> {
  if (templateBarId) {
    const bar = await ctx.db.get(templateBarId);
    if (bar?.isActive && bar.propertyId === propertyId) return templateBarId;
  }
  const bars = await ctx.db
    .query("bars")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
    .collect();
  const active = bars.filter((bar) => bar.isActive);
  return active.length === 1 ? active[0]._id : undefined;
}

/** Active employed F&B staff with a login. A department shift does not assign a bar. */
export async function listActiveUsersTiedToBar(
  ctx: DbCtx,
  args: { propertyId: Id<"properties">; barId?: Id<"bars"> },
) {
  const staffRows = await ctx.db
    .query("staffs")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
    .collect();

  const byUserId = new Map<
    string,
    { _id: Id<"users">; name: string; email: string; barId?: Id<"bars"> }
  >();

  for (const staff of staffRows) {
    if (!isActiveStatus(staff.employmentStatus) || !staff.userId) continue;
    if (byUserId.has(staff.userId)) continue;
    const template = staff.shiftTemplateId ? await ctx.db.get(staff.shiftTemplateId) : null;
    const worksFoodAndBeverage =
      normalizeDepartment(staff.department) === "fnb" || template?.department === "fnb";
    if (!worksFoodAndBeverage) continue;
    const user = await ctx.db.get(staff.userId);
    if (!user?.isActive) continue;
    byUserId.set(staff.userId, {
      _id: user._id,
      name: user.name || staffDisplayName(staff),
      email: user.email,
      barId: args.barId,
    });
  }

  return [...byUserId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function userIsActiveAndTiedToBar(
  ctx: DbCtx,
  args: { propertyId: Id<"properties">; barId: Id<"bars">; userId: Id<"users"> },
) {
  const users = await listActiveUsersTiedToBar(ctx, {
    propertyId: args.propertyId,
    barId: args.barId,
  });
  return users.some((user) => user._id === args.userId);
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

/** Open session on this date or the previous three, so a duty up to 72 hours can still be ended. */
export async function findOpenShiftNear(
  ctx: DbCtx,
  employeeId: Id<"staffs">,
  shiftDate: string,
) {
  for (const date of [
    shiftDate,
    addIsoDays(shiftDate, -1),
    addIsoDays(shiftDate, -2),
    addIsoDays(shiftDate, -3),
  ]) {
    const open = await findActiveShiftForStaffDate(ctx, employeeId, date);
    if (open) return open;
  }
  return null;
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
    startsAt?: number;
    endsAt?: number;
    rotationId?: Id<"rotations">;
    shiftTemplateId?: Id<"shiftTemplates">;
  }
): Promise<{ slot: Doc<"rosterSlots">; template: Doc<"shiftTemplates"> } | { error: string }> {
  const existing = await getRosterSlotForScheduled(ctx, args.scheduledEmployeeId, args.shiftDate);
  if (existing) {
    const templateId = args.shiftTemplateId ?? existing.shiftTemplateId;
    const template = await ctx.db.get(templateId);
    if (!template) return { error: "Shift template is missing for this roster day" };
    if (args.startsAt && args.endsAt) {
      await ctx.db.patch(existing._id, {
        startsAt: args.startsAt,
        endsAt: args.endsAt,
        ...(args.rotationId ? { rotationId: args.rotationId } : {}),
        shiftTemplateId: template._id,
        updatedAt: Date.now(),
      });
      const slot = await ctx.db.get(existing._id);
      if (!slot) return { error: "Failed to update roster duty" };
      return { slot, template };
    }
    return { slot: existing, template };
  }

  const staff = await ctx.db.get(args.scheduledEmployeeId);
  if (!staff) return { error: "Staff member not found" };
  const template = args.shiftTemplateId
    ? await ctx.db.get(args.shiftTemplateId)
    : await resolveStaffTemplate(ctx, staff, args.propertyId);
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
    ...(args.startsAt != null && args.endsAt != null
      ? {
          startsAt: args.startsAt,
          endsAt: args.endsAt,
          ...(args.rotationId ? { rotationId: args.rotationId } : {}),
        }
      : {}),
    createdAt: now,
    updatedAt: now,
  });
  const slot = await ctx.db.get(slotId);
  if (!slot) return { error: "Failed to create roster day" };
  return { slot, template };
}

function canReuseShiftForBar(shift: Doc<"shifts">, barId: Id<"bars">): boolean {
  const departmentOk = !shift.department || shift.department === "fnb";
  const barOk = !shift.barId || shift.barId === barId;
  return departmentOk && barOk;
}

/** Reuse today's open F&B shift at this bar, or open one, when stock is issued. */
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

  const open = staff
    ? await findActiveShiftForStaffDate(ctx, staff._id, args.shiftDate)
    : await findActiveShiftForUserDate(ctx, args.userId, args.shiftDate);

  if (open) {
    if (!canReuseShiftForBar(open, args.barId)) {
      throw new Error(
        "This staff member already has an open shift that is not F&B at this bar. End that shift before issuing stock.",
      );
    }
    const patch: Partial<Doc<"shifts">> = {};
    if (!open.barId) patch.barId = args.barId;
    if (!open.department) patch.department = "fnb";
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(open._id, patch);
    }
    return open._id;
  }

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
