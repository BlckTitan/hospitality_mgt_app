import { Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { isActiveStatus } from "./staffAccess";

type DbCtx = MutationCtx | QueryCtx;

const SERVICE_ROLE_NAMES = new Set(["Waiter", "Bartender"]);

function serviceRoleFromTitle(role: string | undefined): "Waiter" | "Bartender" | null {
  const key = role?.trim().toLowerCase() ?? "";
  if (key === "waiter" || key === "waitress" || key === "hotel waiter/waitress") return "Waiter";
  if (key === "bartender") return "Bartender";
  return null;
}

/** Active waiters and bartenders at a property who can sign in. */
export async function listActiveWaitersAndBartenders(
  ctx: DbCtx,
  propertyId: Id<"properties">,
) {
  const byUserId = new Map<string, { _id: Id<"users">; name: string }>();

  const assignments = await ctx.db
    .query("userRoles")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
    .collect();

  for (const assignment of assignments) {
    const role = await ctx.db.get(assignment.roleId);
    if (!role || !SERVICE_ROLE_NAMES.has(role.name)) continue;
    const user = await ctx.db.get(assignment.userId);
    if (!user?.isActive) continue;
    byUserId.set(user._id, { _id: user._id, name: user.name || "Staff" });
  }

  const staffRows = await ctx.db
    .query("staffs")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
    .collect();

  for (const staff of staffRows) {
    if (!isActiveStatus(staff.employmentStatus) || !staff.userId) continue;
    if (!serviceRoleFromTitle(staff.role)) continue;
    if (byUserId.has(staff.userId)) continue;
    const user = await ctx.db.get(staff.userId);
    if (!user?.isActive) continue;
    byUserId.set(user._id, {
      _id: user._id,
      name: user.name || `${staff.firstName} ${staff.lastName}`.trim(),
    });
  }

  return [...byUserId.values()].sort((a, b) => a.name.localeCompare(b.name));
}
