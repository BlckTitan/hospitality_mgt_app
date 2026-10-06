import { mutation, query, MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { requirePermission } from './lib/rbac';
import { recalculateRecipeAndMenuItem } from './lib/restaurantCost';

const recipeLineInputValidator = v.object({
  inventoryItemId: v.id('inventoryItems'),
  quantity: v.number(),
  unit: v.string(),
  wastePercent: v.optional(v.number()),
});

async function validateInventoryItem(
  ctx: MutationCtx,
  inventoryItemId: Id<'inventoryItems'>,
  propertyId: Id<'properties'>,
) {
  const item = await ctx.db.get(inventoryItemId);
  if (!item || item.propertyId !== propertyId) {
    return { success: false as const, message: 'Inventory item does not belong to this property' };
  }
  return { success: true as const, item };
}

export const listRecipes = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'restaurant.read', args.propertyId);
    const recipes = await ctx.db
      .query('recipes')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();

    const data = await Promise.all(
      recipes.map(async (recipe) => {
        const menuItem = await ctx.db.get(recipe.menuItemId);
        return { ...recipe, menuItem };
      }),
    );
    data.sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, data };
  },
});

export const getRecipe = query({
  args: { recipeId: v.id('recipes') },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.recipeId);
    if (!recipe) {
      return { success: false, data: null, message: 'Recipe not found' };
    }
    await requirePermission(ctx, 'restaurant.read', recipe.propertyId);

    const [menuItem, rawLines] = await Promise.all([
      ctx.db.get(recipe.menuItemId),
      ctx.db
        .query('recipeLines')
        .withIndex('by_recipeId', (q) => q.eq('recipeId', args.recipeId))
        .collect(),
    ]);

    const lines = await Promise.all(
      rawLines.map(async (line) => {
        const inventoryItem = await ctx.db.get(line.inventoryItemId);
        return { ...line, inventoryItem };
      }),
    );

    return {
      success: true,
      data: { ...recipe, menuItem, lines },
    };
  },
});

export const upsertRecipeForMenuItem = mutation({
  args: {
    propertyId: v.id('properties'),
    menuItemId: v.id('restaurantMenuItems'),
    name: v.string(),
    servings: v.number(),
    instructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'restaurant.update', args.propertyId);

    const menuItem = await ctx.db.get(args.menuItemId);
    if (!menuItem || menuItem.propertyId !== args.propertyId) {
      return { success: false, message: 'Menu item not found for this property' };
    }

    const name = args.name.trim();
    if (!name) {
      return { success: false, message: 'Recipe name is required' };
    }
    if (!Number.isFinite(args.servings) || args.servings <= 0) {
      return { success: false, message: 'Servings must be greater than 0' };
    }

    const existing = await ctx.db
      .query('recipes')
      .withIndex('by_menuItemId', (q) => q.eq('menuItemId', args.menuItemId))
      .first();

    const now = Date.now();
    if (existing) {
      if (existing.propertyId !== args.propertyId) {
        return { success: false, message: 'Recipe does not belong to this property' };
      }
      await ctx.db.patch(existing._id, {
        name,
        servings: args.servings,
        instructions: args.instructions?.trim() || undefined,
        updatedAt: now,
      });
      await recalculateRecipeAndMenuItem(ctx, existing._id);
      return {
        success: true,
        data: { recipeId: existing._id },
        message: 'Recipe updated',
      };
    }

    const recipeId = await ctx.db.insert('recipes', {
      propertyId: args.propertyId,
      menuItemId: args.menuItemId,
      name,
      servings: args.servings,
      instructions: args.instructions?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, data: { recipeId }, message: 'Recipe created' };
  },
});

export const replaceRecipeLines = mutation({
  args: {
    recipeId: v.id('recipes'),
    lines: v.array(recipeLineInputValidator),
  },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.recipeId);
    if (!recipe) {
      return { success: false, message: 'Recipe not found' };
    }
    await requirePermission(ctx, 'restaurant.update', recipe.propertyId);

    const existing = await ctx.db
      .query('recipeLines')
      .withIndex('by_recipeId', (q) => q.eq('recipeId', args.recipeId))
      .collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    const now = Date.now();
    for (const line of args.lines) {
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        return { success: false, message: 'Recipe line quantity must be greater than 0' };
      }
      if (
        line.wastePercent !== undefined &&
        (line.wastePercent < 0 || line.wastePercent > 100)
      ) {
        return { success: false, message: 'Recipe waste percent must be between 0 and 100' };
      }
      const unit = line.unit.trim();
      if (!unit) {
        return { success: false, message: 'Recipe line unit is required' };
      }
      const checked = await validateInventoryItem(ctx, line.inventoryItemId, recipe.propertyId);
      if (!checked.success) return checked;

      await ctx.db.insert('recipeLines', {
        recipeId: args.recipeId,
        inventoryItemId: line.inventoryItemId,
        quantity: line.quantity,
        unit,
        ...(line.wastePercent !== undefined ? { wastePercent: line.wastePercent } : {}),
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.recipeId, { updatedAt: now });
    await recalculateRecipeAndMenuItem(ctx, args.recipeId);
    return { success: true, message: 'Recipe lines replaced' };
  },
});

export const recalculateRecipe = mutation({
  args: { recipeId: v.id('recipes') },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.recipeId);
    if (!recipe) {
      return { success: false, message: 'Recipe not found' };
    }
    await requirePermission(ctx, 'restaurant.update', recipe.propertyId);

    const result = await recalculateRecipeAndMenuItem(ctx, args.recipeId);
    if (!result) {
      return { success: false, message: 'Recipe not found' };
    }
    return {
      success: true,
      data: result,
      message: 'Recipe cost recalculated',
    };
  },
});

/** Minimal inventory catalog for recipe builders (restaurant.read only). */
export const listInventoryForRecipes = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'restaurant.read', args.propertyId);
    const items = await ctx.db
      .query('inventoryItems')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    return {
      success: true,
      data: items
        .filter((item) => item.isActive)
        .map((item) => ({
          _id: item._id,
          name: item.name,
          sku: item.sku,
          unit: item.unit,
          unitCost: item.unitCost,
          isActive: item.isActive,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  },
});
