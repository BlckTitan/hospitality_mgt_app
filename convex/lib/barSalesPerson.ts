import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { requireFnBSaleShift } from "./dutyContext";
import { addIsoDays } from "./rotation";
import { AuthContext, isAdministratorAtProperty } from "./rbac";
import { isActiveStatus } from "./staffAccess";
import { isFloorServiceOnly, rolesForProperty } from "./staffScope";
import { staffDisplayName, staffForUser } from "./shiftHelpers";

type DbCtx = MutationCtx | QueryCtx;

export type BarSalesPerson = {
  userId: Id<"users">;
  staffId: Id<"staffs">;
  shiftId: Id<"shifts">;
  barId: Id<"bars">;
  name: string;
};

const NO_WAITER = "Start a waiter's shift at this bar before recording a sale.";
const CHOOSE_WAITER = "Choose the waiter this sale belongs to.";
const ADMIN_ONLY = "Only an administrator can record a sale for the waiter on shift.";

export async function listBarShiftSellers(
  ctx: DbCtx,
  args: {
    propertyId: Id<"properties">;
    barId: Id<"bars">;
    logDate: string;
    today: string;
    includeEnded?: boolean;
  },
): Promise<BarSalesPerson[]> {
  const shifts = await shiftsForSale(ctx, args.barId, args.logDate, args.today, args.includeEnded);
  const sellers: BarSalesPerson[] = [];
  const seen = new Set<string>();
  for (const shift of shifts) {
    const staff = shift.employeeId
      ? await ctx.db.get(shift.employeeId)
      : shift.userId
        ? await staffForUser(ctx, shift.userId)
        : null;
    if (!staff || !isActiveStatus(staff.employmentStatus)) continue;
    if (staff.propertyId && staff.propertyId !== args.propertyId) continue;
    const userId = shift.userId ?? staff.userId;
    if (!userId || seen.has(userId)) continue;
    const user = await ctx.db.get(userId);
    if (!user) continue;
    seen.add(userId);
    sellers.push({
      userId,
      staffId: staff._id,
      shiftId: shift._id,
      barId: args.barId,
      name: user.name?.trim() || staffDisplayName(staff),
    });
  }
  sellers.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return sellers;
}

export async function resolveBarSalesPerson(
  ctx: DbCtx,
  args: {
    auth: AuthContext;
    propertyId: Id<"properties">;
    barId: Id<"bars">;
    logDate: string;
    today: string;
    salesUserId?: Id<"users">;
    preferUserId?: Id<"users">;
    includeEnded?: boolean;
  },
): Promise<{ ok: true; seller: BarSalesPerson } | { ok: false; message: string }> {
  const sellers = await listBarShiftSellers(ctx, args);
  return pickSeller(args.auth, args.propertyId, sellers, args.salesUserId, args.preferUserId);
}

/** POS has no bar yet. A waiter uses their own shift. An administrator uses the waiter on shift. */
export async function resolvePosSalesPerson(
  ctx: DbCtx,
  args: {
    auth: AuthContext;
    propertyId: Id<"properties">;
    logDate: string;
    salesUserId?: Id<"users">;
  },
): Promise<{ ok: true; seller: BarSalesPerson } | { ok: false; message: string }> {
  const roles = rolesForProperty(args.auth, args.propertyId);
  if (!isAdministratorAtProperty(args.auth, args.propertyId)) {
    const duty = await requireFnBSaleShift(ctx, {
      userId: args.auth.user._id,
      propertyId: args.propertyId,
    });
    if (duty.ok === false) {
      return isFloorServiceOnly(roles) ? duty : { ok: false, message: ADMIN_ONLY };
    }
    return resolveBarSalesPerson(ctx, {
      auth: args.auth,
      propertyId: args.propertyId,
      barId: duty.barId,
      logDate: args.logDate,
      today: args.logDate,
      salesUserId: args.auth.user._id,
    });
  }
  const bars = await ctx.db
    .query("bars")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
    .collect();
  const sellers: BarSalesPerson[] = [];
  for (const bar of bars) {
    if (!bar.isActive) continue;
    const people = await listBarShiftSellers(ctx, {
      propertyId: args.propertyId,
      barId: bar._id,
      logDate: args.logDate,
      today: args.logDate,
    });
    sellers.push(...people);
  }
  sellers.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const picked = pickSeller(args.auth, args.propertyId, sellers, args.salesUserId);
  if (picked.ok === false && picked.message === NO_WAITER) {
    return { ok: false, message: "Start a waiter's shift at a bar before recording a sale." };
  }
  return picked;
}

function pickSeller(
  auth: AuthContext,
  propertyId: Id<"properties">,
  sellers: BarSalesPerson[],
  salesUserId?: Id<"users">,
  preferUserId?: Id<"users">,
): { ok: true; seller: BarSalesPerson } | { ok: false; message: string } {
  const roles = rolesForProperty(auth, propertyId);
  if (!isAdministratorAtProperty(auth, propertyId)) {
    const mine = sellers.find((seller) => seller.userId === auth.user._id);
    if (!mine) {
      return {
        ok: false,
        message: isFloorServiceOnly(roles)
          ? "Start your shift at this bar before recording a sale."
          : ADMIN_ONLY,
      };
    }
    if (salesUserId && salesUserId !== auth.user._id) {
      return { ok: false, message: "You can only record your own sales." };
    }
    return { ok: true, seller: mine };
  }
  if (sellers.length === 0) return { ok: false, message: NO_WAITER };
  if (salesUserId) {
    const chosen = sellers.find((seller) => seller.userId === salesUserId);
    if (!chosen) return { ok: false, message: "That person is not on shift at this bar." };
    return { ok: true, seller: chosen };
  }
  if (sellers.length === 1) return { ok: true, seller: sellers[0] };
  if (preferUserId) {
    const preferred = sellers.find((seller) => seller.userId === preferUserId);
    if (preferred) return { ok: true, seller: preferred };
  }
  return { ok: false, message: CHOOSE_WAITER };
}

/** Open F&B shifts at this bar, including a duty that started on an earlier day and has not ended. */
export async function shiftsForSale(
  ctx: DbCtx,
  barId: Id<"bars">,
  logDate: string,
  today: string,
  includeEnded?: boolean,
): Promise<Doc<"shifts">[]> {
  if (logDate !== today) {
    const rows = await ctx.db
      .query("shifts")
      .withIndex("by_barId_date", (q) => q.eq("barId", barId).eq("shiftDate", logDate))
      .collect();
    return rows.filter((row) => !row.department || row.department === "fnb");
  }
  const shifts: Doc<"shifts">[] = [];
  for (const offset of [0, -1, -2, -3]) {
    const shiftDate = offset === 0 ? logDate : addIsoDays(logDate, offset);
    const rows = await ctx.db
      .query("shifts")
      .withIndex("by_barId_date", (q) => q.eq("barId", barId).eq("shiftDate", shiftDate))
      .collect();
    for (const row of rows) {
      if (row.department && row.department !== "fnb") continue;
      if (row.isFinalized && !(includeEnded && row.shiftDate === logDate)) continue;
      shifts.push(row);
    }
  }
  return shifts;
}
