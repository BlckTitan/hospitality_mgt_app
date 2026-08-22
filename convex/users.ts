import { internalMutation, mutation, query, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { UserJSON } from "@clerk/backend";
import { v, Validator } from "convex/values";
import { requireAuthenticated, requirePermission } from "./lib/rbac";
import {
  createUserIfAbsent,
  ensureUserFromIdentity,
  userByExternalId,
} from "./lib/userIdentity";

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
      const newUser = await createUserIfAbsent(ctx, {
        ...syncedFields,
        createdAt: now,
        updatedAt: now,
      });

      // Check for pending invites and fulfill them
      const email = data.email_addresses[0]?.email_address ?? "";
      if (email) {
        await ctx.runMutation(internal.users.fulfillPendingInvite, {
          email,
          userId: newUser._id,
        });
      }
    } else {
      await ctx.db.patch(user._id, {
        ...syncedFields,
        updatedAt: now,
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

    // Check if there's already a pending invite for this email
    const existingInvite = await ctx.db
      .query("pendingInvites")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingInvite && existingInvite.status === "pending") {
      return { success: false, message: "Pending invite already exists for this email" };
    }

    try {
      const inviteId = await ctx.db.insert("pendingInvites", {
        email: args.email,
        roleId: args.roleId,
        propertyId: args.propertyId,
        invitedBy: authContext.user._id,
        clerkInvitationId: args.clerkInvitationId,
        status: "pending",
        createdAt: Date.now(),
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
    console.log('getPendingInvites called with args:', args);
    await requirePermission(ctx, "users.read", args.propertyId);

    try {
      console.log('Fetching pending invites from database...');
      let invites;
      if (args.propertyId) {
        console.log('Filtering by propertyId:', args.propertyId);
        invites = await ctx.db
          .query("pendingInvites")
          .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId!))
          .collect();
      } else {
        console.log('Fetching all pending invites (no property filter)');
        invites = await ctx.db.query("pendingInvites").collect();
      }

      console.log('Found raw invites:', invites.length, invites);

      // Enrich with role and inviter information
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

      console.log('Enriched invites:', enrichedInvites.length, enrichedInvites);
      return { success: true, data: enrichedInvites };
    } catch (error) {
      console.error('Failed to fetch pending invites:', error);
      return { success: false, data: [], message: "Failed to fetch pending invites" };
    }
  },
});

export const updateInviteStatus = mutation({
  args: {
    inviteId: v.id("pendingInvites"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("revoked")),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "users.update");

    try {
      await ctx.db.patch(args.inviteId, { status: args.status });
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
    const pendingInvite = await ctx.db
      .query("pendingInvites")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!pendingInvite || pendingInvite.status !== "pending") {
      return { success: false, message: "No pending invite found" };
    }

    try {
      // Create the user role assignment
      await ctx.db.insert("userRoles", {
        userId: args.userId,
        roleId: pendingInvite.roleId,
        propertyId: pendingInvite.propertyId,
        assignedAt: Date.now(),
        assignedBy: pendingInvite.invitedBy,
      });

      // Update the invite status
      await ctx.db.patch(pendingInvite._id, { status: "accepted" });

      return { success: true, message: "Pending invite fulfilled successfully" };
    } catch (error) {
      console.log(`Failed to fulfill pending invite: ${error}`);
      return { success: false, message: "Failed to fulfill pending invite" };
    }
  },
});
