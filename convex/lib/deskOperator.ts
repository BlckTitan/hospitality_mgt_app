import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { localDayBounds, propertyTimeZone } from "./billingPeriods";
import { requireFrontOfficeDuty } from "./dutyContext";
import { AuthContext, isAdministratorAtProperty } from "./rbac";
import { ADMINISTRATOR_ROLE_NAME } from "./systemRoles";
import { placementForStaff, zonedWallTimeToUtc } from "./rotation";
import { isActiveStatus } from "./staffAccess";
import { findOpenShiftNear, staffDisplayName, staffForUser } from "./shiftHelpers";

type DbCtx = MutationCtx | QueryCtx;

export type DeskOperator = {
  userId: Id<"users">;
  staffId: Id<"staffs">;
  shiftId?: Id<"shifts">;
  name: string;
};

export const NOBODY_ON_ROTATION = "Nobody is on rotation at the front desk.";
export const NO_RECEPTIONISTS = "There are no receptionists to choose.";
export const CHOOSE_RECEPTIONIST = "Choose the receptionist this booking belongs to.";
const OWN_DESK = "You can only work your own desk.";
const NOT_A_RECEPTIONIST = "Choose a receptionist.";

const ADMINISTRATOR_ROLE_NAMES = new Set([
  ADMINISTRATOR_ROLE_NAME.trim().toLowerCase(),
  "admin",
  "administrator",
  "admin role",
  "system admin",
]);

function isReceptionistJob(role: string | undefined): boolean {
  return role?.trim().toLowerCase() === "receptionist";
}

/** An administrator is not a receptionist, even when their login is also on the desk. */
async function userIsAdministrator(
  ctx: DbCtx,
  userId: Id<"users">,
  propertyId: Id<"properties">,
): Promise<boolean> {
  const assignments = await ctx.db
    .query("userRoles")
    .withIndex("by_userId_propertyId", (q) => q.eq("userId", userId).eq("propertyId", propertyId))
    .take(20);
  for (const assignment of assignments) {
    const role = await ctx.db.get(assignment.roleId);
    if (role && ADMINISTRATOR_ROLE_NAMES.has(role.name.trim().toLowerCase())) return true;
  }
  return false;
}

const ADMINISTRATOR_ROLE_NAMES = new Set([
  ADMINISTRATOR_ROLE_NAME.trim().toLowerCase(),
  "admin",
  "administrator",
  "admin role",
  "system admin",
]);

function isReceptionistJob(role: string | undefined): boolean {
  return role?.trim().toLowerCase() === "receptionist";
}

/** An administrator is not a receptionist, even when their login is also on the desk. */
async function userIsAdministrator(
  ctx: DbCtx,
  userId: Id<"users">,
  propertyId: Id<"properties">,
): Promise<boolean> {
  const assignments = await ctx.db
    .query("userRoles")
    .withIndex("by_userId_propertyId", (q) => q.eq("userId", userId).eq("propertyId", propertyId))
    .take(20);
  for (const assignment of assignments) {
    const role = await ctx.db.get(assignment.roleId);
    if (role && ADMINISTRATOR_ROLE_NAMES.has(role.name.trim().toLowerCase())) return true;
  }
  return false;
}

/** Receptionists the front-office rotation (or today's desk roster) puts on duty. */
export async function listFrontOfficeOperators(
  ctx: DbCtx,
  propertyId: Id<"properties">,
): Promise<DeskOperator[]> {
  const property = await ctx.db.get(propertyId);
  const timeZone = propertyTimeZone(property);
  const logDate = localDayBounds(Date.now(), timeZone).dateKey;
  const byUser = new Map<string, DeskOperator>();

  const rotations = await ctx.db
    .query("rotations")
    .withIndex("by_propertyId_department", (q) =>
      q.eq("propertyId", propertyId).eq("department", "front-office"),
    )
    .take(50);

  for (const rotation of rotations) {
    if (!rotation.isActive) continue;
    const assignments = await ctx.db
      .query("staffRotations")
      .withIndex("by_rotationId", (q) => q.eq("rotationId", rotation._id))
      .take(200);
    for (const assignment of assignments) {
      if (!assignment.isActive || assignment.propertyId !== propertyId) continue;
      const staff = await ctx.db.get(assignment.staffId);
      if (!staff) continue;
      await rememberIfOnDesk(ctx, byUser, staff, propertyId, logDate, timeZone);
    }
  }

  const slots = await ctx.db
    .query("rosterSlots")
    .withIndex("by_propertyId_date", (q) => q.eq("propertyId", propertyId).eq("shiftDate", logDate))
    .take(300);
  for (const slot of slots) {
    if (!(await slotIsFrontOffice(ctx, slot))) continue;
    const staff = await ctx.db.get(slot.workingEmployeeId);
    if (!staff) continue;
    await rememberIfOnDesk(ctx, byUser, staff, propertyId, logDate, timeZone);
  }

  return [...byUser.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/**
 * Every active receptionist at the property who can sign in.
 * Administrators are left out. Duty is not required.
 */
export async function listPropertyReceptionists(
  ctx: DbCtx,
  propertyId: Id<"properties">,
): Promise<DeskOperator[]> {
  const property = await ctx.db.get(propertyId);
  const timeZone = propertyTimeZone(property);
  const logDate = localDayBounds(Date.now(), timeZone).dateKey;
  const byUser = new Map<string, DeskOperator>();

  const staffRows = await ctx.db
    .query("staffs")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
    .take(500);
  for (const staff of staffRows) {
    if (!isReceptionistJob(staff.role)) continue;
    await rememberReceptionist(ctx, byUser, staff, propertyId, logDate);
  }

  const assignments = await ctx.db
    .query("userRoles")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
    .take(500);
  for (const assignment of assignments) {
    const role = await ctx.db.get(assignment.roleId);
    if (!role || role.name.trim().toLowerCase() !== "receptionist") continue;
    const staff = await staffForUser(ctx, assignment.userId);
    if (!staff) continue;
    await rememberReceptionist(ctx, byUser, staff, propertyId, logDate);
  }

  return [...byUser.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/**
 * A receptionist works their own open front-office shift.
 * An administrator works for any receptionist at the property.
 */
export async function resolveDeskOperator(
  ctx: DbCtx,
  args: {
    auth: AuthContext;
    propertyId: Id<"properties">;
    deskUserId?: Id<"users">;
  },
): Promise<{ ok: true; operator: DeskOperator } | { ok: false; message: string }> {
  if (!isAdministratorAtProperty(args.auth, args.propertyId)) {
    if (args.deskUserId && args.deskUserId !== args.auth.user._id) {
      return { ok: false, message: OWN_DESK };
    }
    const duty = await requireFrontOfficeDuty(ctx, {
      userId: args.auth.user._id,
      propertyId: args.propertyId,
    });
    if (duty.ok === false) return { ok: false, message: duty.message };
    const staff = duty.stamp.employeeId
      ? await ctx.db.get(duty.stamp.employeeId)
      : await staffForUser(ctx, duty.stamp.userId);
    if (!staff) {
      return { ok: false, message: "Only front-office staff can change a reservation." };
    }
    const user = await ctx.db.get(duty.stamp.userId);
    return {
      ok: true,
      operator: {
        userId: duty.stamp.userId,
        staffId: staff._id,
        shiftId: duty.stamp.shiftId,
        name: user?.name?.trim() || staffDisplayName(staff),
      },
    };
  }

  const operators = await listPropertyReceptionists(ctx, args.propertyId);
  if (operators.length === 0) return { ok: false, message: NO_RECEPTIONISTS };
  if (args.deskUserId) {
    const chosen = operators.find((person) => person.userId === args.deskUserId);
    if (!chosen) return { ok: false, message: NOT_A_RECEPTIONIST };
    return { ok: true, operator: chosen };
  }
  if (operators.length === 1) return { ok: true, operator: operators[0] };
  return { ok: false, message: CHOOSE_RECEPTIONIST };
}

async function rememberReceptionist(
  ctx: DbCtx,
  byUser: Map<string, DeskOperator>,
  staff: Doc<"staffs">,
  propertyId: Id<"properties">,
  logDate: string,
) {
  if (!isActiveStatus(staff.employmentStatus) || !staff.userId) return;
  if (staff.propertyId && staff.propertyId !== propertyId) return;
  if (byUser.has(staff.userId)) return;
  if (await userIsAdministrator(ctx, staff.userId, propertyId)) return;
  const user = await ctx.db.get(staff.userId);
  if (!user?.isActive) return;
  const open = await findOpenShiftNear(ctx, staff._id, logDate);
  const shift =
    open && open.propertyId === propertyId && open.department === "front-office" ? open : null;
  byUser.set(staff.userId, {
    userId: staff.userId,
    staffId: staff._id,
    ...(shift ? { shiftId: shift._id } : {}),
    name: user.name?.trim() || staffDisplayName(staff),
  });
}

async function rememberIfOnDesk(
  ctx: DbCtx,
  byUser: Map<string, DeskOperator>,
  staff: Doc<"staffs">,
  propertyId: Id<"properties">,
  logDate: string,
  timeZone: string,
) {
  if (!isActiveStatus(staff.employmentStatus) || !staff.userId) return;
  if (!isReceptionistJob(staff.role)) return;
  if (staff.propertyId && staff.propertyId !== propertyId) return;
  if (byUser.has(staff.userId)) return;
  if (await userIsAdministrator(ctx, staff.userId, propertyId)) return;
  if (!(await isOnFrontOfficeDuty(ctx, staff, propertyId, logDate, timeZone))) return;
  const user = await ctx.db.get(staff.userId);
  if (!user?.isActive) return;
  const open = await findOpenShiftNear(ctx, staff._id, logDate);
  const shift =
    open && open.propertyId === propertyId && open.department === "front-office" ? open : null;
  byUser.set(staff.userId, {
    userId: staff.userId,
    staffId: staff._id,
    ...(shift ? { shiftId: shift._id } : {}),
    name: user.name?.trim() || staffDisplayName(staff),
  });
}

async function isOnFrontOfficeDuty(
  ctx: DbCtx,
  staff: Doc<"staffs">,
  propertyId: Id<"properties">,
  logDate: string,
  timeZone: string,
) {
  const own = await frontOfficeSlots(ctx, staff._id, logDate, "scheduled");
  if (own.some((slot) => slot.workingEmployeeId !== staff._id)) return false;
  const working = await frontOfficeSlots(ctx, staff._id, logDate, "working");
  if (working.length > 0) return true;
  return await rotationCoversFrontOffice(ctx, staff, propertyId, logDate, timeZone);
}

async function frontOfficeSlots(
  ctx: DbCtx,
  employeeId: Id<"staffs">,
  logDate: string,
  kind: "scheduled" | "working",
) {
  const rows =
    kind === "scheduled"
      ? await ctx.db
          .query("rosterSlots")
          .withIndex("by_scheduled_date", (q) =>
            q.eq("scheduledEmployeeId", employeeId).eq("shiftDate", logDate),
          )
          .take(10)
      : await ctx.db
          .query("rosterSlots")
          .withIndex("by_working_date", (q) =>
            q.eq("workingEmployeeId", employeeId).eq("shiftDate", logDate),
          )
          .take(10);
  const front = [];
  for (const row of rows) {
    if (await slotIsFrontOffice(ctx, row)) front.push(row);
  }
  return front;
}

async function slotIsFrontOffice(
  ctx: DbCtx,
  slot: { shiftTemplateId: Id<"shiftTemplates"> },
) {
  const template = await ctx.db.get(slot.shiftTemplateId);
  return template?.department === "front-office";
}

async function rotationCoversFrontOffice(
  ctx: DbCtx,
  staff: Doc<"staffs">,
  propertyId: Id<"properties">,
  logDate: string,
  timeZone: string,
) {
  for (const clock of ["08:00", "14:00", "23:00"]) {
    const instant = zonedWallTimeToUtc(`${logDate}T${clock}`, timeZone);
    if (instant == null) continue;
    const place = await placementForStaff(ctx, staff, propertyId, instant);
    if (place.status !== "on") continue;
    const rotation = await ctx.db.get(place.rotationId);
    if (rotation?.department === "front-office") return true;
  }
  return false;
}
