import { mutation, query, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { requirePermission, tryRequirePermission } from './lib/rbac';
import { listActiveWaitersAndBartenders } from './lib/serviceStaff';
import {
  derivedSales,
  findBarDayLog,
  openBarBookLine,
  priorStockHandoverBlock,
  propertyDateKey,
  resolveBeverageUnitCost,
} from './lib/barStock';

async function denyBarRead(
  ctx: QueryCtx,
  propertyId?: Id<'properties'>,
): Promise<string | null> {
  const auth = await tryRequirePermission(ctx, 'fnb.read', propertyId);
  if (auth) return null;
  const identity = await ctx.auth.getUserIdentity();
  return identity ? 'Unauthorized' : 'Not authenticated';
}

export const getAllBars = query({
  args: { propertyId: v.optional(v.id('properties')) },
  handler: async (ctx, args) => {
    const denied = await denyBarRead(ctx, args.propertyId);
    if (denied) return { success: false, data: [], message: denied };
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

export const getBars = query({
  args: { propertyId: v.optional(v.id('properties')) },
  handler: async (ctx, args) => {
    const denied = await denyBarRead(ctx, args.propertyId);
    if (denied) return { success: false, data: [], message: denied };
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
    const bar = await ctx.db.get(args.barId);
    if (!bar) {
      return { success: false, data: null, message: 'Bar not found' };
    }
    const denied = await denyBarRead(ctx, args.propertyId ?? bar.propertyId);
    if (denied) return { success: false, data: null, message: denied };
    try {
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
    await requirePermission(ctx, 'fnb.create', args.propertyId);
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
    const bar = await ctx.db.get(args.barId);
    if (!bar) {
      return { success: false, message: 'Bar not found' };
    }
    await requirePermission(ctx, 'fnb.update', args.propertyId ?? bar.propertyId);
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
    const bar = await ctx.db.get(args.barId);
    if (!bar) {
      return { success: false, message: 'Bar not found' };
    }
    await requirePermission(ctx, 'fnb.delete', bar.propertyId);
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

export const listBarOperators = query({
  args: { barId: v.id('bars') },
  handler: async (ctx, args) => {
    const bar = await ctx.db.get(args.barId);
    if (!bar) return { success: false as const, data: [], message: 'Bar not found' };
    const denied = await denyBarRead(ctx, bar.propertyId);
    if (denied) return { success: false as const, data: [], message: denied };
    const rows = await ctx.db
      .query('barAssignments')
      .withIndex('by_barId', (q) => q.eq('barId', args.barId))
      .collect();
    const data = [];
    for (const row of rows.filter((item) => item.isActive)) {
      const user = await ctx.db.get(row.userId);
      if (!user) continue;
      data.push({
        _id: row._id,
        userId: row.userId,
        name: user.name,
        email: user.email,
      });
    }
    data.sort((a, b) => a.name.localeCompare(b.name));
    return { success: true as const, data };
  },
});

export const listBarOperatorChoices = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    const denied = await denyBarRead(ctx, args.propertyId);
    if (denied) return { success: false as const, data: [], message: denied };
    const people = await listActiveWaitersAndBartenders(ctx, args.propertyId);
    return { success: true as const, data: people };
  },
});

export const assignBarOperator = mutation({
  args: { barId: v.id('bars'), userId: v.id('users') },
  handler: async (ctx, args) => {
    const bar = await ctx.db.get(args.barId);
    if (!bar || !bar.isActive) return { success: false, message: 'Bar not found or inactive' };
    await requirePermission(ctx, 'fnb.update', bar.propertyId);
    const people = await listActiveWaitersAndBartenders(ctx, bar.propertyId);
    const person = people.find((row) => row._id === args.userId);
    if (!person) {
      return { success: false, message: 'Link an active waiter or bartender at this property' };
    }
    const user = await ctx.db.get(args.userId);
    const staff = user
      ? await ctx.db
          .query('staffs')
          .withIndex('by_userId', (q) => q.eq('userId', args.userId))
          .first()
      : null;
    const existing = await ctx.db
      .query('barAssignments')
      .withIndex('by_barId_userId', (q) => q.eq('barId', args.barId).eq('userId', args.userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        isActive: true,
        assignedAt: Date.now(),
        ...(staff ? { staffId: staff._id } : {}),
      });
    } else {
      await ctx.db.insert('barAssignments', {
        propertyId: bar.propertyId,
        barId: args.barId,
        userId: args.userId,
        ...(staff ? { staffId: staff._id } : {}),
        isActive: true,
        assignedAt: Date.now(),
      });
    }
    return { success: true, message: `${person.name} can operate ${bar.name}` };
  },
});

export const unassignBarOperator = mutation({
  args: { assignmentId: v.id('barAssignments') },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.assignmentId);
    if (!row) return { success: false, message: 'Link not found' };
    await requirePermission(ctx, 'fnb.update', row.propertyId);
    await ctx.db.patch(row._id, { isActive: false });
    return { success: true, message: 'Removed from this bar. The bar stock stays.' };
  },
});

export const setBarOpeningStock = mutation({
  args: {
    barId: v.id('bars'),
    lines: v.array(v.object({ beverageId: v.id('beverages'), quantity: v.number() })),
  },
  handler: async (ctx, args) => {
    const bar = await ctx.db.get(args.barId);
    if (!bar || !bar.isActive) return { success: false, message: 'Bar not found or inactive' };
    const auth = await requirePermission(ctx, 'fnb.update', bar.propertyId);
    const logDate = await propertyDateKey(ctx, bar.propertyId);
    const blocked = await priorStockHandoverBlock(ctx, {
      barId: args.barId,
      beforeDate: logDate,
      action: "opening today's stock",
    });
    if (blocked) return { success: false, message: blocked };
    let saved = 0;
    const skipped: string[] = [];
    for (const line of args.lines) {
      if (!Number.isFinite(line.quantity) || line.quantity < 0) continue;
      const beverage = await ctx.db.get(line.beverageId);
      if (!beverage || beverage.propertyId !== bar.propertyId || !beverage.isActive) continue;
      const existing = await findBarDayLog(ctx, args.barId, line.beverageId, logDate);
      if (existing?.isFinalized) {
        skipped.push(beverage.name);
        continue;
      }
      if (existing) {
        const totalStock = line.quantity + existing.newStockReceived;
        const counted = existing.closingStock !== existing.totalStock;
        const closingStock = counted ? existing.closingStock : totalStock;
        const unitCost = await resolveBeverageUnitCost(ctx, beverage);
        let sales;
        try {
          sales = derivedSales(
            totalStock,
            closingStock,
            beverage.unitPrice,
            unitCost,
            existing.wasteQuantity,
            existing.compQuantity,
          );
        } catch {
          skipped.push(beverage.name);
          continue;
        }
        await ctx.db.patch(existing._id, {
          holder: 'bar',
          openingStock: line.quantity,
          totalStock,
          closingStock,
          ...sales,
          lastUpdatedAt: Date.now(),
        });
      } else {
        await openBarBookLine(ctx, {
          propertyId: bar.propertyId,
          barId: args.barId,
          beverageId: line.beverageId,
          logDate,
          operatorUserId: auth.user._id,
          openingStock: line.quantity,
          unitCost: await resolveBeverageUnitCost(ctx, beverage),
          unitPrice: beverage.unitPrice,
        });
      }
      saved += 1;
    }
    if (saved === 0) {
      return {
        success: false,
        message: skipped.length
          ? `Today is already finalized for ${skipped.join(', ')}`
          : 'Enter a quantity for at least one drink',
      };
    }
    return {
      success: true,
      message: skipped.length
        ? `Saved opening stock for ${saved} drinks. Skipped finalized: ${skipped.join(', ')}.`
        : `Saved opening stock for ${saved} drinks on ${bar.name}.`,
    };
  },
});
