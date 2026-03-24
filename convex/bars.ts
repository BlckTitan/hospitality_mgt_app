import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getBars = query({
  args: { propertyId: v.optional(v.id('properties')) },
  handler: async (ctx, args) => {
    try {
      let barsQuery = ctx.db.query('bars');
      if (args.propertyId) {
        barsQuery = barsQuery.filter((q: any) => q.eq(q.field('propertyId'), args.propertyId));
      }
      const bars = await barsQuery.collect();
      return { success: true, data: bars };
    } catch (error) {
      console.log(`Failed to fetch bars: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch bars' };
    }
  },
});

export const getBar = query({
  args: { barId: v.id('bars'), propertyId: v.optional(v.id('properties')) },
  handler: async (ctx, args) => {
    try {
      const bar = await ctx.db.get(args.barId);
      if (!bar) {
        return { success: false, data: null, message: 'Bar not found' };
      }
      if (args.propertyId && bar.propertyId !== args.propertyId) {
        return { success: false, data: null, message: 'Bar does not belong to the specified property' };
      }
      return { success: true, data: bar };
    } catch (error) {
      console.log(`Failed to fetch bar: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch bar' };
    }
  },
});

export const createBar = mutation({
  args: {
    propertyId: v.id('properties'),
    name: v.string(),
    location: v.string(),
    barType: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      // Check if bar with same name already exists for this property
      const existingBar = await ctx.db
        .query('bars')
        .filter((q: any) => q.eq(q.field('propertyId'), args.propertyId))
        .filter((q: any) => q.eq(q.field('name'), args.name))
        .first();

      if (existingBar) {
        return { success: false, message: 'Bar with this name already exists for this property' };
      }

      const barId = await ctx.db.insert('bars', args);
      return { success: true, data: barId, message: 'Bar created successfully' };
    } catch (error) {
      console.log(`Failed to create bar: ${error}`);
      return { success: false, message: 'Failed to create bar' };
    }
  },
});

export const updateBar = mutation({
  args: {
    barId: v.id('bars'),
    propertyId: v.optional(v.id('properties')),
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    barType: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      const { barId, ...updates } = args;
      await ctx.db.patch(barId, updates);
      return { success: true, message: 'Bar updated successfully' };
    } catch (error) {
      console.log(`Failed to update bar: ${error}`);
      return { success: false, message: 'Failed to update bar' };
    }
  },
});

export const deleteBar = mutation({
  args: { barId: v.id('bars') },
  handler: async (ctx, args) => {
    try {
      // Soft delete by setting isActive to false
      await ctx.db.patch(args.barId, { isActive: false });
      return { success: true, message: 'Bar deactivated successfully' };
    } catch (error) {
      console.log(`Failed to delete bar: ${error}`);
      return { success: false, message: 'Failed to delete bar' };
    }
  },
});