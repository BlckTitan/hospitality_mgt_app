import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getAllFnbMenuItems = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      const menuItems = await ctx.db
        .query('fnbMenuItems')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();

      return { success: true, data: menuItems };
    } catch (error) {
      console.log(`Failed to fetch FnB menu items: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch menu items' };
    }
  },
});

export const getFnbMenuItem = query({
  args: { menuItemId: v.id('fnbMenuItems') },
  handler: async (ctx, args) => {
    try {
      const menuItem = await ctx.db.get(args.menuItemId);
      if (!menuItem) {
        return { success: false, data: null, message: 'Menu item not found' };
      }

      return { success: true, data: menuItem };
    } catch (error) {
      console.log(`Failed to fetch menu item: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch menu item' };
    }
  },
});

export const createFnbMenuItem = mutation({
  args: {
    propertyId: v.id('properties'),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    subcategory: v.optional(v.string()),
    price: v.number(),
    cost: v.optional(v.number()),
    isAvailable: v.boolean(),
    imageUrl: v.optional(v.string()),
    preparationTime: v.optional(v.number()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      // Check if menu item with same name already exists for this property
      const existingItem = await ctx.db
        .query('fnbMenuItems')
        .withIndex('by_propertyId', (q) =>
          q.eq('propertyId', args.propertyId)
        )
        .filter((q) => q.eq(q.field('name'), args.name))
        .first();

      if (existingItem) {
        return { success: false, message: 'Menu item with this name already exists for this property' };
      }

      // Verify property exists
      const property = await ctx.db.get(args.propertyId);
      if (!property) {
        return { success: false, message: 'Property does not exist' };
      }

      const menuItemId = await ctx.db.insert('fnbMenuItems', {
        propertyId: args.propertyId,
        name: args.name.trim(),
        description: args.description?.trim(),
        category: args.category.trim(),
        subcategory: args.subcategory?.trim(),
        price: args.price,
        cost: args.cost,
        isAvailable: args.isAvailable,
        imageUrl: args.imageUrl?.trim(),
        preparationTime: args.preparationTime,
        isActive: args.isActive,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return { success: true, data: menuItemId, message: 'Menu item created successfully' };
    } catch (error) {
      console.log(`Failed to create menu item: ${error}`);
      return { success: false, message: 'Failed to create menu item' };
    }
  },
});

export const updateFnbMenuItem = mutation({
  args: {
    menuItemId: v.id('fnbMenuItems'),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    subcategory: v.optional(v.string()),
    price: v.number(),
    cost: v.optional(v.number()),
    isAvailable: v.boolean(),
    imageUrl: v.optional(v.string()),
    preparationTime: v.optional(v.number()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      const menuItem = await ctx.db.get(args.menuItemId);
      if (!menuItem) {
        return { success: false, message: 'Menu item not found' };
      }

      // Check if another menu item with same name exists for this property
      const existingItem = await ctx.db
        .query('fnbMenuItems')
        .withIndex('by_propertyId', (q) =>
          q.eq('propertyId', menuItem.propertyId)
        )
        .filter((q) =>
          q.and(q.eq(q.field('name'), args.name), q.neq(q.field('_id'), args.menuItemId))
        )
        .first();

      if (existingItem) {
        return { success: false, message: 'Another menu item with this name already exists' };
      }

      await ctx.db.patch(args.menuItemId, {
        name: args.name.trim(),
        description: args.description?.trim(),
        category: args.category.trim(),
        subcategory: args.subcategory?.trim(),
        price: args.price,
        cost: args.cost,
        isAvailable: args.isAvailable,
        imageUrl: args.imageUrl?.trim(),
        preparationTime: args.preparationTime,
        isActive: args.isActive,
        updatedAt: Date.now(),
      });

      return { success: true, message: 'Menu item updated successfully' };
    } catch (error) {
      console.log(`Failed to update menu item: ${error}`);
      return { success: false, message: 'Failed to update menu item' };
    }
  },
});

export const deleteFnbMenuItem = mutation({
  args: { menuItemId: v.id('fnbMenuItems') },
  handler: async (ctx, args) => {
    try {
      const menuItem = await ctx.db.get(args.menuItemId);
      if (!menuItem) {
        return { success: false, message: 'Menu item not found' };
      }

      await ctx.db.delete(args.menuItemId);

      return { success: true, message: 'Menu item deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete menu item: ${error}`);
      return { success: false, message: 'Failed to delete menu item' };
    }
  },
});
