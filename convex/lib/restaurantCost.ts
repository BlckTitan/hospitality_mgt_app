import { MutationCtx, QueryCtx } from '../_generated/server';
import { Id } from '../_generated/dataModel';

type DbCtx = MutationCtx | QueryCtx;

/** Line cost including waste: qty * unitCost * (1 + wastePercent/100). */
export function lineCost(
  qty: number,
  unitCost: number,
  wastePercent?: number | null,
): number {
  const waste = wastePercent ?? 0;
  return qty * unitCost * (1 + waste / 100);
}

/** Sum of recipe line costs (full batch, not per serving). */
export async function calculateRecipeTotalCost(
  ctx: DbCtx,
  recipeId: Id<'recipes'>,
): Promise<number> {
  const lines = await ctx.db
    .query('recipeLines')
    .withIndex('by_recipeId', (q) => q.eq('recipeId', recipeId))
    .collect();

  let total = 0;
  for (const line of lines) {
    const item = await ctx.db.get(line.inventoryItemId);
    const unitCost = item?.unitCost ?? 0;
    total += lineCost(line.quantity, unitCost, line.wastePercent);
  }
  return total;
}

/**
 * Patch recipes.totalCost / lastCalculatedAt and restaurantMenuItems.cost
 * (cost = totalCost / servings).
 */
export async function recalculateRecipeAndMenuItem(
  ctx: MutationCtx,
  recipeId: Id<'recipes'>,
): Promise<{ totalCost: number; menuItemCost: number } | null> {
  const recipe = await ctx.db.get(recipeId);
  if (!recipe) return null;

  const totalCost = await calculateRecipeTotalCost(ctx, recipeId);
  const servings = recipe.servings > 0 ? recipe.servings : 1;
  const menuItemCost = totalCost / servings;
  const now = Date.now();

  await ctx.db.patch(recipeId, {
    totalCost,
    lastCalculatedAt: now,
    updatedAt: now,
  });
  await ctx.db.patch(recipe.menuItemId, {
    cost: menuItemCost,
    updatedAt: now,
  });

  return { totalCost, menuItemCost };
}

/** Find all recipes that use an inventory item and recalculate each. */
export async function recalculateRecipesForInventoryItem(
  ctx: MutationCtx,
  inventoryItemId: Id<'inventoryItems'>,
): Promise<number> {
  const lines = await ctx.db
    .query('recipeLines')
    .withIndex('by_inventoryItemId', (q) => q.eq('inventoryItemId', inventoryItemId))
    .collect();

  const recipeIds = [...new Set(lines.map((line) => line.recipeId))];
  for (const recipeId of recipeIds) {
    await recalculateRecipeAndMenuItem(ctx, recipeId);
  }
  return recipeIds.length;
}
