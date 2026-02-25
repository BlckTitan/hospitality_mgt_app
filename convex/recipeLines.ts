import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// ============================================
// Recipe Lines (Ingredients) Functions
// ============================================

export const getAllRecipeLines = query({
  args: { 
    recipeId: v.id('recipes'),
    propertyId: v.id('properties'),
  },
  handler: async (ctx, args) => {
    try {
      const recipeLines = await ctx.db
        .query('recipeLines')
        .withIndex('by_recipeId', (q) => q.eq('recipeId', args.recipeId))
        .filter((q) => q.eq(q.field('propertyId'), args.propertyId))
        .collect();

      // Fetch inventory item details for each recipe line
      const recipeLinesWithDetails = await Promise.all(
        recipeLines.map(async (line) => {
          const inventoryItem = await ctx.db.get(line.inventoryItemId);
          return { ...line, inventoryItem };
        })
      );

      return { success: true, data: recipeLinesWithDetails };
    } catch (error) {
      console.log(`Failed to fetch recipe lines: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch recipe lines' };
    }
  },
});

export const getRecipeLine = query({
  args: { 
    recipeLineId: v.id('recipeLines'),
    propertyId: v.id('properties'),
  },
  handler: async (ctx, args) => {
    try {
      const recipeLine = await ctx.db.get(args.recipeLineId);
      if (!recipeLine) {
        return { success: false, data: null, message: 'Recipe line not found' };
      }

      // Verify the recipe line belongs to the property
      if (recipeLine.propertyId !== args.propertyId) {
        return { success: false, data: null, message: 'Unauthorized: Recipe line does not belong to this property' };
      }

      const inventoryItem = await ctx.db.get(recipeLine.inventoryItemId);
      return { success: true, data: { ...recipeLine, inventoryItem } };
    } catch (error) {
      console.log(`Failed to fetch recipe line: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch recipe line' };
    }
  },
});

export const createRecipeLine = mutation({
  args: {
    recipeId: v.id('recipes'),
    propertyId: v.id('properties'),
    inventoryItemId: v.id('inventoryItems'),
    quantity: v.number(),
    unit: v.string(),
    wastePercent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // Verify recipe exists
      const recipe = await ctx.db.get(args.recipeId);
      if (!recipe) {
        return { success: false, message: 'Recipe not found' };
      }

      // Verify property exists
      const property = await ctx.db.get(args.propertyId);
      if (!property) {
        return { success: false, message: 'Property not found' };
      }

      // Verify inventory item exists
      const inventoryItem = await ctx.db.get(args.inventoryItemId);
      if (!inventoryItem) {
        return { success: false, message: 'Inventory item not found' };
      }

      // Check if recipe line already exists
      const existingLine = await ctx.db
        .query('recipeLines')
        .filter((q) => 
          q.and(
            q.eq(q.field('recipeId'), args.recipeId),
            q.eq(q.field('propertyId'), args.propertyId),
            q.eq(q.field('inventoryItemId'), args.inventoryItemId)
          )
        )
        .first();

      if (existingLine) {
        return { success: false, message: 'This ingredient is already added to this recipe' };
      }

      const recipeLineId = await ctx.db.insert('recipeLines', {
        recipeId: args.recipeId,
        propertyId: args.propertyId,
        inventoryItemId: args.inventoryItemId,
        quantity: args.quantity,
        unit: args.unit,
        wastePercent: args.wastePercent || 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return { success: true, data: recipeLineId, message: 'Recipe line created successfully' };
    } catch (error) {
      console.log(`Failed to create recipe line: ${error}`);
      return { success: false, message: 'Failed to create recipe line' };
    }
  },
});

export const updateRecipeLine = mutation({
  args: {
    recipeLineId: v.id('recipeLines'),
    propertyId: v.id('properties'),
    quantity: v.number(),
    unit: v.string(),
    wastePercent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const recipeLine = await ctx.db.get(args.recipeLineId);
      if (!recipeLine) {
        return { success: false, message: 'Recipe line not found' };
      }

      // Verify the recipe line belongs to the property
      if (recipeLine.propertyId !== args.propertyId) {
        return { success: false, message: 'Unauthorized: Recipe line does not belong to this property' };
      }

      await ctx.db.patch(args.recipeLineId, {
        quantity: args.quantity,
        unit: args.unit,
        wastePercent: args.wastePercent || 0,
        updatedAt: Date.now(),
      });

      return { success: true, message: 'Recipe line updated successfully' };
    } catch (error) {
      console.log(`Failed to update recipe line: ${error}`);
      return { success: false, message: 'Failed to update recipe line' };
    }
  },
});

export const deleteRecipeLine = mutation({
  args: { 
    recipeLineId: v.id('recipeLines'),
    propertyId: v.id('properties'),
  },
  handler: async (ctx, args) => {
    try {
      const recipeLine = await ctx.db.get(args.recipeLineId);
      if (!recipeLine) {
        return { success: false, message: 'Recipe line not found' };
      }

      // Verify the recipe line belongs to the property
      if (recipeLine.propertyId !== args.propertyId) {
        return { success: false, message: 'Unauthorized: Recipe line does not belong to this property' };
      }

      await ctx.db.delete(args.recipeLineId);

      return { success: true, message: 'Recipe line deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete recipe line: ${error}`);
      return { success: false, message: 'Failed to delete recipe line' };
    }
  },
});
