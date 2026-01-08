import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getAllRooms = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      const rooms = await ctx.db
        .query('rooms')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();
      
      // Fetch room types for each room
      const roomsWithTypes = await Promise.all(
        rooms.map(async (room) => {
          const roomType = await ctx.db.get(room.roomTypeId);
          return {
            ...room,
            roomType,
          };
        })
      );
      
      return { success: true, data: roomsWithTypes };
    } catch (error) {
      console.log(`Failed to fetch rooms: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch rooms' };
    }
  },
});

export const getRoom = query({
  args: { roomId: v.id('rooms') },
  handler: async (ctx, args) => {
    try {
      const room = await ctx.db.get(args.roomId);
      if (!room) {
        return { success: false, data: null, message: 'Room not found' };
      }
      
      // Fetch related data
      const roomType = await ctx.db.get(room.roomTypeId);
      
      return { success: true, data: { ...room, roomType } };
    } catch (error) {
      console.log(`Failed to fetch room: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch room' };
    }
  },
});

export const createRoom = mutation({
  args: {
    propertyId: v.id('properties'),
    roomTypeId: v.id('roomTypes'),
    roomNumber: v.string(),
    floor: v.number(),
    status: v.union(v.literal("available"), v.literal("occupied"), v.literal("out-of-order"), v.literal("maintenance")),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      // Check if room number already exists for this property
      const existingRoom = await ctx.db
        .query('rooms')
        .withIndex('by_propertyId_roomNumber', (q) =>
          q.eq('propertyId', args.propertyId).eq('roomNumber', args.roomNumber)
        )
        .first();

      if (existingRoom) {
        return { success: false, message: 'Room number already exists for this property' };
      }

      // Verify room type exists
      const roomType = await ctx.db.get(args.roomTypeId);
      if (!roomType) {
        return { success: false, message: 'Room type does not exist' };
      }

      const now = Date.now();
      const roomId = await ctx.db.insert('rooms', {
        propertyId: args.propertyId,
        roomTypeId: args.roomTypeId,
        roomNumber: args.roomNumber,
        floor: args.floor,
        status: args.status,
        notes: args.notes,
        isActive: args.isActive,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, message: 'Room created successfully', id: roomId };
    } catch (error) {
      console.log(`Failed to create room: ${error}`);
      return { success: false, message: 'Failed to create room' };
    }
  },
});

export const updateRoom = mutation({
  args: {
    roomId: v.id('rooms'),
    roomTypeId: v.id('roomTypes'),
    roomNumber: v.string(),
    floor: v.optional(v.number()),
    status: v.union(v.literal("available"), v.literal("occupied"), v.literal("out-of-order"), v.literal("maintenance")),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      const existingRoom = await ctx.db.get(args.roomId);

      if (!existingRoom) {
        return { success: false, message: 'Room does not exist' };
      }

      // Check if room number is being changed and if new number already exists
      if (args.roomNumber !== existingRoom.roomNumber) {
        const duplicateRoom = await ctx.db
          .query('rooms')
          .withIndex('by_propertyId_roomNumber', (q) =>
            q.eq('propertyId', existingRoom.propertyId).eq('roomNumber', args.roomNumber)
          )
          .first();

        if (duplicateRoom) {
          return { success: false, message: 'Room number already exists for this property' };
        }
      }

      // Verify room type exists
      const roomType = await ctx.db.get(args.roomTypeId);
      if (!roomType) {
        return { success: false, message: 'Room type does not exist' };
      }

      const now = Date.now();
      await ctx.db.patch(args.roomId, {
        roomTypeId: args.roomTypeId,
        roomNumber: args.roomNumber,
        floor: args.floor,
        status: args.status,
        notes: args.notes,
        isActive: args.isActive,
        updatedAt: now,
      });

      return { success: true, message: 'Room updated successfully' };
    } catch (error) {
      console.log(`Failed to update room: ${error}`);
      return { success: false, message: 'Failed to update room' };
    }
  },
});

export const deleteRoom = mutation({
  args: { roomId: v.id('rooms') },
  handler: async (ctx, args) => {
    try {
      const existingRoom = await ctx.db.get(args.roomId);

      if (!existingRoom) {
        return { success: false, message: 'Room does not exist' };
      }

      // Check if room has active reservations
      const activeReservation = await ctx.db
        .query('reservations')
        .withIndex('by_roomId', (q) => q.eq('roomId', args.roomId))
        .filter((q) =>
          q.or(
            q.eq(q.field('status'), 'confirmed'),
            q.eq(q.field('status'), 'checked-in')
          )
        )
        .first();

      if (activeReservation) {
        return { success: false, message: 'Cannot delete room - has active reservations' };
      }

      await ctx.db.delete(args.roomId);
      return { success: true, message: 'Room deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete room: ${error}`);
      return { success: false, message: 'Failed to delete room' };
    }
  },
});

