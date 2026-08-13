import { internalMutation, mutation, query, QueryCtx } from "./_generated/server";
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
      await createUserIfAbsent(ctx, {
        ...syncedFields,
        createdAt: now,
        updatedAt: now,
      });
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
