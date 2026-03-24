import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getBeverages = query({
  args: { propertyId: v.optional(v.id('properties')) },
  handler: async (ctx, args) => {
    try {
      let beveragesQuery = ctx.db.query('beverages');
      if (args.propertyId) {
        beveragesQuery = beveragesQuery.filter((q: any) => q.eq(q.field('propertyId'), args.propertyId));
      }
      const beverages = await beveragesQuery.collect();
      return { success: true, data: beverages };
    } catch (error) {
      console.log(`Failed to fetch beverages: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch beverages' };
    }
  },
});

export const getBeverage = query({
  args: { beverageId: v.id('beverages'), propertyId: v.optional(v.id('properties')) },
  handler: async (ctx, args) => {
    try {
      const beverage = await ctx.db.get(args.beverageId);
      if (!beverage) {
        return { success: false, data: null, message: 'Beverage not found' };
      }
      if (args.propertyId && beverage.propertyId !== args.propertyId) {
        return { success: false, data: null, message: 'Beverage does not belong to the specified property' };
      }
      return { success: true, data: beverage };
    } catch (error) {
      console.log(`Failed to fetch beverage: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch beverage' };
    }
  },
});

export const createBeverage = mutation({
  args: {
    propertyId: v.id('properties'),
    name: v.string(),
    category: v.string(),
    unitOfMeasure: v.string(),
    unitPrice: v.number(),
    reorderLevel: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      // Check if beverage with same name already exists for this property
      const existingBeverage = await ctx.db
        .query('beverages')
        .filter((q: any) => q.eq(q.field('propertyId'), args.propertyId))
        .filter((q: any) => q.eq(q.field('name'), args.name))
        .first();

      if (existingBeverage) {
        return { success: false, message: 'Beverage with this name already exists for this property' };
      }

      const beverageId = await ctx.db.insert('beverages', args);
      return { success: true, data: beverageId, message: 'Beverage created successfully' };
    } catch (error) {
      console.log(`Failed to create beverage: ${error}`);
      return { success: false, message: 'Failed to create beverage' };
    }
  },
});

export const updateBeverage = mutation({
  args: {
    beverageId: v.id('beverages'),
    propertyId: v.optional(v.id('properties')),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    unitOfMeasure: v.optional(v.string()),
    unitPrice: v.optional(v.number()),
    reorderLevel: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      const { beverageId, ...updates } = args;
      await ctx.db.patch(beverageId, updates);
      return { success: true, message: 'Beverage updated successfully' };
    } catch (error) {
      console.log(`Failed to update beverage: ${error}`);
      return { success: false, message: 'Failed to update beverage' };
    }
  },
});

export const deleteBeverage = mutation({
  args: { beverageId: v.id('beverages') },
  handler: async (ctx, args) => {
    try {
      // Soft delete by setting isActive to false
      await ctx.db.patch(args.beverageId, { isActive: false });
      return { success: true, message: 'Beverage deactivated successfully' };
    } catch (error) {
      console.log(`Failed to delete beverage: ${error}`);
      return { success: false, message: 'Failed to delete beverage' };
    }
  },
});