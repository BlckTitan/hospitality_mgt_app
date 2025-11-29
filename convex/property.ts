import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const listProperties = query({
  handler: async (ctx) => {
    try {
      const properties = await ctx.db.query('properties').collect();
      return { success: true, data: properties };
    } catch (error) {
      console.log(`Failed to fetch properties: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch properties' };
    }
  },
});

export const getProperty = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      const property = await ctx.db.get(args.propertyId);
      if (!property) {
        return { success: false, data: null, message: 'Property not found' };
      }
      return { success: true, data: property };
    } catch (error) {
      console.log(`Failed to fetch property: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch property' };
    }
  },
});

export const createProperty = mutation({
  args: {
    name: v.string(),
    address: v.optional(v.string()),
    contactNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    timezone: v.optional(v.string()),
    currency: v.optional(v.string()),
    taxId: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      // Check if property with same name already exists
      const existingProperty = await ctx.db
        .query('properties')
        .filter((q: any) => q.eq(q.field('name'), args.name))
        .first();

      if (existingProperty) {
        return { success: false, message: 'Property with this name already exists' };
      }

      // Check if email is already used
      if (args.email) {
        const existingEmail = await ctx.db
          .query('properties')
          .filter((q: any) => q.eq(q.field('email'), args.email))
          .first();

        if (existingEmail) {
          return { success: false, message: 'Email is already in use' };
        }
      }

      const propertyId = await ctx.db.insert('properties', {
        name: args.name,
        address: args.address,
        contactNumber: args.contactNumber,
        email: args.email,
        timezone: args.timezone || 'UTC',
        currency: args.currency || 'USD',
        taxId: args.taxId,
        isActive: args.isActive,
      });

      return { success: true, message: 'Property created successfully', id: propertyId };
    } catch (error) {
      console.log(`Failed to create property: ${error}`);
      return { success: false, message: 'Failed to create property' };
    }
  },
});

export const updateProperty = mutation({
  args: {
    id: v.id('properties'),
    name: v.string(),
    address: v.optional(v.string()),
    contactNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    timezone: v.optional(v.string()),
    currency: v.optional(v.string()),
    taxId: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      const existingProperty = await ctx.db.get(args.id);

      if (!existingProperty) {
        return { success: false, message: 'Property does not exist' };
      }

      // Check if name is being changed and if new name already exists
      if (args.name !== existingProperty.name) {
        const duplicateName = await ctx.db
          .query('properties')
          .filter((q: any) => q.eq(q.field('name'), args.name))
          .first();

        if (duplicateName) {
          return { success: false, message: 'Property with this name already exists' };
        }
      }

      // Check if email is being changed and if new email already exists
      if (args.email && args.email !== existingProperty.email) {
        const duplicateEmail = await ctx.db
          .query('properties')
          .filter((q: any) => q.eq(q.field('email'), args.email))
          .first();

        if (duplicateEmail) {
          return { success: false, message: 'Email is already in use' };
        }
      }

      await ctx.db.patch(args.id, {
        name: args.name,
        address: args.address,
        contactNumber: args.contactNumber,
        email: args.email,
        timezone: args.timezone,
        currency: args.currency,
        taxId: args.taxId,
        isActive: args.isActive,
      });

      return { success: true, message: 'Property updated successfully' };
    } catch (error) {
      console.log(`Failed to update property: ${error}`);
      return { success: false, message: 'Failed to update property' };
    }
  },
});

export const deleteProperty = mutation({
  args: { id: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      const property = await ctx.db.get(args.id);

      if (!property) {
        return { success: false, message: 'Property does not exist' };
      }

      await ctx.db.delete(args.id);
      return { success: true, message: 'Property deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete property: ${error}`);
      return { success: false, message: 'Failed to delete property' };
    }
  },
});
