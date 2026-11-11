import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { activeAssignmentsForBar } from "./barAssignment";
import { listBarSellers, shiftsForSale } from "./barSalesPerson";
import { AuthContext } from "./rbac";
import { propertyDateKey } from "./barStock";
import { propertyTimeZone } from "./billingPeriods";
import { placementForStaff, zonedWallTimeToUtc } from "./rotation";
import { isActiveStatus } from "./staffAccess";
import {
  findAnyShiftForStaffDate,
  getRosterSlotForScheduled,
  getRosterSlotForWorking,
  staffDisplayName,
  staffForUser,
} from "./shiftHelpers";

type DbCtx = MutationCtx | QueryCtx;

export type DutyPerson = {
  name: string;
  userId?: Id<"users">;
};

/** Staff linked to this bar who are working on this date. */
export async function listOnDutyStaffForBarDate(
  ctx: DbCtx,
  args: { propertyId: Id<"properties">; barId: Id<"bars">; logDate: string },
): Promise<DutyPerson[]> {
  const property = await ctx.db.get(args.propertyId);
  const timeZone = propertyTimeZone(property);
  const assignments = await activeAssignmentsForBar(ctx, args.barId);
  const people: DutyPerson[] = [];
  const seen = new Set<string>();

  for (const assignment of assignments) {
    if (assignment.propertyId !== args.propertyId) continue;
    const staff = await staffForAssignment(ctx, assignment);
    if (!staff || !isActiveStatus(staff.employmentStatus)) continue;
    if (!(await isOnDutyAtBar(ctx, staff, args.barId, args.logDate, args.propertyId, timeZone))) {
      continue;
    }
    const key = staff.userId ?? staff._id;
    if (seen.has(key)) continue;
    seen.add(key);
    const user = staff.userId ? await ctx.db.get(staff.userId) : null;
    people.push({
      name: user?.name || staffDisplayName(staff),
      ...(staff.userId ? { userId: staff.userId } : {}),
    });
  }

  const today = await propertyDateKey(ctx, args.propertyId);
  const shifts = await shiftsForSale(ctx, args.barId, args.logDate, today, true);
  for (const shift of shifts) {
    const staff = shift.employeeId
      ? await ctx.db.get(shift.employeeId)
      : shift.userId
        ? await staffForUser(ctx, shift.userId)
        : null;
    const userId = shift.userId ?? staff?.userId;
    const key = userId ?? staff?._id;
    if (!key || seen.has(key)) continue;
    if (staff && !isActiveStatus(staff.employmentStatus)) continue;
    seen.add(key);
    const user = userId ? await ctx.db.get(userId) : null;
    const name = user?.name?.trim() || (staff ? staffDisplayName(staff) : "");
    if (!name) continue;
    people.push({
      name,
      ...(userId ? { userId } : {}),
    });
  }

  people.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return people;
}

/** One row per login, for the duty filter. People without a login stay on the log only. */
export async function listOnDutyUsersForDate(
  ctx: DbCtx,
  args: {
    auth: AuthContext;
    propertyId: Id<"properties">;
    logDate: string;
    barId?: Id<"bars">;
  },
) {
  const bars = args.barId
    ? [await ctx.db.get(args.barId)].filter(
        (bar): bar is Doc<"bars"> => Boolean(bar && bar.propertyId === args.propertyId && bar.isActive),
      )
    : (
        await ctx.db
          .query("bars")
          .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
          .collect()
      ).filter((bar) => bar.isActive);

  const byUser = new Map<string, { _id: Id<"users">; name: string; email: string }>();
  for (const bar of bars) {
    const people = await listOnDutyStaffForBarDate(ctx, {
      propertyId: args.propertyId,
      barId: bar._id,
      logDate: args.logDate,
    });
    for (const person of people) {
      if (!person.userId || byUser.has(person.userId)) continue;
      const user = await ctx.db.get(person.userId);
      if (!user) continue;
      byUser.set(person.userId, { _id: user._id, name: person.name, email: user.email });
    }
  }

  if (byUser.size === 0) {
    const today = await propertyDateKey(ctx, args.propertyId);
    for (const bar of bars) {
      const sellers = await listBarSellers(ctx, {
        auth: args.auth,
        propertyId: args.propertyId,
        barId: bar._id,
        logDate: args.logDate,
        today,
      });
      for (const person of sellers) {
        if (byUser.has(person.userId)) continue;
        const user = await ctx.db.get(person.userId);
        if (!user) continue;
        byUser.set(person.userId, { _id: user._id, name: person.name, email: user.email });
      }
    }
  }

  return [...byUser.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

async function staffForAssignment(
  ctx: DbCtx,
  assignment: { staffId?: Id<"staffs">; userId: Id<"users"> },
) {
  if (assignment.staffId) {
    const staff = await ctx.db.get(assignment.staffId);
    if (staff) return staff;
  }
  return await staffForUser(ctx, assignment.userId);
}

async function isOnDutyAtBar(
  ctx: DbCtx,
  staff: Doc<"staffs">,
  barId: Id<"bars">,
  logDate: string,
  propertyId: Id<"properties">,
  timeZone: string,
) {
  const [ownSlot, workingSlot, shift] = await Promise.all([
    getRosterSlotForScheduled(ctx, staff._id, logDate),
    getRosterSlotForWorking(ctx, staff._id, logDate),
    findAnyShiftForStaffDate(ctx, staff._id, logDate),
  ]);
  if (shift?.barId && shift.barId !== barId) return false;
  if (shift?.barId === barId) return true;

  const covered = Boolean(ownSlot && ownSlot.workingEmployeeId !== staff._id);
  if (covered) return false;
  if (workingSlot?.workingEmployeeId === staff._id) return true;
  return await rotationCoversDate(ctx, staff, propertyId, logDate, timeZone);
}

async function rotationCoversDate(
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
    if (place.status === "on") return true;
  }
  return false;
}
