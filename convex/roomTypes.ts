import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getAllRoomTypes = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      const roomTypes = await ctx.db
        .query('roomTypes')
        .filter((q: any) => q.eq(q.field('propertyId'), args.propertyId))
        .collect();
      return { success: true, data: roomTypes };
    } catch (error) {
      console.log(`Failed to fetch room types: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch room types' };
    }
  },
});

export const getRoomType = query({
  args: { roomTypeId: v.id('roomTypes') },
  handler: async (ctx, args) => {
    try {
      const roomType = await ctx.db.get(args.roomTypeId);
      if (!roomType) {
        return { success: false, data: null, message: 'Room type not found' };
      }
      return { success: true, data: roomType };
    } catch (error) {
      console.log(`Failed to fetch room type: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch room type' };
    }
  },
});

export const createRoomType = mutation({
  args: {
    propertyId: v.id('properties'),
    name: v.string(),
    description: v.optional(v.string()),
    maxOccupancy: v.number(),
    baseRate: v.number(),
    amenities: v.array(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      // Check if room type with same name already exists for this property
      const existingRoomType = await ctx.db
        .query('roomTypes')
        .filter((q: any) => 
          q.and(
            q.eq(q.field('propertyId'), args.propertyId),
            q.eq(q.field('name'), args.name)
          )
        )
        .first();

      if (existingRoomType) {
        return { success: false, message: 'Room type with this name already exists for this property' };
      }

      const now = Date.now();
      const roomTypeId = await ctx.db.insert('roomTypes', {
        propertyId: args.propertyId,
        name: args.name,
        description: args.description,
        maxOccupancy: args.maxOccupancy,
        baseRate: args.baseRate,
        amenities: args.amenities || [],
        isActive: args.isActive,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, message: 'Room type created successfully', id: roomTypeId };
    } catch (error) {
      console.log(`Failed to create room type: ${error}`);
      return { success: false, message: 'Failed to create room type' };
    }
  },
});

export const updateRoomType = mutation({
  args: {
    roomTypeId: v.id('roomTypes'),
    name: v.string(),
    description: v.optional(v.string()),
    maxOccupancy: v.number(),
    baseRate: v.number(),
    amenities: v.array(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      const existingRoomType = await ctx.db.get(args.roomTypeId);

      if (!existingRoomType) {
        return { success: false, message: 'Room type does not exist' };
      }

      // Check if name is being changed and if new name already exists
      if (args.name !== existingRoomType.name) {
        const duplicateName = await ctx.db
          .query('roomTypes')
          .filter((q: any) => 
            q.and(
              q.eq(q.field('propertyId'), existingRoomType.propertyId),
              q.eq(q.field('name'), args.name)
            )
          )
          .first();

        if (duplicateName) {
          return { success: false, message: 'Room type with this name already exists for this property' };
        }
      }

      const now = Date.now();
      await ctx.db.patch(args.roomTypeId, {
        name: args.name,
        description: args.description,
        maxOccupancy: args.maxOccupancy,
        baseRate: args.baseRate,
        amenities: args.amenities || [],
        isActive: args.isActive,
        updatedAt: now,
      });

      return { success: true, message: 'Room type updated successfully' };
    } catch (error) {
      console.log(`Failed to update room type: ${error}`);
      return { success: false, message: 'Failed to update room type' };
    }
  },
});

export const deleteRoomType = mutation({
  args: { roomTypeId: v.id('roomTypes') },
  handler: async (ctx, args) => {
    try {
      const existingRoomType = await ctx.db.get(args.roomTypeId);

      if (!existingRoomType) {
        return { success: false, message: 'Room type does not exist' };
      }

      // Check if any rooms use this room type
      const roomsUsingType = await ctx.db
        .query('rooms')
        .filter((q: any) => q.eq(q.field('roomTypeId'), args.roomTypeId))
        .first();

      if (roomsUsingType) {
        return { success: false, message: 'Cannot delete room type - rooms are using this type' };
      }

      await ctx.db.delete(args.roomTypeId);
      return { success: true, message: 'Room type deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete room type: ${error}`);
      return { success: false, message: 'Failed to delete room type' };
    }
  },
});
