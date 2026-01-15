import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getAllGuests = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      const guests = await ctx.db
        .query('guests')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();
      
      return { success: true, data: guests };
    } catch (error) {
      console.log(`Failed to fetch guests: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch guests' };
    }
  },
});

export const getGuest = query({
  args: { guestId: v.id('guests') },
  handler: async (ctx, args) => {
    try {
      const guest = await ctx.db.get(args.guestId);
      if (!guest) {
        return { success: false, data: null, message: 'Guest not found' };
      }
      return { success: true, data: guest };
    } catch (error) {
      console.log(`Failed to fetch guest: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch guest' };
    }
  },
});

export const createGuest = mutation({
  args: {
    propertyId: v.id('properties'),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    loyaltyNumber: v.optional(v.string()),
    preferences: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    try {
      const now = Date.now();
      const guestId = await ctx.db.insert('guests', {
        propertyId: args.propertyId,
        firstName: args.firstName,
        lastName: args.lastName,
        email: args.email,
        phone: args.phone,
        address: args.address,
        dateOfBirth: args.dateOfBirth,
        loyaltyNumber: args.loyaltyNumber,
        preferences: args.preferences,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, message: 'Guest created successfully', id: guestId };
    } catch (error) {
      console.log(`Failed to create guest: ${error}`);
      return { success: false, message: 'Failed to create guest' };
    }
  },
});

export const updateGuest = mutation({
  args: {
    guestId: v.id('guests'),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    loyaltyNumber: v.optional(v.string()),
    preferences: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    try {
      const existingGuest = await ctx.db.get(args.guestId);
      if (!existingGuest) {
        return { success: false, message: 'Guest not found' };
      }

      const now = Date.now();
      await ctx.db.patch(args.guestId, {
        firstName: args.firstName,
        lastName: args.lastName,
        email: args.email,
        phone: args.phone,
        address: args.address,
        dateOfBirth: args.dateOfBirth,
        loyaltyNumber: args.loyaltyNumber,
        preferences: args.preferences,
        updatedAt: now,
      });

      return { success: true, message: 'Guest updated successfully' };
    } catch (error) {
      console.log(`Failed to update guest: ${error}`);
      return { success: false, message: 'Failed to update guest' };
    }
  },
});

export const deleteGuest = mutation({
  args: { guestId: v.id('guests') },
  handler: async (ctx, args) => {
    try {
      const existingGuest = await ctx.db.get(args.guestId);
      if (!existingGuest) {
        return { success: false, message: 'Guest not found' };
      }

      // Check if guest has any reservations
      const reservations = await ctx.db
        .query('reservations')
        .withIndex('by_guestId', (q) => q.eq('guestId', args.guestId))
        .collect();

      if (reservations.length > 0) {
        return { success: false, message: 'Cannot delete guest with existing reservations' };
      }

      await ctx.db.delete(args.guestId);
      return { success: true, message: 'Guest deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete guest: ${error}`);
      return { success: false, message: 'Failed to delete guest' };
    }
  },
});
