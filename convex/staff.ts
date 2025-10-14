import { mutation, query } from './_generated/server';
import { v } from 'convex/values';


export const get = query({
    args: {},
    handler: async (ctx) => {
      const customers = await ctx.db.query('users').collect()
      return customers;
    }
});

export const create = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    username: v.string(),
    passwordHash: v.string(),
    phone: v.number(),
    employed: v.number(),
    terminated: v.number(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("staff"), v.literal("accountant")),
    createdAt: v.number(),
    updatedAt: v.number(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('staffs', args);
  },
});
export const update = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.string(),
    passwordHash: v.string(),
    phone: v.number(),
    employed: v.number(),
    terminated: v.number(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("staff"), v.literal("accountant")),
    updatedAt: v.number(),
    metadata: v.optional(v.any()),
  },

  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('staffs')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        updatedAt: args.updatedAt,
        metadata: args.metadata,
      });
    }
  },
});

export const remove = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('staffs')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});