import { MutationCtx, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { propertyDateKey } from "./barStock";
import {
  departmentFromRole,
  findActiveShiftForStaffDate,
  findActiveShiftForUserDate,
  staffForUser,
} from "./shiftHelpers";

type DbCtx = MutationCtx | QueryCtx;

export type DeskStamp = {
  userId: Id<"users">;
  employeeId?: Id<"staffs">;
  shiftId: Id<"shifts">;
};

export function staffWorksFrontOffice(staff: Doc<"staffs"> | null): boolean {
  if (!staff) return false;
  if (staff.role === "Receptionist") return true;
  const department = staff.department ?? departmentFromRole(staff.role);
  return department === "front-office";
}

export async function loadOpenShift(
  ctx: DbCtx,
  args: { userId: Id<"users">; propertyId: Id<"properties"> },
) {
  const shiftDate = await propertyDateKey(ctx, args.propertyId);
  const staff = await staffForUser(ctx, args.userId);
  const shift = staff
    ? await findActiveShiftForStaffDate(ctx, staff._id, shiftDate)
    : await findActiveShiftForUserDate(ctx, args.userId, shiftDate);
  const onProperty = shift && shift.propertyId === args.propertyId ? shift : null;
  return { shiftDate, staff, shift: onProperty };
}

export async function requireFnBSaleShift(
  ctx: DbCtx,
  args: { userId: Id<"users">; propertyId: Id<"properties"> },
): Promise<
  | { ok: true; shift: Doc<"shifts">; staff: Doc<"staffs">; barId: Id<"bars"> }
  | { ok: false; message: string }
> {
  const { staff, shift } = await loadOpenShift(ctx, args);
  if (!staff) {
    return {
      ok: false,
      message: "No staff record is linked to your login. Ask an admin to connect your user to Staff.",
    };
  }
  if (!shift) {
    return { ok: false, message: "Start your shift before ringing a sale." };
  }
  if (shift.department !== "fnb" || !shift.barId) {
    return {
      ok: false,
      message: "Your open shift is not an F&B shift at a bar. Start the shift for your bar before selling.",
    };
  }
  const bar = await ctx.db.get(shift.barId);
  if (!bar || !bar.isActive || bar.propertyId !== args.propertyId) {
    return { ok: false, message: "The bar on your shift is not active." };
  }
  return { ok: true, shift, staff, barId: shift.barId };
}

/**
 * Restaurant sales require a logged-in staff member with an open restaurant shift.
 * Parallel to requireFnBSaleShift, without a bar.
 */
export async function requireRestaurantSaleShift(
  ctx: DbCtx,
  args: { userId: Id<"users">; propertyId: Id<"properties"> },
): Promise<
  | { ok: true; shift: Doc<"shifts">; staff: Doc<"staffs"> }
  | { ok: false; message: string }
> {
  const { staff, shift } = await loadOpenShift(ctx, args);
  if (!staff) {
    return {
      ok: false,
      message: "No staff record is linked to your login. Ask an admin to connect your user to Staff.",
    };
  }
  if (!shift) {
    return { ok: false, message: "Start your shift before ringing a sale." };
  }
  if (shift.department !== "restaurant") {
    return {
      ok: false,
      message:
        "Your open shift is not a restaurant shift. Start your restaurant shift before selling.",
    };
  }
  return { ok: true, shift, staff };
}

/**
 * Reservation changes require the reservations permission and an open front-office shift.
 * The permission is checked by the caller. This rejects every other department.
 */
export async function requireFrontOfficeDuty(
  ctx: DbCtx,
  args: { userId: Id<"users">; propertyId: Id<"properties"> },
): Promise<{ ok: true; stamp: DeskStamp } | { ok: false; message: string }> {
  const { staff, shift } = await loadOpenShift(ctx, args);
  if (!staff || !staffWorksFrontOffice(staff)) {
    return {
      ok: false,
      message: "Only front-office staff can change a reservation.",
    };
  }
  if (!shift || shift.department !== "front-office") {
    return {
      ok: false,
      message: "Start your front-office shift before working the desk.",
    };
  }
  return {
    ok: true,
    stamp: {
      userId: shift.userId ?? args.userId,
      employeeId: shift.employeeId ?? staff._id,
      shiftId: shift._id,
    },
  };
}
