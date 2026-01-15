import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getAllRatePlans = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      const ratePlans = await ctx.db
        .query('ratePlans')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();
      
      // Fetch related room type data for each rate plan
      const ratePlansWithDetails = await Promise.all(
        ratePlans.map(async (ratePlan) => {
          const roomType = await ctx.db.get(ratePlan.roomTypeId);
          return {
            ...ratePlan,
            roomType,
          };
        })
      );
      
      return { success: true, data: ratePlansWithDetails };
    } catch (error) {
      console.log(`Failed to fetch rate plans: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch rate plans' };
    }
  },
});

export const getRatePlan = query({
  args: { ratePlanId: v.id('ratePlans') },
  handler: async (ctx, args) => {
    try {
      const ratePlan = await ctx.db.get(args.ratePlanId);
      if (!ratePlan) {
        return { success: false, data: null, message: 'Rate plan not found' };
      }
      
      // Fetch related room type
      const roomType = await ctx.db.get(ratePlan.roomTypeId);
      
      return { 
        success: true, 
        data: {
          ...ratePlan,
          roomType,
        }
      };
    } catch (error) {
      console.log(`Failed to fetch rate plan: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch rate plan' };
    }
  },
});

export const createRatePlan = mutation({
  args: {
    propertyId: v.id('properties'),
    roomTypeId: v.id('roomTypes'),
    name: v.string(),
    description: v.optional(v.string()),
    baseRate: v.number(),
    discountPercent: v.optional(v.number()),
    validFrom: v.number(),
    validTo: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      // Validate dates
      if (args.validTo <= args.validFrom) {
        return { success: false, message: 'Valid to date must be after valid from date' };
      }

      // Validate discount percent
      if (args.discountPercent !== undefined && (args.discountPercent < 0 || args.discountPercent > 100)) {
        return { success: false, message: 'Discount percent must be between 0 and 100' };
      }

      // Verify room type exists and belongs to property
      const roomType = await ctx.db.get(args.roomTypeId);
      if (!roomType) {
        return { success: false, message: 'Room type does not exist' };
      }

      if (roomType.propertyId !== args.propertyId) {
        return { success: false, message: 'Room type does not belong to this property' };
      }

      // Check for overlapping rate plans with same name for same room type
      const existingRatePlan = await ctx.db
        .query('ratePlans')
        .withIndex('by_roomTypeId', (q) => q.eq('roomTypeId', args.roomTypeId))
        .filter((q) =>
          q.and(
            q.eq(q.field('propertyId'), args.propertyId),
            q.eq(q.field('name'), args.name),
            q.eq(q.field('isActive'), true)
          )
        )
        .first();

      if (existingRatePlan) {
        return { success: false, message: 'An active rate plan with this name already exists for this room type' };
      }

      const now = Date.now();
      const ratePlanId = await ctx.db.insert('ratePlans', {
        propertyId: args.propertyId,
        roomTypeId: args.roomTypeId,
        name: args.name,
        description: args.description,
        baseRate: args.baseRate,
        discountPercent: args.discountPercent,
        validFrom: args.validFrom,
        validTo: args.validTo,
        isActive: args.isActive,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, message: 'Rate plan created successfully', id: ratePlanId };
    } catch (error) {
      console.log(`Failed to create rate plan: ${error}`);
      return { success: false, message: 'Failed to create rate plan' };
    }
  },
});

export const updateRatePlan = mutation({
  args: {
    ratePlanId: v.id('ratePlans'),
    roomTypeId: v.id('roomTypes'),
    name: v.string(),
    description: v.optional(v.string()),
    baseRate: v.number(),
    discountPercent: v.optional(v.number()),
    validFrom: v.number(),
    validTo: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      const existingRatePlan = await ctx.db.get(args.ratePlanId);
      if (!existingRatePlan) {
        return { success: false, message: 'Rate plan not found' };
      }

      // Validate dates
      if (args.validTo <= args.validFrom) {
        return { success: false, message: 'Valid to date must be after valid from date' };
      }

      // Validate discount percent
      if (args.discountPercent !== undefined && (args.discountPercent < 0 || args.discountPercent > 100)) {
        return { success: false, message: 'Discount percent must be between 0 and 100' };
      }

      // Verify room type exists and belongs to property
      const roomType = await ctx.db.get(args.roomTypeId);
      if (!roomType) {
        return { success: false, message: 'Room type does not exist' };
      }

      if (roomType.propertyId !== existingRatePlan.propertyId) {
        return { success: false, message: 'Room type does not belong to this property' };
      }

      // Check for overlapping rate plans with same name (excluding current one)
      if (args.name !== existingRatePlan.name || args.roomTypeId !== existingRatePlan.roomTypeId) {
        const duplicateRatePlan = await ctx.db
          .query('ratePlans')
          .withIndex('by_roomTypeId', (q) => q.eq('roomTypeId', args.roomTypeId))
          .filter((q) =>
            q.and(
              q.neq(q.field('_id'), args.ratePlanId),
              q.eq(q.field('propertyId'), existingRatePlan.propertyId),
              q.eq(q.field('name'), args.name),
              q.eq(q.field('isActive'), true)
            )
          )
          .first();

        if (duplicateRatePlan) {
          return { success: false, message: 'An active rate plan with this name already exists for this room type' };
        }
      }

      const now = Date.now();
      await ctx.db.patch(args.ratePlanId, {
        roomTypeId: args.roomTypeId,
        name: args.name,
        description: args.description,
        baseRate: args.baseRate,
        discountPercent: args.discountPercent,
        validFrom: args.validFrom,
        validTo: args.validTo,
        isActive: args.isActive,
        updatedAt: now,
      });

      return { success: true, message: 'Rate plan updated successfully' };
    } catch (error) {
      console.log(`Failed to update rate plan: ${error}`);
      return { success: false, message: 'Failed to update rate plan' };
    }
  },
});

export const deleteRatePlan = mutation({
  args: { ratePlanId: v.id('ratePlans') },
  handler: async (ctx, args) => {
    try {
      const existingRatePlan = await ctx.db.get(args.ratePlanId);
      if (!existingRatePlan) {
        return { success: false, message: 'Rate plan not found' };
      }

      await ctx.db.delete(args.ratePlanId);
      return { success: true, message: 'Rate plan deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete rate plan: ${error}`);
      return { success: false, message: 'Failed to delete rate plan' };
    }
  },
});
