import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getAllRecipes = query({
  args: { menuItemId: v.id('fnbMenuItems') },
  handler: async (ctx, args) => {
    try {
      const recipes = await ctx.db
        .query('recipes')
        .withIndex('by_menuItemId', (q) => q.eq('menuItemId', args.menuItemId))
        .collect();

      return { success: true, data: recipes };
    } catch (error) {
      console.log(`Failed to fetch recipes: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch recipes' };
    }
  },
});

export const getRecipe = query({
  args: { recipeId: v.id('recipes') },
  handler: async (ctx, args) => {
    try {
      const recipe = await ctx.db.get(args.recipeId);
      if (!recipe) {
        return { success: false, data: null, message: 'Recipe not found' };
      }

      // Fetch menu item and recipe lines
      const menuItem = await ctx.db.get(recipe.menuItemId);
      const recipeLines = await ctx.db
        .query('recipeLines')
        .withIndex('by_recipeId', (q) => q.eq('recipeId', args.recipeId))
        .collect();

      return { success: true, data: { ...recipe, menuItem, recipeLines } };
    } catch (error) {
      console.log(`Failed to fetch recipe: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch recipe' };
    }
  },
});

export const createRecipe = mutation({
  args: {
    menuItemId: v.id('fnbMenuItems'),
    name: v.string(),
    servings: v.optional(v.number()),
    instructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Verify menu item exists
      const menuItem = await ctx.db.get(args.menuItemId);
      if (!menuItem) {
        return { success: false, message: 'Menu item does not exist' };
      }

      // Check if recipe already exists for this menu item
      const existingRecipe = await ctx.db
        .query('recipes')
        .withIndex('by_menuItemId', (q) => q.eq('menuItemId', args.menuItemId))
        .first();

      if (existingRecipe) {
        return { success: false, message: 'A recipe already exists for this menu item' };
      }

      const recipeId = await ctx.db.insert('recipes', {
        menuItemId: args.menuItemId,
        name: args.name.trim(),
        servings: args.servings,
        instructions: args.instructions?.trim(),
        totalCost: 0,
        lastCalculatedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return { success: true, data: recipeId, message: 'Recipe created successfully' };
    } catch (error) {
      console.log(`Failed to create recipe: ${error}`);
      return { success: false, message: 'Failed to create recipe' };
    }
  },
});

export const updateRecipe = mutation({
  args: {
    recipeId: v.id('recipes'),
    name: v.string(),
    servings: v.optional(v.number()),
    instructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const recipe = await ctx.db.get(args.recipeId);
      if (!recipe) {
        return { success: false, message: 'Recipe not found' };
      }

      await ctx.db.patch(args.recipeId, {
        name: args.name.trim(),
        servings: args.servings,
        instructions: args.instructions?.trim(),
        updatedAt: Date.now(),
      });

      return { success: true, message: 'Recipe updated successfully' };
    } catch (error) {
      console.log(`Failed to update recipe: ${error}`);
      return { success: false, message: 'Failed to update recipe' };
    }
  },
});

export const deleteRecipe = mutation({
  args: { recipeId: v.id('recipes') },
  handler: async (ctx, args) => {
    try {
      const recipe = await ctx.db.get(args.recipeId);
      if (!recipe) {
        return { success: false, message: 'Recipe not found' };
      }

      // Delete all recipe lines for this recipe
      const recipeLines = await ctx.db
        .query('recipeLines')
        .withIndex('by_recipeId', (q) => q.eq('recipeId', args.recipeId))
        .collect();

      for (const line of recipeLines) {
        await ctx.db.delete(line._id);
      }

      // Delete the recipe
      await ctx.db.delete(args.recipeId);

      return { success: true, message: 'Recipe deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete recipe: ${error}`);
      return { success: false, message: 'Failed to delete recipe' };
    }
  },
});
