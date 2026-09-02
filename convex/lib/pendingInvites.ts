import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

/** Clerk may preserve original casing; we store/compare lowercase for reliable matching. */
export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Assigns role/property from a pending invite when a Clerk user lands in Convex.
 * Called from every user-creation path so webhook vs ensureCurrentUser ordering cannot
 * skip fulfillment.
 */
export async function fulfillPendingInviteForUser(
  ctx: MutationCtx,
  args: { email: string; userId: Id<"users"> },
): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = normalizeInviteEmail(args.email);
  if (!normalizedEmail) {
    return { success: false, message: "No email provided" };
  }

  const matches = await ctx.db
    .query("pendingInvites")
    .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
    .collect();

  let pendingInvite = matches.find((invite) => invite.status === "pending");

  // Older rows may have mixed-case emails from before normalization.
  if (!pendingInvite) {
    const allPending = await ctx.db
      .query("pendingInvites")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    pendingInvite = allPending.find(
      (invite) => normalizeInviteEmail(invite.email) === normalizedEmail,
    );
  }

  if (!pendingInvite) {
    return { success: false, message: "No pending invite found" };
  }

  // Guard against duplicate webhook / login retries creating twin userRoles rows.
  const existingUserRole = await ctx.db
    .query("userRoles")
    .withIndex("by_userId_propertyId", (q) =>
      q.eq("userId", args.userId).eq("propertyId", pendingInvite.propertyId),
    )
    .filter((q) => q.eq(q.field("roleId"), pendingInvite.roleId))
    .first();

  if (!existingUserRole) {
    await ctx.db.insert("userRoles", {
      userId: args.userId,
      roleId: pendingInvite.roleId,
      propertyId: pendingInvite.propertyId,
      assignedAt: Date.now(),
      assignedBy: String(pendingInvite.invitedBy),
    });
  }

  await ctx.db.patch(pendingInvite._id, { status: "accepted" });

  return { success: true, message: "Pending invite fulfilled successfully" };
}
