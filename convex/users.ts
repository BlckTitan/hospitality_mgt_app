import { internalMutation, query, QueryCtx } from "./_generated/server";
import { UserJSON } from "@clerk/backend";
import { v, Validator } from "convex/values";

const now = Date.now();

export const getAllUsers = query({
  args: { propertyId: v.optional(v.id('properties')) },
  handler: async (ctx, args) => {
    try {
      let usersQuery = ctx.db.query('users');
      if (args.propertyId) {
        usersQuery = usersQuery.filter((q: any) => q.eq(q.field('propertyId'), args.propertyId));
      }
      const users = await usersQuery.collect();
      return { success: true, data: users };
    } catch (error) {
      console.log(`Failed to fetch users: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch users' };
    }
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
  async handler(ctx, { data }) {
    const userAttributes = {
      name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
      externalId: data.id,
      email: data.email_addresses[0]?.email_address ?? "",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const user = await userByExternalId(ctx, data.id);
    if (user === null) {
      await ctx.db.insert("users", userAttributes);
    } else {
      await ctx.db.patch(user._id, userAttributes);
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

async function userByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
    .unique();
}

export const getUserByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db
        .query("users")
        .withIndex("byExternalId", (q: any) => q.eq("externalId", args.externalId))
        .unique();
      
      if (!user) {
        return { success: false, data: null, message: 'User not found' };
      }
      
      return { success: true, data: user };
    } catch (error) {
      console.log(`Failed to fetch user by external ID: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch user' };
    }
  },
});