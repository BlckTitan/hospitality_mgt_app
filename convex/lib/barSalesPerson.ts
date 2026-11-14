import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { assertCanOperateBar } from "./barAssignment";
import { listOnDutyStaffForBarDate } from "./barDuty";
import { AuthContext, isAdministratorAtProperty } from "./rbac";
import { isActiveStatus } from "./staffAccess";
import { ensureOpenBarSession, staffDisplayName, staffForUser } from "./shiftHelpers";

type DbCtx = MutationCtx | QueryCtx;

export type BarSalesPerson = {
  userId: Id<"users">;
  staffId: Id<"staffs">;
  shiftId?: Id<"shifts">;
  barId: Id<"bars">;
  name: string;
};

export type ReadyBarSalesPerson = BarSalesPerson & { shiftId: Id<"shifts"> };

export const NOT_ON_ROTATION = "You are not on rotation at this bar.";
export const NOBODY_ON_ROTATION = "Nobody is on rotation at this bar.";
const CHOOSE_WAITER = "Choose the waiter this sale belongs to.";

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

/** People the rotation puts on this bar for the date. An open shift does not add anyone else. */
export async function listBarSellers(
  ctx: DbCtx,
  args: {
    auth: AuthContext;
    propertyId: Id<"properties">;
    barId: Id<"bars">;
    logDate: string;
    today: string;
    includeEnded?: boolean;
  },
): Promise<BarSalesPerson[]> {
  const duty = await listOnDutyStaffForBarDate(ctx, {
    propertyId: args.propertyId,
    barId: args.barId,
    logDate: args.logDate,
  });
  const shifts = await ctx.db
    .query("shifts")
    .withIndex("by_barId_date", (q) => q.eq("barId", args.barId).eq("shiftDate", args.logDate))
    .collect();
  const sellers: BarSalesPerson[] = [];
  for (const person of duty) {
    if (!person.userId) continue;
    const staff = await staffForUser(ctx, person.userId);
    if (!staff || !isActiveStatus(staff.employmentStatus)) continue;
    const shift = shifts.find(
      (row) =>
        (!row.department || row.department === "fnb") &&
        (row.userId === person.userId || row.employeeId === staff._id),
    );
    sellers.push({
      userId: person.userId,
      staffId: staff._id,
      ...(shift ? { shiftId: shift._id } : {}),
      barId: args.barId,
      name: person.name,
    });
  }
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
  const sellers = await listBarSellers(ctx, args);
  const picked = pickSeller(args.auth, args.propertyId, sellers, args.salesUserId, args.preferUserId, args.barId);
  if (picked.ok === false) {
    if (sellers.length > 0) return picked;
    if (!isAdministratorAtProperty(args.auth, args.propertyId)) {
      return { ok: false, message: await explainNoBarOperator(ctx, args.auth, args.propertyId, args.barId) };
    }
    return { ok: false, message: NOBODY_ON_ROTATION };
  }
  return picked;
}

/** A sale at a bar. A clocked waiter is used when one is on shift. Otherwise the person operating the open bar is used. */
export async function resolvePosSalesPerson(
  ctx: DbCtx,
  args: {
    auth: AuthContext;
    propertyId: Id<"properties">;
    logDate: string;
    barId?: Id<"bars">;
    salesUserId?: Id<"users">;
  },
): Promise<{ ok: true; seller: BarSalesPerson } | { ok: false; message: string }> {
  if (args.barId) {
    return resolveBarSalesPerson(ctx, {
      auth: args.auth,
      propertyId: args.propertyId,
      barId: args.barId,
      logDate: args.logDate,
      today: args.logDate,
      salesUserId: args.salesUserId ?? (
        isAdministratorAtProperty(args.auth, args.propertyId) ? undefined : args.auth.user._id
      ),
    });
  }
  const bars = await ctx.db
    .query("bars")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
    .collect();
  const sellers: BarSalesPerson[] = [];
  for (const bar of bars) {
    if (!bar.isActive) continue;
    const people = await listBarSellers(ctx, {
      auth: args.auth,
      propertyId: args.propertyId,
      barId: bar._id,
      logDate: args.logDate,
      today: args.logDate,
    });
    sellers.push(...people);
  }
  sellers.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    || a.barId.localeCompare(b.barId));
  const picked = pickSeller(args.auth, args.propertyId, sellers, args.salesUserId);
  if (picked.ok === false) {
    if (sellers.length > 0) return picked;
    return {
      ok: false,
      message: isAdministratorAtProperty(args.auth, args.propertyId)
        ? NOBODY_ON_ROTATION
        : await explainNoBarOperator(ctx, args.auth, args.propertyId),
    };
  }
  return picked;
}

/** Writes need a shift row. A clocked shift is kept. An open bar uses the bar session. */
export async function ensureSellerShift(
  ctx: MutationCtx,
  seller: BarSalesPerson,
  propertyId: Id<"properties">,
  logDate: string,
): Promise<ReadyBarSalesPerson> {
  if (seller.shiftId) return { ...seller, shiftId: seller.shiftId };
  const shiftId = await ensureOpenBarSession(ctx, {
    propertyId,
    barId: seller.barId,
    shiftDate: logDate,
    operatorUserId: seller.userId,
  });
  return { ...seller, shiftId };
}

const NO_STAFF = "No staff record is linked to your login. Ask an admin to connect your user to Staff.";
const NOT_LINKED = "You are not linked to a bar.";

export async function explainNoBarOperator(
  ctx: DbCtx,
  auth: AuthContext,
  propertyId: Id<"properties">,
  barId?: Id<"bars">,
): Promise<string> {
  const staff = await staffForUser(ctx, auth.user._id);
  if (!staff || !isActiveStatus(staff.employmentStatus)) return NO_STAFF;
  if (staff.propertyId && staff.propertyId !== propertyId) {
    return "Your staff record is for another property.";
  }
  if (barId) {
    const denied = await assertCanOperateBar(ctx, auth, barId);
    if (denied) return denied;
  } else {
    const bars = await ctx.db
      .query("bars")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
      .collect();
    let operable = false;
    for (const bar of bars) {
      if (!bar.isActive) continue;
      if (!(await assertCanOperateBar(ctx, auth, bar._id))) {
        operable = true;
        break;
      }
    }
    if (!operable) return NOT_LINKED;
  }
  return NOT_ON_ROTATION;
}

function pickSeller(
  auth: AuthContext,
  propertyId: Id<"properties">,
  sellers: BarSalesPerson[],
  salesUserId?: Id<"users">,
  preferUserId?: Id<"users">,
  barId?: Id<"bars">,
): { ok: true; seller: BarSalesPerson } | { ok: false; message: string } {
  const atBar = barId ? sellers.filter((seller) => seller.barId === barId) : sellers;
  if (!isAdministratorAtProperty(auth, propertyId)) {
    const mine = atBar.filter((seller) => seller.userId === auth.user._id);
    if (mine.length === 0) {
      return {
        ok: false,
        message: NOT_ON_ROTATION,
      };
    }
    if (salesUserId && salesUserId !== auth.user._id) {
      return { ok: false, message: "You can only record your own sales." };
    }
    if (mine.length === 1) return { ok: true, seller: mine[0] };
    return { ok: false, message: "Choose the bar before selling." };
  }
  if (atBar.length === 0) return { ok: false, message: NOBODY_ON_ROTATION };
  if (salesUserId) {
    const chosen = atBar.filter((seller) => seller.userId === salesUserId);
    if (chosen.length === 0) return { ok: false, message: "That person is not on rotation at this bar." };
    if (chosen.length === 1) return { ok: true, seller: chosen[0] };
    return { ok: false, message: "Choose the bar before selling." };
  }
  if (atBar.length === 1) return { ok: true, seller: atBar[0] };
  if (preferUserId) {
    const preferred = atBar.filter((seller) => seller.userId === preferUserId);
    if (preferred.length === 1) return { ok: true, seller: preferred[0] };
  }
  const samePerson = atBar.every((seller) => seller.userId === atBar[0].userId);
  return { ok: false, message: samePerson ? "Choose the bar before selling." : CHOOSE_WAITER };
}

/** F&B shifts for this bar on this date. Earlier unfinalized shifts are not today's duty. */
export async function shiftsForSale(
  ctx: DbCtx,
  barId: Id<"bars">,
  logDate: string,
  today: string,
  includeEnded?: boolean,
): Promise<Doc<"shifts">[]> {
  const rows = await ctx.db
    .query("shifts")
    .withIndex("by_barId_date", (q) => q.eq("barId", barId).eq("shiftDate", logDate))
    .collect();
  return rows.filter((row) => {
    if (row.department && row.department !== "fnb") return false;
    if (logDate === today && row.isFinalized && !includeEnded) return false;
    return true;
  });
}
