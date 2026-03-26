import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getAllShifts = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      const shifts = await ctx.db
        .query('shifts')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();
      
      // Fetch related data (users and bars) for each shift
      const shiftsWithDetails = await Promise.all(
        shifts.map(async (shift) => {
          const user = await ctx.db.get(shift.userId);
          const bar = await ctx.db.get(shift.barId);
          return {
            ...shift,
            user,
            bar,
          };
        })
      );
      
      return { success: true, data: shiftsWithDetails };
    } catch (error) {
      console.log(`Failed to fetch shifts: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch shifts' };
    }
  },
});

export const getShift = query({
  args: { shiftId: v.id('shifts') },
  handler: async (ctx, args) => {
    try {
      const shift = await ctx.db.get(args.shiftId);
      if (!shift) {
        return { success: false, data: null, message: 'Shift not found' };
      }
      
      // Fetch related data
      const user = await ctx.db.get(shift.userId);
      const bar = await ctx.db.get(shift.barId);
      
      return { success: true, data: { ...shift, user, bar } };
    } catch (error) {
      console.log(`Failed to fetch shift: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch shift' };
    }
  },
});

export const createShift = mutation({
  args: {
    propertyId: v.id('properties'),
    userId: v.id('users'),
    barId: v.id('bars'),
    shiftDate: v.string(),
    startTime: v.string(),
    endTime: v.optional(v.string()),
    isFinalized: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      // Validate that the user exists and is active
      const user = await ctx.db.get(args.userId);
      if (!user || !user.isActive) {
        return { success: false, message: 'User not found or inactive' };
      }

      // Validate that the bar exists and is active
      const bar = await ctx.db.get(args.barId);
      if (!bar || !bar.isActive) {
        return { success: false, message: 'Bar not found or inactive' };
      }

      // Check if user already has an active shift for the same date and bar
      const existingShift = await ctx.db
        .query('shifts')
        .withIndex('by_userId_date', (q) => 
          q.eq('userId', args.userId).eq('shiftDate', args.shiftDate)
        )
        .filter((q) => q.eq(q.field('barId'), args.barId))
        .filter((q) => q.eq(q.field('isFinalized'), false))
        .first();

      if (existingShift) {
        return { success: false, message: 'User already has an active shift for this date and bar' };
      }

      const shiftId = await ctx.db.insert('shifts', args);
      return { success: true, data: shiftId, message: 'Shift created successfully' };
    } catch (error) {
      console.log(`Failed to create shift: ${error}`);
      return { success: false, message: 'Failed to create shift' };
    }
  },
});

export const updateShift = mutation({
  args: {
    shiftId: v.id('shifts'),
    userId: v.optional(v.id('users')),
    barId: v.optional(v.id('bars')),
    shiftDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    isFinalized: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      const existingShift = await ctx.db.get(args.shiftId);
      if (!existingShift) {
        return { success: false, message: 'Shift not found' };
      }

      // Don't allow updating finalized shifts
      if (existingShift.isFinalized) {
        return { success: false, message: 'Cannot update finalized shift' };
      }

      const { shiftId, ...updates } = args;
      
      // Validate user if provided
      if (updates.userId) {
        const user = await ctx.db.get(updates.userId);
        if (!user || !user.isActive) {
          return { success: false, message: 'User not found or inactive' };
        }
      }

      // Validate bar if provided
      if (updates.barId) {
        const bar = await ctx.db.get(updates.barId);
        if (!bar || !bar.isActive) {
          return { success: false, message: 'Bar not found or inactive' };
        }
      }

      await ctx.db.patch(shiftId, updates);
      return { success: true, message: 'Shift updated successfully' };
    } catch (error) {
      console.log(`Failed to update shift: ${error}`);
      return { success: false, message: 'Failed to update shift' };
    }
  },
});

export const deleteShift = mutation({
  args: { shiftId: v.id('shifts') },
  handler: async (ctx, args) => {
    try {
      const shift = await ctx.db.get(args.shiftId);
      
      if (!shift) {
        return { success: false, message: 'Shift not found' };
      }

      // Don't allow deleting finalized shifts
      if (shift.isFinalized) {
        return { success: false, message: 'Cannot delete finalized shift' };
      }

      await ctx.db.delete(args.shiftId);
      return { success: true, message: 'Shift deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete shift: ${error}`);
      return { success: false, message: 'Failed to delete shift' };
    }
  },
});

export const finalizeShift = mutation({
  args: { shiftId: v.id('shifts') },
  handler: async (ctx, args) => {
    try {
      const shift = await ctx.db.get(args.shiftId);
      
      if (!shift) {
        return { success: false, message: 'Shift not found' };
      }

      if (shift.isFinalized) {
        return { success: false, message: 'Shift is already finalized' };
      }

      // Set end time to current time if not provided
      const updates = {
        isFinalized: true,
        endTime: shift.endTime || new Date().toLocaleTimeString('en-US', { hour12: false }),
      };

      await ctx.db.patch(args.shiftId, updates);
      return { success: true, message: 'Shift finalized successfully' };
    } catch (error) {
      console.log(`Failed to finalize shift: ${error}`);
      return { success: false, message: 'Failed to finalize shift' };
    }
  },
});

// Helper functions for dropdown data
export const getActiveUsers = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      const users = await ctx.db
        .query('users')
        .filter((q) => q.eq(q.field('isActive'), true))
        .collect();
      
      return { success: true, data: users };
    } catch (error) {
      console.log(`Failed to fetch users: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch users' };
    }
  },
});

export const getActiveBars = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      const bars = await ctx.db
        .query('bars')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .filter((q) => q.eq(q.field('isActive'), true))
        .collect();
      
      return { success: true, data: bars };
    } catch (error) {
      console.log(`Failed to fetch bars: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch bars' };
    }
  },
});
