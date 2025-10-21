import { mutation, query } from './_generated/server';
import { v } from 'convex/values';


export const getAllStaffs = query({
    args: {},
    handler: async (ctx) => {
      const staffs = await ctx.db.query('staffs').collect()
      return staffs;
    }
});

export const getStaff = query({
  args: {staff_id: v.id('staffs')},
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staff_id)
    return staff;
  }
});

export const createStaff = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    DoB: v.string(),
    state_of_origin: v.string(),
    salary: v.number(),
    employment_status: v.union(v.literal("employed"), v.literal("terminated")),
    LGA: v.string(),
    address: v.string(),
    date_recruited: v.string(),
    date_terminated: v.optional(v.string()),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('staffs', args);
  },
});
export const updateStaff = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    DoB: v.string(),
    state_of_origin: v.string(),
    salary: v.number(),
    employment_status: v.union(v.literal("employed"), v.literal("terminated")),
    LGA: v.string(),
    address: v.string(),
    date_recruited: v.string(),
    date_terminated: v.optional(v.string()),
    role: v.string(),
  },

  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('staffs')
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        salary: args.salary,
        employment_status: args.employment_status,
        phone: args.phone,
        DoB: args.DoB,
        state_of_origin: args.state_of_origin,
        address: args.address,
        LGA: args.LGA,
      });
    }
  },
});

export const removeStaff = mutation({
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('staffs')
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});