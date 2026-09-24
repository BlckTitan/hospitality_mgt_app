import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';
import { requirePermission } from './lib/rbac';
import { resolveBeverageUnitCost } from './lib/barStock';

const recipeLineValidator = v.object({
  inventoryItemId: v.id('inventoryItems'),
  quantity: v.number(),
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

async function replaceRecipeLines(
  ctx: MutationCtx,
  beverageId: Id<'beverages'>,
  propertyId: Id<'properties'>,
  lines: Array<{ inventoryItemId: Id<'inventoryItems'>; quantity: number; wastePercent?: number }>,
) {
  const existing = await ctx.db
    .query('beverageRecipeLines')
    .withIndex('by_beverageId', (q) => q.eq('beverageId', beverageId))
    .collect();
  for (const row of existing) {
    await ctx.db.delete(row._id);
  }

  for (const line of lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      return { success: false as const, message: 'Recipe line quantity must be greater than 0' };
    }
    if (line.wastePercent !== undefined && (line.wastePercent < 0 || line.wastePercent > 100)) {
      return { success: false as const, message: 'Recipe waste percent must be between 0 and 100' };
    }
    const checked = await validateInventoryItem(ctx, line.inventoryItemId, propertyId);
    if (!checked.success) return checked;
    await ctx.db.insert('beverageRecipeLines', {
      beverageId,
      inventoryItemId: line.inventoryItemId,
      quantity: line.quantity,
      ...(line.wastePercent !== undefined ? { wastePercent: line.wastePercent } : {}),
    });
  }
  return { success: true as const };
}

async function recipeLinesFor(ctx: QueryCtx | MutationCtx, beverageId: Id<'beverages'>) {
  const lines = await ctx.db
    .query('beverageRecipeLines')
    .withIndex('by_beverageId', (q) => q.eq('beverageId', beverageId))
    .collect();
  return await Promise.all(
    lines.map(async (line) => {
      const inventoryItem = await ctx.db.get(line.inventoryItemId);
      return { ...line, inventoryItem };
    }),
  );
}

async function enrichBeverage(ctx: QueryCtx, beverage: Doc<'beverages'>) {
  const [inventoryItem, recipeLines, resolvedUnitCost] = await Promise.all([
    beverage.inventoryItemId ? ctx.db.get(beverage.inventoryItemId) : null,
    recipeLinesFor(ctx, beverage._id),
    resolveBeverageUnitCost(ctx, beverage),
  ]);
  return {
    ...beverage,
    inventoryItem,
    recipeLines,
    resolvedUnitCost,
    costSource: recipeLines.length > 0
      ? 'recipe'
      : beverage.inventoryItemId
        ? 'inventory'
        : beverage.unitCost !== undefined
          ? 'manual'
          : 'none',
  };
}

export const getCostCatalog = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
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
        })),
    };
  },
});

export const getBeverages = query({
  args: { propertyId: v.optional(v.id('properties')) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
    try {
      let beveragesQuery = ctx.db.query('beverages');
      if (args.propertyId) {
        beveragesQuery = beveragesQuery.filter((q: any) => q.eq(q.field('propertyId'), args.propertyId));
      }
      const beverages = await beveragesQuery.collect();
      const data = await Promise.all(beverages.map((beverage) => enrichBeverage(ctx, beverage)));
      return { success: true, data };
    } catch (error) {
      console.log(`Failed to fetch beverages: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch beverages' };
    }
  },
});

export const getAllBeverages = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
    try {
      const beverages = await ctx.db
        .query('beverages')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();
      const data = await Promise.all(beverages.map((beverage) => enrichBeverage(ctx, beverage)));
      return { success: true, data };
    } catch (error) {
      console.log(`Failed to fetch beverages: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch beverages' };
    }
  },
});

export const getBeverage = query({
  args: { beverageId: v.id('beverages'), propertyId: v.optional(v.id('properties')) },
  handler: async (ctx, args) => {
    const beverage = await ctx.db.get(args.beverageId);
    if (!beverage) {
      return { success: false, data: null, message: 'Beverage not found' };
    }
    await requirePermission(ctx, 'fnb.read', args.propertyId ?? beverage.propertyId);
    try {
      if (args.propertyId && beverage.propertyId !== args.propertyId) {
        return { success: false, data: null, message: 'Beverage does not belong to the specified property' };
      }
      return { success: true, data: await enrichBeverage(ctx, beverage) };
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
    category: v.union(v.literal("spirits"), v.literal("wine"), v.literal("Lager beer"), v.literal("cocktails"), v.literal("non-alcoholic"), v.literal("liqueurs"), v.literal("whiskey"), v.literal("vodka"), v.literal("rum"), v.literal("gin"), v.literal("tequila"), v.literal("brandy"), v.literal("cognac"), v.literal("champagne"), v.literal("other")),
    unitOfMeasure: v.string(),
    unitPrice: v.number(),
    unitCost: v.optional(v.number()),
    inventoryItemId: v.optional(v.id('inventoryItems')),
    recipeLines: v.optional(v.array(recipeLineValidator)),
    reorderLevel: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.create', args.propertyId);
    try {
      const existingBeverage = await ctx.db
        .query('beverages')
        .filter((q: any) => q.eq(q.field('propertyId'), args.propertyId))
        .filter((q: any) => q.eq(q.field('name'), args.name))
        .first();

      if (existingBeverage) {
        return { success: false, message: 'Beverage with this name already exists for this property' };
      }

      if (args.inventoryItemId) {
        const checked = await validateInventoryItem(ctx, args.inventoryItemId, args.propertyId);
        if (!checked.success) return checked;
      }

      const { unitCost, inventoryItemId, recipeLines, ...rest } = args;
      const beverageId = await ctx.db.insert('beverages', {
        ...rest,
        ...(unitCost !== undefined ? { unitCost } : {}),
        ...(inventoryItemId ? { inventoryItemId } : {}),
      });
      if (recipeLines) {
        const replaced = await replaceRecipeLines(ctx, beverageId, args.propertyId, recipeLines);
        if (!replaced.success) return replaced;
      }
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
    category: v.optional(v.union(v.literal("spirits"), v.literal("wine"), v.literal("Lager beer"), v.literal("cocktails"), v.literal("non-alcoholic"), v.literal("liqueurs"), v.literal("whiskey"), v.literal("vodka"), v.literal("rum"), v.literal("gin"), v.literal("tequila"), v.literal("brandy"), v.literal("cognac"), v.literal("champagne"), v.literal("other"))),
    unitOfMeasure: v.optional(v.string()),
    unitPrice: v.optional(v.number()),
    unitCost: v.optional(v.number()),
    inventoryItemId: v.optional(v.union(v.id('inventoryItems'), v.null())),
    recipeLines: v.optional(v.array(recipeLineValidator)),
    reorderLevel: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const beverage = await ctx.db.get(args.beverageId);
    if (!beverage) {
      return { success: false, message: 'Beverage not found' };
    }
    await requirePermission(ctx, 'fnb.update', args.propertyId ?? beverage.propertyId);
    try {
      if (args.inventoryItemId) {
        const checked = await validateInventoryItem(ctx, args.inventoryItemId, beverage.propertyId);
        if (!checked.success) return checked;
      }
      const { beverageId, recipeLines, inventoryItemId, ...updates } = args;
      await ctx.db.patch(beverageId, {
        ...updates,
        ...(inventoryItemId ? { inventoryItemId } : {}),
      });
      if (recipeLines) {
        const replaced = await replaceRecipeLines(ctx, beverageId, beverage.propertyId, recipeLines);
        if (!replaced.success) return replaced;
      }
      return { success: true, message: 'Beverage updated successfully' };
    } catch (error) {
      console.log(`Failed to update beverage: ${error}`);
      return { success: false, message: 'Failed to update beverage' };
    }
  },
});

export const getPropertyWithCurrency = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
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

export const deleteBeverage = mutation({
  args: { beverageId: v.id('beverages') },
  handler: async (ctx, args) => {
    const beverage = await ctx.db.get(args.beverageId);
    if (!beverage) {
      return { success: false, message: 'Beverage not found' };
    }
    await requirePermission(ctx, 'fnb.delete', beverage.propertyId);
    try {
      await ctx.db.patch(args.beverageId, { isActive: false });
      return { success: true, message: 'Beverage deactivated successfully' };
    } catch (error) {
      console.log(`Failed to delete beverage: ${error}`);
      return { success: false, message: 'Failed to delete beverage' };
    }
  },
});
