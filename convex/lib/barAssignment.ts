import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { AuthContext } from "./rbac";
import { canViewTeamRecords, rolesForProperty } from "./staffScope";

type DbCtx = MutationCtx | QueryCtx;

export async function activeAssignmentsForBar(ctx: DbCtx, barId: Id<"bars">) {
  const rows = await ctx.db
    .query("barAssignments")
    .withIndex("by_barId", (q) => q.eq("barId", barId))
    .collect();
  return rows.filter((row) => row.isActive);
}

export async function activeAssignmentsForUser(ctx: DbCtx, userId: Id<"users">) {
  const rows = await ctx.db
    .query("barAssignments")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  return rows.filter((row) => row.isActive);
}

export async function isUserAssignedToBar(
  ctx: DbCtx,
  userId: Id<"users">,
  barId: Id<"bars">,
) {
  const row = await ctx.db
    .query("barAssignments")
    .withIndex("by_barId_userId", (q) => q.eq("barId", barId).eq("userId", userId))
    .first();
  return Boolean(row?.isActive);
}

export async function isStaffAssignedToBar(
  ctx: DbCtx,
  staff: Doc<"staffs">,
  barId: Id<"bars">,
) {
  if (staff.userId && (await isUserAssignedToBar(ctx, staff.userId, barId))) return true;
  const rows = await ctx.db
    .query("barAssignments")
    .withIndex("by_staffId", (q) => q.eq("staffId", staff._id))
    .collect();
  return rows.some((row) => row.isActive && row.barId === barId);
}

/** Team roles may correct any bar. Floor staff may operate only a bar they are linked to. */
export async function assertCanOperateBar(
  ctx: DbCtx,
  auth: AuthContext,
  barId: Id<"bars">,
): Promise<string | null> {
  const bar = await ctx.db.get(barId);
  if (!bar || !bar.isActive) return "Bar not found or inactive";
  if (canViewTeamRecords(rolesForProperty(auth, bar.propertyId))) return null;
  if (await isUserAssignedToBar(ctx, auth.user._id, barId)) return null;
  return "You are not linked to this bar.";
}

export async function assignedBarIdsForUser(
  ctx: DbCtx,
  auth: AuthContext,
  propertyId: Id<"properties">,
): Promise<Id<"bars">[] | "all"> {
  if (canViewTeamRecords(rolesForProperty(auth, propertyId))) return "all";
  const rows = await activeAssignmentsForUser(ctx, auth.user._id);
  return rows.filter((row) => row.propertyId === propertyId).map((row) => row.barId);
}
