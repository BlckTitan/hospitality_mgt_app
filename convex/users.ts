import { internalMutation, mutation, query, QueryCtx } from "./_generated/server";
import { UserJSON } from "@clerk/backend";
import { v, Validator } from "convex/values";
import { requireAuthenticated, requirePermission } from "./lib/rbac";
import {
  fulfillPendingInviteForUser,
  normalizeInviteEmail,
} from "./lib/pendingInvites";
import {
  createUserIfAbsent,
  ensureUserFromIdentity,
  userByExternalId,
} from "./lib/userIdentity";

const inviteStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("revoked"),
  v.literal("expired"),
);

export const getAllUsers = query({
  args: { propertyId: v.optional(v.id("properties")) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "users.read", args.propertyId);
    try {
      if (args.propertyId) {
        const userRoles = await ctx.db
          .query("userRoles")
          .withIndex("by_propertyId", (q) =>
            q.eq("propertyId", args.propertyId!),
          )
          .collect();

        const userIds = [...new Set(userRoles.map((userRole) => userRole.userId))];
        const users = (
          await Promise.all(userIds.map((userId) => ctx.db.get(userId)))
        ).filter((user) => user !== null);

        return { success: true, data: users };
      }

      const users = await ctx.db.query("users").collect();
      return { success: true, data: users };
    } catch (error) {
      console.log(`Failed to fetch users: ${error}`);
      return { success: false, data: [], message: "Failed to fetch users" };
    }
  },
});

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "users.read");
    try {
      const user = await ctx.db.get(args.userId);
      if (!user) {
        return { success: false, data: null, message: "User not found" };
      }
      return { success: true, data: user };
    } catch (error) {
      console.log(`Failed to fetch user: ${error}`);
      return { success: false, data: null, message: "Failed to fetch user" };
    }
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await ensureUserFromIdentity(ctx);
    return { success: true, userId: user._id };
  },
});

export const trackLogin = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await userByExternalId(ctx, identity.subject);
    const now = Date.now();
    
    if (user) {
      await ctx.db.patch(user._id, {
        lastLoginAt: now,
        updatedAt: now,
      });
      await fulfillPendingInviteForUser(ctx, {
        email: identity.email ?? user.email,
        userId: user._id,
      });
      return { success: true, userId: user._id, isNew: false };
    }

    const newUser = await createUserIfAbsent(ctx, {
      externalId: identity.subject,
      email: identity.email ?? "",
      name: identity.name ?? identity.nickname ?? identity.email ?? "User",
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });
    return { success: true, userId: newUser._id, isNew: true };
  },
});

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    lastLoginAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db.get(args.userId);

    if (!existingUser) {
      return { success: false, message: "User does not exist" };
    }

    await requirePermission(ctx, "users.update");

    try {
      if (args.email && args.email !== existingUser.email) {
        const duplicateEmail = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", args.email!))
          .first();

        if (duplicateEmail) {
          return { success: false, message: "Email is already in use" };
        }
      }

      const updateData: {
        updatedAt: number;
        email?: string;
        name?: string;
        phone?: string;
        isActive?: boolean;
        lastLoginAt?: number;
      } = {
        updatedAt: Date.now(),
      };

      if (args.email !== undefined) updateData.email = args.email;
      if (args.name !== undefined) updateData.name = args.name;
      if (args.phone !== undefined) updateData.phone = args.phone;
      if (args.isActive !== undefined) updateData.isActive = args.isActive;
      if (args.lastLoginAt !== undefined) {
        updateData.lastLoginAt = args.lastLoginAt;
      }

      await ctx.db.patch(args.userId, updateData);

      return { success: true, message: "User updated successfully" };
    } catch (error) {
      console.log(`Failed to update user: ${error}`);
      return { success: false, message: "Failed to update user" };
    }
  },
});

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      return { success: false, message: "User does not exist" };
    }

    await requirePermission(ctx, "users.delete");

    try {
      await ctx.db.delete(args.userId);
      return { success: true, message: "User deleted successfully" };
    } catch (error) {
      console.log(`Failed to delete user: ${error}`);
      return { success: false, message: "Failed to delete user" };
    }
  },
});

export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> },
  async handler(ctx, { data }) {
    const syncedFields = {
      name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
      externalId: data.id,
      email: data.email_addresses[0]?.email_address ?? "",
      isActive: true,
    };

    const user = await userByExternalId(ctx, data.id);
    const now = Date.now();
    if (user === null) {
      await createUserIfAbsent(ctx, {
        ...syncedFields,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: data.last_sign_in_at ? Number(data.last_sign_in_at) : now,
      });
    } else {
      await ctx.db.patch(user._id, {
        ...syncedFields,
        updatedAt: now,
        lastLoginAt: data.last_sign_in_at ? Number(data.last_sign_in_at) : user.lastLoginAt,
      });
      await fulfillPendingInviteForUser(ctx, {
        email: syncedFields.email,
        userId: user._id,
      });
    }
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await userByExternalId(ctx, clerkUserId);

    if (user !== null) {
      await ctx.db.delete(user._id);
    } else {
      console.warn(
        `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`,
      );
    }
  },
});

export const handleSessionCreated = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await userByExternalId(ctx, clerkUserId);

    if (user !== null) {
      const now = Date.now();
      await ctx.db.patch(user._id, {
        lastLoginAt: now,
        updatedAt: now,
      });
    } else {
      console.warn(
        `Can't update lastLoginAt, there is no user for Clerk user ID: ${clerkUserId}`,
      );
    }
  },
});

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new Error("Can't get current user");
  return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await userByExternalId(ctx, identity.subject);
}

export const getUserByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    const authContext = await requireAuthenticated(ctx);
    if (args.externalId !== authContext.user.externalId) {
      await requirePermission(ctx, "users.read");
    }

    try {
      const user = await userByExternalId(ctx, args.externalId);

      if (!user) {
        return { success: false, data: null, message: "User not found" };
      }

      return { success: true, data: user };
    } catch (error) {
      console.log(`Failed to fetch user by external ID: ${error}`);
      return { success: false, data: null, message: "Failed to fetch user" };
    }
  },
});

// Pending invite management mutations
export const createPendingInvite = mutation({
  args: {
    email: v.string(),
    roleId: v.id("roles"),
    propertyId: v.id("properties"),
    clerkInvitationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authContext = await requirePermission(ctx, "users.create", args.propertyId);
    const email = normalizeInviteEmail(args.email);

    const existingInvites = await ctx.db
      .query("pendingInvites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    const existingPending = existingInvites.find((invite) => invite.status === "pending");
    const existingReusable = existingInvites.find(
      (invite) => invite.status === "expired" || invite.status === "revoked",
    );

    if (existingPending) {
      return { success: false, message: "Pending invite already exists for this email" };
    }

    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000);

    try {
      if (existingReusable) {
        await ctx.db.patch(existingReusable._id, {
          email,
          roleId: args.roleId,
          propertyId: args.propertyId,
          clerkInvitationId: args.clerkInvitationId,
          status: "pending",
          expiresAt,
          createdAt: Date.now(),
        });
        return { success: true, inviteId: existingReusable._id, message: "Invitation re-created successfully" };
      }

      const inviteId = await ctx.db.insert("pendingInvites", {
        email,
        roleId: args.roleId,
        propertyId: args.propertyId,
        invitedBy: authContext.user._id,
        clerkInvitationId: args.clerkInvitationId,
        status: "pending",
        createdAt: Date.now(),
        expiresAt,
      });

      return { success: true, inviteId, message: "Pending invite created successfully" };
    } catch (error) {
      console.log(`Failed to create pending invite: ${error}`);
      return { success: false, message: "Failed to create pending invite" };
    }
  },
});

export const getPendingInvites = query({
  args: { propertyId: v.optional(v.id("properties")) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "users.read", args.propertyId);

    try {
      const invites = args.propertyId
        ? await ctx.db
            .query("pendingInvites")
            .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId!))
            .collect()
        : await ctx.db.query("pendingInvites").collect();

      const enrichedInvites = await Promise.all(
        invites.map(async (invite) => {
          const role = await ctx.db.get(invite.roleId);
          const inviter = await ctx.db.get(invite.invitedBy);
          return {
            ...invite,
            roleName: role?.name || "Unknown",
            inviterName: inviter?.name || "Unknown",
          };
        })
      );

      return { success: true, data: enrichedInvites };
    } catch (error) {
      console.error("Failed to fetch pending invites:", error);
      return { success: false, data: [], message: "Failed to fetch pending invites" };
    }
  },
});

export const getPendingInvite = query({
  args: { inviteId: v.id("pendingInvites") },
  handler: async (ctx, args) => {
    await requireAuthenticated(ctx);

    try {
      const invite = await ctx.db.get(args.inviteId);
      if (!invite) {
        return { success: false, data: null, message: "Invite not found" };
      }

      await requirePermission(ctx, "users.read", invite.propertyId);

      const role = await ctx.db.get(invite.roleId);
      const inviter = await ctx.db.get(invite.invitedBy);

      return {
        success: true,
        data: {
          ...invite,
          roleName: role?.name || "Unknown",
          inviterName: inviter?.name || "Unknown",
        },
      };
    } catch (error) {
      console.error("Failed to fetch pending invite:", error);
      return { success: false, data: null, message: "Failed to fetch pending invite" };
    }
  },
});

export const updateInviteStatus = mutation({
  args: {
    inviteId: v.id("pendingInvites"),
    status: inviteStatusValidator,
    clerkInvitationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticated(ctx);
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      return { success: false, message: "Invite not found" };
    }

    await requirePermission(ctx, "users.update", invite.propertyId);

    try {
      const patch: {
        status: typeof args.status;
        clerkInvitationId?: string;
      } = { status: args.status };
      if (args.clerkInvitationId !== undefined) {
        patch.clerkInvitationId = args.clerkInvitationId;
      }
      await ctx.db.patch(args.inviteId, patch);
      return { success: true, message: "Invite status updated successfully" };
    } catch (error) {
      console.log(`Failed to update invite status: ${error}`);
      return { success: false, message: "Failed to update invite status" };
    }
  },
});

export const fulfillPendingInvite = internalMutation({
  args: { email: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    return await fulfillPendingInviteForUser(ctx, args);
  },
});

export const expirePendingInvites = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const pendingInvites = await ctx.db
      .query("pendingInvites")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    let expiredCount = 0;
    for (const invite of pendingInvites) {
      if (invite.expiresAt && invite.expiresAt < now) {
        await ctx.db.patch(invite._id, { status: "expired" });
        expiredCount++;
      }
    }

    return { success: true, expiredCount, message: `Expired ${expiredCount} invitations` };
  },
});

export const reinviteUser = mutation({
  args: {
    inviteId: v.id("pendingInvites"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticated(ctx);
    const existingInvite = await ctx.db.get(args.inviteId);
    if (!existingInvite) {
      return { success: false, message: "Invite not found" };
    }

    await requirePermission(ctx, "users.create", existingInvite.propertyId);

    if (existingInvite.status === "pending") {
      return { success: false, message: "This invitation is still pending. No need to re-invite." };
    }

    if (existingInvite.status === "accepted") {
      return { success: false, message: "This invitation has already been accepted." };
    }

    try {
      const newExpiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000);

      await ctx.db.patch(args.inviteId, {
        status: "pending",
        expiresAt: newExpiresAt,
        createdAt: Date.now(),
        clerkInvitationId: undefined,
      });

      return {
        success: true,
        inviteId: args.inviteId,
        email: existingInvite.email,
        roleId: existingInvite.roleId,
        propertyId: existingInvite.propertyId,
        previousStatus: existingInvite.status,
        previousClerkInvitationId: existingInvite.clerkInvitationId,
        message: "Invitation ready for re-sending",
      };
    } catch (error) {
      console.log(`Failed to re-invite user: ${error}`);
      return { success: false, message: "Failed to re-invite user" };
    }
  },
});

export const updateInviteClerkId = mutation({
  args: {
    inviteId: v.id("pendingInvites"),
    clerkInvitationId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticated(ctx);
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      return { success: false, message: "Invite not found" };
    }

    await requirePermission(ctx, "users.update", invite.propertyId);

    try {
      await ctx.db.patch(args.inviteId, {
        clerkInvitationId: args.clerkInvitationId,
      });

      return { success: true, message: "Clerk invitation ID updated successfully" };
    } catch (error) {
      console.log(`Failed to update Clerk invitation ID: ${error}`);
      return { success: false, message: "Failed to update Clerk invitation ID" };
    }
  },
});
