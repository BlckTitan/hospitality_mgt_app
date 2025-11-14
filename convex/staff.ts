import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

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
    stateOfOrigin: v.string(),
    salary: v.number(),
    employmentStatus: v.union(v.literal("employed"), v.literal("terminated")),
    LGA: v.string(),
    address: v.string(),
    dateRecruited: v.string(),
    dateTerminated: v.optional(v.string()),
    role: v.string(),
  },
  handler: async (ctx, args) => {

    try {
      
      const existingUser = await ctx.db.query('staffs')
      .filter(q => q.eq(q.field('email'), args.email))
      .first()

      if(existingUser){
        return { success: false, message: "User already exists" };
      }

      await ctx.db.insert('staffs', args);
      return { success: true, message: "User added successfully" };

    } catch (error) {
      console.log(`Insert failed ${error}`)
      return { success: false, message: "Failed to create new user!" };
    }
    
  },
});
export const updateStaff = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    DoB: v.string(),
    stateOfOrigin: v.string(),
    salary: v.number(),
    employmentStatus: v.union(v.literal("employed"), v.literal("terminated")),
    LGA: v.string(),
    address: v.string(),
    dateRecruited: v.string(),
    dateTerminated: v.optional(v.string()),
    role: v.string(),
  },

  handler: async (ctx, args) => {

    try {

      const existing = await ctx.db
      .query('staffs')
      .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          email: args.email,
          firstName: args.firstName,
          lastName: args.lastName,
          salary: args.salary,
          employmentStatus: args.employmentStatus,
          phone: args.phone,
          DoB: args.DoB,
          stateOfOrigin: args.stateOfOrigin,
          address: args.address,
          LGA: args.LGA,
        });

      }else{
        return { success: false, message: "User does not exist!" };
      }

    } catch (error) {
      console.log(`Update failed ${error}`)
      return { success: false, message: "Failed to update existing user data" };
    }
    
  },
});

export const removeStaff = mutation({

  
  args: {id: v.id('staffs')},

  handler: async (ctx, args) => {
    try {
      
      const existingUser = await ctx.db.query('staffs')
      .filter(q => q.eq(q.field('_id'), args.id))
      .first()

      if (existingUser) {

        await ctx.db.delete(existingUser._id);
        return { success: true, message: "User removed successfully!" };

      }else{

        return { success: false, message: "User does not exist" };

      }

    } catch (error) {

      console.log(`Failed to delete user record ${error}`)
      return { success: false, message: "Failed to delete user record" };
      
    }
    
  },

});