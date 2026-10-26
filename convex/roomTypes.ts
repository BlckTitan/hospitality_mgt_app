import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { requirePermission, tryRequirePermission } from './lib/rbac';
import { replaceShortStayRates } from './lib/stays';

const shortStayPriceArgs = v.array(v.object({
  hours: v.number(),
  amount: v.number(),
}));

async function ratesForRoomType(ctx: QueryCtx | MutationCtx, roomTypeId: Id<'roomTypes'>) {
  return await ctx.db
    .query('shortStayRates')
    .withIndex('by_roomTypeId', (q) => q.eq('roomTypeId', roomTypeId))
    .collect();
}

export const getAllRoomTypes = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'rooms.read', args.propertyId);
    try {
      const roomTypes = await ctx.db
        .query('roomTypes')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();
      const withRates = await Promise.all(
        roomTypes.map(async (roomType) => ({
          ...roomType,
          shortStayRates: await ratesForRoomType(ctx, roomType._id),
        })),
      );
      return { success: true, data: withRates };
    } catch (error) {
      console.log(`Failed to fetch room types: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch room types' };
    }
  },
});

export const getRoomType = query({
  args: { roomTypeId: v.id('roomTypes') },
  handler: async (ctx, args) => {
    const roomType = await ctx.db.get(args.roomTypeId);
    if (!roomType) {
      return { success: false, data: null, message: 'Room type not found' };
    }
    await requirePermission(ctx, 'rooms.read', roomType.propertyId);
    try {
      const shortStayRates = await ratesForRoomType(ctx, roomType._id);
      return { success: true, data: { ...roomType, shortStayRates } };
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
    imageUrl: v.optional(v.union(v.string(), v.null())),
    shortStayPrices: v.optional(shortStayPriceArgs),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'rooms.update', args.propertyId);
    try {
      // Check if room type with same name already exists for this property
      const existingRoomType = await ctx.db
        .query('roomTypes')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .filter((q) => q.eq(q.field('name'), args.name))
        .first();

      if (existingRoomType) {
        return { success: false, message: 'Room type with this name already exists for this property' };
      }

      const now = Date.now();
      const trimmedImage = args.imageUrl?.trim();
      const roomTypeId = await ctx.db.insert('roomTypes', {
        propertyId: args.propertyId,
        name: args.name,
        description: args.description,
        maxOccupancy: args.maxOccupancy,
        baseRate: args.baseRate,
        amenities: args.amenities || [],
        isActive: args.isActive,
        ...(trimmedImage ? { imageUrl: trimmedImage } : {}),
        createdAt: now,
        updatedAt: now,
      });

      if (args.shortStayPrices) {
        const priceError = await replaceShortStayRates(ctx, {
          propertyId: args.propertyId,
          roomTypeId,
          prices: args.shortStayPrices,
        });
        if (priceError) {
          await ctx.db.delete(roomTypeId);
          return { success: false, message: priceError };
        }
      }

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
    imageUrl: v.optional(v.union(v.string(), v.null())),
    shortStayPrices: v.optional(shortStayPriceArgs),
  },
  handler: async (ctx, args) => {
    const existingRoomType = await ctx.db.get(args.roomTypeId);

    if (!existingRoomType) {
      return { success: false, message: 'Room type does not exist' };
    }

    await requirePermission(ctx, 'rooms.update', existingRoomType.propertyId);

    try {
      // Check if name is being changed and if new name already exists
      if (args.name !== existingRoomType.name) {
        const duplicateName = await ctx.db
          .query('roomTypes')
          .withIndex('by_propertyId', (q) => q.eq('propertyId', existingRoomType.propertyId))
          .filter((q) => q.eq(q.field('name'), args.name))
          .first();

        if (duplicateName) {
          return { success: false, message: 'Room type with this name already exists for this property' };
        }
      }

      const now = Date.now();
      const imagePatch =
        args.imageUrl === null || args.imageUrl === ''
          ? { imageUrl: undefined }
          : args.imageUrl !== undefined
            ? { imageUrl: args.imageUrl.trim() }
            : {};
      await ctx.db.patch(args.roomTypeId, {
        name: args.name,
        description: args.description,
        maxOccupancy: args.maxOccupancy,
        baseRate: args.baseRate,
        amenities: args.amenities || [],
        isActive: args.isActive,
        ...imagePatch,
        updatedAt: now,
      });

      if (args.shortStayPrices) {
        const priceError = await replaceShortStayRates(ctx, {
          propertyId: existingRoomType.propertyId,
          roomTypeId: args.roomTypeId,
          prices: args.shortStayPrices,
        });
        if (priceError) return { success: false, message: priceError };
      }

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
    const existingRoomType = await ctx.db.get(args.roomTypeId);

    if (!existingRoomType) {
      return { success: false, message: 'Room type does not exist' };
    }

    await requirePermission(ctx, 'rooms.delete', existingRoomType.propertyId);

    try {
      // Check if any rooms use this room type
      const roomsUsingType = await ctx.db
        .query('rooms')
        .withIndex('by_roomTypeId', (q) => q.eq('roomTypeId', args.roomTypeId))
        .first();

      if (roomsUsingType) {
        return { success: false, message: 'Cannot delete room type - rooms are using this type' };
      }

      const rates = await ratesForRoomType(ctx, args.roomTypeId);
      for (const rate of rates) {
        await ctx.db.delete(rate._id);
      }
      await ctx.db.delete(args.roomTypeId);
      return { success: true, message: 'Room type deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete room type: ${error}`);
      return { success: false, message: 'Failed to delete room type' };
    }
  },
});

export const listShortStayRates = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    const canRooms = await tryRequirePermission(ctx, 'rooms.read', args.propertyId);
    const canReservations = await tryRequirePermission(ctx, 'reservations.read', args.propertyId);
    if (!canRooms && !canReservations) {
      return { success: false, data: [], message: 'Unauthorized' };
    }
    const rates = await ctx.db
      .query('shortStayRates')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    return { success: true, data: rates };
  },
});
