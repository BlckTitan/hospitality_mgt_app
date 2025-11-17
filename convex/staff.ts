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
      
      const existingStaff = await ctx.db.query('staffs')
      .filter(q => q.eq(q.field('email'), args.email))
      .first()

      if(existingStaff){
        return { success: false, message: "Staff already exists" };
      }

      await ctx.db.insert('staffs', args);
      return { success: true, message: "Staff added successfully" };

    } catch (error) {
      console.log(`Insert failed ${error}`)
      return { success: false, message: "Failed to create new staff!" };
    }
    
  },
});

export const updateStaff = mutation({
  args: {
    id: v.id('staffs'),
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

      const existingStaff = await ctx.db.query('staffs')
      .filter(q => q.eq(q.field('_id'), args.id))
      .first()

      if (existingStaff) {
        await ctx.db.patch(existingStaff._id, {
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
          dateTerminated: args.dateTerminated,
        });

        return { success: true, message: "Staff updated successfully" };

      }else{
        return { success: false, message: "Staff does not exist!" };
      }

    } catch (error) {
      console.log(`Update failed ${error}`)
      return { success: false, message: "Failed to update existing staff data" };
    }
    
  },
});

export const removeStaff = mutation({

  
  args: {id: v.id('staffs')},

  handler: async (ctx, args) => {
    try {
      
      const existingStaff = await ctx.db.query('staffs')
      .filter(q => q.eq(q.field('_id'), args.id))
      .first()

      if (existingStaff) {

        await ctx.db.delete(existingStaff._id);
        return { success: true, message: "Staff removed successfully!" };

      }else{

        return { success: false, message: "Staff does not exist" };

      }

    } catch (error) {

      console.log(`Failed to delete staff record ${error}`)
      return { success: false, message: "Failed to delete staff record" };
      
    }
    
  },

});