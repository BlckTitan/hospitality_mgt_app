import { mutation, query, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';
import { posPouredQtyByBarBeverage } from './posOrders';
import { requirePermission } from './lib/rbac';
import { assertCanOperateBar, assignedBarIdsForUser } from './lib/barAssignment';
import { DutyPerson, listOnDutyStaffForBarDate, listOnDutyUsersForDate } from './lib/barDuty';
import {
  computeCogsSnapshot,
  derivedSales,
  findBarDayLog,
  lastFinalizedClosingStock,
  openBarBookLine,
  propertyDateKey,
  refreshSalesSummariesForLog,
  refreshSalesSummariesForLogs,
  resolveBeverageUnitCost,
} from './lib/barStock';

async function presentStockLogs(ctx: QueryCtx, logs: Doc<'userStockLogs'>[]) {
  const dutyByBarDate = new Map<string, DutyPerson[]>();
  for (const log of logs) {
    if (!log.barId) continue;
    const key = `${log.barId}:${log.logDate}`;
    if (dutyByBarDate.has(key)) continue;
    dutyByBarDate.set(
      key,
      await listOnDutyStaffForBarDate(ctx, {
        propertyId: log.propertyId,
        barId: log.barId,
        logDate: log.logDate,
      }),
    );
  }

  return Promise.all(
    logs.map(async (log) => {
      const [shift, beverage, user, bar] = await Promise.all([
        ctx.db.get(log.shiftId),
        ctx.db.get(log.beverageId),
        ctx.db.get(log.userId),
        log.barId ? ctx.db.get(log.barId) : null,
      ]);
      const dutyUsers = log.barId ? (dutyByBarDate.get(`${log.barId}:${log.logDate}`) ?? []) : [];
      return { ...log, shift, beverage, user, bar, dutyUsers };
    }),
  );
}

export const listActiveUsersForBar = query({
  args: {
    propertyId: v.id('properties'),
    barId: v.optional(v.id('bars')),
    logDate: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
    if (args.barId) {
      const bar = await ctx.db.get(args.barId);
      if (!bar || bar.propertyId !== args.propertyId) {
        return { success: false, data: [], message: 'Bar not found for this property' };
      }
    }
    const data = await listOnDutyUsersForDate(ctx, {
      propertyId: args.propertyId,
      barId: args.barId,
      logDate: args.logDate,
    });
    return { success: true, data };
  },
});

export const getAllUserStockLogs = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
    try {
      const userStockLogs = await ctx.db
        .query('userStockLogs')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .order('desc')
        .take(200);
      
      // Fetch related data for each stock log
      const stockLogsWithData = await presentStockLogs(ctx, userStockLogs);
      
      return { success: true, data: stockLogsWithData };
    } catch (error) {
      console.log(`Failed to fetch user stock logs: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch user stock logs' };
    }
  },
});

export const getUserStockLog = query({
  args: { stockLogId: v.id('userStockLogs') },
  handler: async (ctx, args) => {
    const stockLog = await ctx.db.get(args.stockLogId);
    if (!stockLog) {
      return { success: false, data: null, message: 'User stock log not found' };
    }
    await requirePermission(ctx, 'fnb.read', stockLog.propertyId);
    try {
      // Fetch related data using denormalized fields
      const [presented] = await presentStockLogs(ctx, [stockLog]);
      const beverage = presented.beverage
        ? { ...presented.beverage, resolvedUnitCost: await resolveBeverageUnitCost(ctx, presented.beverage) }
        : presented.beverage;

      return {
        success: true,
        data: {
          ...presented,
          beverage,
        },
      };
    } catch (error) {
      console.log(`Failed to fetch user stock log: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch user stock log' };
    }
  },
});

// New query functions for day-scoped lookups as specified in PRD

export const getDailyStockLogs = query({
  args: {
    userId: v.id('users'),
    barId: v.id('bars'),
    logDate: v.string(), // ISO 8601 date string
  },
  handler: async (ctx, args) => {
    const bar = await ctx.db.get(args.barId);
    if (!bar) {
      return { success: false, data: [], message: 'Bar not found' };
    }
    await requirePermission(ctx, 'fnb.read', bar.propertyId);
    try {
      const stockLogs = await ctx.db
        .query('userStockLogs')
        .withIndex('by_userId_barId_date', (q) =>
          q.eq('userId', args.userId).eq('barId', args.barId).eq('logDate', args.logDate)
        )
        .collect();
      
      // Fetch related data
      const stockLogsWithData = await presentStockLogs(ctx, stockLogs);
      
      return { success: true, data: stockLogsWithData };
    } catch (error) {
      console.log(`Failed to fetch daily stock logs: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch daily stock logs' };
    }
  },
});

export const getBarDailyStockLogs = query({
  args: {
    barId: v.id('bars'),
    logDate: v.string(), // ISO 8601 date string
  },
  handler: async (ctx, args) => {
    const bar = await ctx.db.get(args.barId);
    if (!bar) {
      return { success: false, data: [], message: 'Bar not found' };
    }
    await requirePermission(ctx, 'fnb.read', bar.propertyId);
    try {
      const stockLogs = await ctx.db
        .query('userStockLogs')
        .withIndex('by_barId_date', (q) =>
          q.eq('barId', args.barId).eq('logDate', args.logDate)
        )
        .collect();
      
      // Fetch related data
      const stockLogsWithData = await presentStockLogs(ctx, stockLogs);
      
      return { success: true, data: stockLogsWithData };
    } catch (error) {
      console.log(`Failed to fetch bar daily stock logs: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch bar daily stock logs' };
    }
  },
});

export const getPropertyDailyStockLogs = query({
  args: {
    propertyId: v.id('properties'),
    logDate: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
    try {
      const stockLogs = await ctx.db
        .query('userStockLogs')
        .withIndex('by_propertyId_logDate', (q) =>
          q.eq('propertyId', args.propertyId).eq('logDate', args.logDate)
        )
        .collect();

      const stockLogsWithData = await presentStockLogs(ctx, stockLogs);

      return { success: true, data: stockLogsWithData };
    } catch (error) {
      console.log(`Failed to fetch property daily stock logs: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch property daily stock logs' };
    }
  },
});

export const getUserDailyStockLogs = query({
  args: {
    userId: v.id('users'),
    logDate: v.string(), // ISO 8601 date string
  },
  handler: async (ctx, args) => {
    const sampleLog = await ctx.db
      .query('userStockLogs')
      .withIndex('by_userId_date', (q) =>
        q.eq('userId', args.userId).eq('logDate', args.logDate)
      )
      .first();
    if (!sampleLog) {
      await requirePermission(ctx, 'fnb.read');
    } else {
      await requirePermission(ctx, 'fnb.read', sampleLog.propertyId);
    }
    try {
      const stockLogs = await ctx.db
        .query('userStockLogs')
        .withIndex('by_userId_date', (q) =>
          q.eq('userId', args.userId).eq('logDate', args.logDate)
        )
        .collect();
      
      // Fetch related data
      const stockLogsWithData = await presentStockLogs(ctx, stockLogs);
      
      return { success: true, data: stockLogsWithData };
    } catch (error) {
      console.log(`Failed to fetch user daily stock logs: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch user daily stock logs' };
    }
  },
});

export const getBeverageStockHistory = query({
  args: {
    beverageId: v.id('beverages'),
    barId: v.optional(v.id('bars')),
    startDate: v.string(), // ISO 8601 date string
    endDate: v.string(),   // ISO 8601 date string
  },
  handler: async (ctx, args) => {
    const beverage = await ctx.db.get(args.beverageId);
    if (!beverage) {
      return { success: false, data: [], message: 'Beverage not found' };
    }
    if (args.barId) {
      const bar = await ctx.db.get(args.barId);
      if (!bar) {
        return { success: false, data: [], message: 'Bar not found' };
      }
      await requirePermission(ctx, 'fnb.read', bar.propertyId);
    } else {
      await requirePermission(ctx, 'fnb.read', beverage.propertyId);
    }
    try {
      let stockLogs;
      
      if (args.barId) {
        // Get history for specific bar
        stockLogs = await ctx.db
          .query('userStockLogs')
          .withIndex('by_barId_beverage_date', (q) =>
            q.eq('barId', args.barId!).eq('beverageId', args.beverageId)
          )
          .filter((q) => q.gte('logDate', args.startDate) && q.lte('logDate', args.endDate))
          .collect();
      } else {
        // Get history across all bars
        stockLogs = await ctx.db
          .query('userStockLogs')
          .withIndex('by_beverageId', (q) => q.eq('beverageId', args.beverageId))
          .filter((q) => q.gte('logDate', args.startDate) && q.lte('logDate', args.endDate))
          .collect();
      }
      
      // Fetch related data
      const stockLogsWithData = await presentStockLogs(ctx, stockLogs);
      
      return { success: true, data: stockLogsWithData };
    } catch (error) {
      console.log(`Failed to fetch beverage stock history: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch beverage stock history' };
    }
  },
});

export const getUserStockLogsByShift = query({
  args: { shiftId: v.id('shifts') },
  handler: async (ctx, args) => {
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) {
      return { success: false, data: [], message: 'Shift not found' };
    }
    await requirePermission(ctx, 'fnb.read', shift.propertyId);
    try {
      const stockLogs = await ctx.db
        .query('userStockLogs')
        .withIndex('by_shiftId', (q) => q.eq('shiftId', args.shiftId))
        .collect();
      
      // Fetch related data for each stock log
      const stockLogsWithData = await presentStockLogs(ctx, stockLogs);
      
      return { success: true, data: stockLogsWithData };
    } catch (error) {
      console.log(`Failed to fetch user stock logs by shift: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch user stock logs by shift' };
    }
  },
});

export const createUserStockLog = mutation({
  args: {
    propertyId: v.id('properties'),
    shiftId: v.optional(v.id('shifts')),
    userId: v.optional(v.id('users')),
    barId: v.id('bars'),
    beverageId: v.id('beverages'),
    logDate: v.optional(v.string()),
    openingStock: v.optional(v.number()),
    closingStock: v.optional(v.number()),
    wasteQuantity: v.optional(v.number()),
    wasteReason: v.optional(v.string()),
    compQuantity: v.optional(v.number()),
    compReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'fnb.create', args.propertyId);

    const logDate = await propertyDateKey(ctx, args.propertyId);
    const bar = await ctx.db.get(args.barId);
    if (!bar || bar.propertyId !== args.propertyId) {
      return { success: false, message: 'Bar does not exist or does not belong to this property' };
    }
    const beverage = await ctx.db.get(args.beverageId);
    if (!beverage || beverage.propertyId !== args.propertyId || !beverage.isActive) {
      return { success: false, message: 'Beverage does not exist or is inactive' };
    }

    const openingStock =
      args.openingStock ??
      (await lastFinalizedClosingStock(ctx, {
        barId: args.barId,
        beverageId: args.beverageId,
        beforeDate: logDate,
      }));
    const existing = await findBarDayLog(ctx, args.barId, args.beverageId, logDate);
    if (existing) {
      return { success: false, message: 'This drink is already on the bar today' };
    }
    const unitCost = await resolveBeverageUnitCost(ctx, beverage);
    const stockLogId = await openBarBookLine(ctx, {
      propertyId: args.propertyId,
      barId: args.barId,
      beverageId: args.beverageId,
      logDate,
      operatorUserId: auth.user._id,
      openingStock,
      unitCost,
      unitPrice: beverage.unitPrice,
      closingStock: args.closingStock,
      wasteQuantity: args.wasteQuantity,
      wasteReason: args.wasteReason,
      compQuantity: args.compQuantity,
      compReason: args.compReason,
    });
    await refreshSalesSummariesForLog(ctx, {
      propertyId: args.propertyId,
      barId: args.barId,
      userId: auth.user._id,
      beverageId: args.beverageId,
      logDate,
      salesQuantity: 0,
      salesValue: 0,
      cogsValue: 0,
      wasteQuantity: args.wasteQuantity ?? 0,
      compQuantity: args.compQuantity ?? 0,
    });
    return { success: true, message: 'Opened this drink on the bar', id: stockLogId };
  },
});

export const updateUserStockLog = mutation({
  args: {
    stockLogId: v.id('userStockLogs'),
    openingStock: v.number(),
    closingStock: v.number(),
    wasteQuantity: v.optional(v.number()),
    wasteReason: v.optional(v.string()),
    compQuantity: v.optional(v.number()),
    compReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingLog = await ctx.db.get(args.stockLogId);
    if (!existingLog) {
      return { success: false, message: 'User stock log does not exist' };
    }
    await requirePermission(ctx, 'fnb.update', existingLog.propertyId);

    try {
      // Check if log is finalized
      if (existingLog.isFinalized) {
        return { success: false, message: 'Cannot update finalized stock log' };
      }

      // Get beverage for unit price calculation
      const beverage = await ctx.db.get(existingLog.beverageId);
      if (!beverage) {
        return { success: false, message: 'Associated beverage does not exist' };
      }

      // Calculate derived fields (newStockReceived remains unchanged)
      const totalStock = args.openingStock + existingLog.newStockReceived;
      let sales;
      try {
        sales = derivedSales(
          totalStock,
          args.closingStock,
          beverage.unitPrice,
          await resolveBeverageUnitCost(ctx, beverage),
          args.wasteQuantity ?? existingLog.wasteQuantity,
          args.compQuantity ?? existingLog.compQuantity,
        );
      } catch (error: any) {
        return { success: false, message: error?.message || 'Closing stock cannot be greater than total stock' };
      }

      await ctx.db.patch(args.stockLogId, {
        openingStock: args.openingStock,
        totalStock,
        closingStock: args.closingStock,
        ...sales,
        ...(args.wasteReason !== undefined ? { wasteReason: args.wasteReason } : {}),
        ...(args.compReason !== undefined ? { compReason: args.compReason } : {}),
        lastUpdatedAt: Date.now(),
      });
      await refreshSalesSummariesForLog(ctx, {
        ...existingLog,
        salesQuantity: sales.salesQuantity,
        salesValue: sales.salesValue,
        cogsValue: sales.cogsValue,
        wasteQuantity: sales.wasteQuantity,
        compQuantity: sales.compQuantity,
      });

      return { success: true, message: 'User stock log updated successfully' };
    } catch (error) {
      console.log(`Failed to update user stock log: ${error}`);
      return { success: false, message: 'Failed to update user stock log' };
    }
  },
});

export const deleteUserStockLog = mutation({
  args: { stockLogId: v.id('userStockLogs') },
  handler: async (ctx, args) => {
    const existingLog = await ctx.db.get(args.stockLogId);
    if (!existingLog) {
      return { success: false, message: 'User stock log does not exist' };
    }
    await requirePermission(ctx, 'fnb.delete', existingLog.propertyId);

    try {
      if (existingLog.isFinalized) {
        return { success: false, message: 'Cannot delete finalized stock log' };
      }

      await ctx.db.delete(args.stockLogId);
      await refreshSalesSummariesForLog(ctx, {
        ...existingLog,
        salesQuantity: 0,
        salesValue: 0,
        cogsValue: 0,
        wasteQuantity: 0,
        compQuantity: 0,
      });
      return { success: true, message: 'User stock log deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete user stock log: ${error}`);
      return { success: false, message: 'Failed to delete user stock log' };
    }
  },
});

// New mutation for finalizing stock logs
export const finalizeUserStockLog = mutation({
  args: { stockLogId: v.id('userStockLogs') },
  handler: async (ctx, args) => {
    const existingLog = await ctx.db.get(args.stockLogId);
    if (!existingLog) {
      return { success: false, message: 'User stock log does not exist' };
    }
    await requirePermission(ctx, 'fnb.update', existingLog.propertyId);

    try {
      // Check if already finalized
      if (existingLog.isFinalized) {
        return { success: false, message: 'Stock log is already finalized' };
      }

      const cogs = await computeCogsSnapshot(ctx, existingLog);
      await ctx.db.patch(args.stockLogId, {
        isFinalized: true,
        ...cogs,
        lastUpdatedAt: Date.now(),
      });
      await refreshSalesSummariesForLog(ctx, {
        ...existingLog,
        ...cogs,
      });

      return { success: true, message: 'User stock log finalized successfully' };
    } catch (error) {
      console.log(`Failed to finalize user stock log: ${error}`);
      return { success: false, message: 'Failed to finalize user stock log' };
    }
  },
});

// New mutation for updating stock when issued from store (called by storeTransactions)
export const getMyTodayStock = query({
  args: {
    propertyId: v.id('properties'),
    barId: v.optional(v.id('bars')),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'fnb.read', args.propertyId);
    const logDate = await propertyDateKey(ctx, args.propertyId);

    const scope = await assignedBarIdsForUser(ctx, auth, args.propertyId);
    const bars = (
      await ctx.db
        .query('bars')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect()
    ).filter((bar) => bar.isActive && (scope === 'all' || scope.includes(bar._id)));
    const targetIds = args.barId
      ? bars.some((bar) => bar._id === args.barId)
        ? [args.barId]
        : []
      : bars.map((bar) => bar._id);
    const logs: Doc<'userStockLogs'>[] = [];
    for (const barId of targetIds) {
      const rows = await ctx.db
        .query('userStockLogs')
        .withIndex('by_barId_date', (q) => q.eq('barId', barId).eq('logDate', logDate))
        .collect();
      const grouped = new Map<Id<'beverages'>, typeof rows>();
      for (const row of rows) {
        const list = grouped.get(row.beverageId) ?? [];
        list.push(row);
        grouped.set(row.beverageId, list);
      }
      for (const group of grouped.values()) {
        const book = group.find((row) => row.holder === 'bar');
        if (book) logs.push(book);
        else if (group.length === 1) logs.push(group[0]);
      }
    }

    const poured = await posPouredQtyByBarBeverage(ctx, {
      propertyId: args.propertyId,
      barId: targetIds.length === 1 ? targetIds[0] : undefined,
      dateKey: logDate,
    });

    const stockLogsWithData = await Promise.all(
      logs.map(async (log) => {
        const [beverage, bar] = await Promise.all([
          ctx.db.get(log.beverageId),
          log.barId ? ctx.db.get(log.barId) : null,
        ]);
        const posQuantity = log.barId ? (poured.get(`${log.barId}:${log.beverageId}`) ?? 0) : 0;
        return { ...log, beverage, bar, posQuantity };
      }),
    );

    const beverages = await ctx.db
      .query('beverages')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();

    return {
      success: true,
      data: {
        logDate,
        userId: auth.user._id,
        logs: stockLogsWithData,
        beverages: beverages.filter((row) => row.isActive),
        bars,
      },
    };
  },
});

export const addMyTodayBeverage = mutation({
  args: {
    propertyId: v.id('properties'),
    barId: v.id('bars'),
    beverageId: v.id('beverages'),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'fnb.create', args.propertyId);
    const logDate = await propertyDateKey(ctx, args.propertyId);
    const bar = await ctx.db.get(args.barId);
    if (!bar || bar.propertyId !== args.propertyId) {
      return { success: false, message: 'Bar does not exist or does not belong to this property' };
    }
    const beverage = await ctx.db.get(args.beverageId);
    if (!beverage || beverage.propertyId !== args.propertyId || !beverage.isActive) {
      return { success: false, message: 'Beverage does not exist or is inactive' };
    }

    const denied = await assertCanOperateBar(ctx, auth, args.barId);
    if (denied) return { success: false, message: denied };

    const existingLog = await findBarDayLog(ctx, args.barId, args.beverageId, logDate);
    if (existingLog) {
      return { success: false, message: 'This beverage is already on the bar today' };
    }

    const openingStock = await lastFinalizedClosingStock(ctx, {
      barId: args.barId,
      beverageId: args.beverageId,
      beforeDate: logDate,
    });
    const stockLogId = await openBarBookLine(ctx, {
      propertyId: args.propertyId,
      barId: args.barId,
      beverageId: args.beverageId,
      logDate,
      operatorUserId: auth.user._id,
      openingStock,
      unitCost: await resolveBeverageUnitCost(ctx, beverage),
      unitPrice: beverage.unitPrice,
    });
    await refreshSalesSummariesForLog(ctx, {
      propertyId: args.propertyId,
      barId: args.barId,
      userId: auth.user._id,
      beverageId: args.beverageId,
      logDate,
      salesQuantity: 0,
      salesValue: 0,
      cogsValue: 0,
    });

    return { success: true, message: 'Beverage added to today\'s log', id: stockLogId };
  },
});

const AUTOFILL_BATCH = 30;

export const autofillMyToday = mutation({
  args: {
    propertyId: v.id('properties'),
    barId: v.id('bars'),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'fnb.create', args.propertyId);
    const denied = await assertCanOperateBar(ctx, auth, args.barId);
    if (denied) return { success: false as const, message: denied, added: 0 };
    const logDate = await propertyDateKey(ctx, args.propertyId);
    const bar = await ctx.db.get(args.barId);
    if (!bar || bar.propertyId !== args.propertyId || !bar.isActive) {
      return { success: false as const, message: 'Bar does not exist or does not belong to this property' };
    }

    const todayRows = await ctx.db
      .query('userStockLogs')
      .withIndex('by_barId_date', (q) => q.eq('barId', args.barId).eq('logDate', logDate))
      .collect();
    if (todayRows.some((log) => log.holder === 'bar' && log.isFinalized)) {
      return { success: false as const, message: 'Today is already finalized for this bar' };
    }

    const already = new Set(
      todayRows.filter((log) => log.holder === 'bar').map((log) => log.beverageId),
    );
    const beverages = await ctx.db
      .query('beverages')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    const candidates: Array<{ beverageId: Id<'beverages'>; closingStock: number }> = [];
    for (const beverage of beverages) {
      if (!beverage.isActive || already.has(beverage._id)) continue;
      const closingStock = await lastFinalizedClosingStock(ctx, {
        barId: args.barId,
        beverageId: beverage._id,
        beforeDate: logDate,
      });
      if (closingStock > 0) candidates.push({ beverageId: beverage._id, closingStock });
    }
    if (candidates.length === 0) {
      return already.size > 0
        ? { success: true as const, message: 'Carry-over drinks are already on today\'s log', added: 0 }
        : {
            success: false as const,
            message: 'No carry-over stock found for this bar. Add a beverage manually.',
            added: 0,
          };
    }

    const inserted: Array<{
      propertyId: Id<'properties'>;
      barId: Id<'bars'>;
      userId: Id<'users'>;
      beverageId: Id<'beverages'>;
      logDate: string;
      salesQuantity: number;
      salesValue: number;
      cogsValue: number;
      wasteQuantity: number;
      compQuantity: number;
    }> = [];
    let considered = 0;
    for (const candidate of candidates) {
      if (inserted.length >= AUTOFILL_BATCH) break;
      considered += 1;
      const beverage = await ctx.db.get(candidate.beverageId);
      if (!beverage) continue;
      await openBarBookLine(ctx, {
        propertyId: args.propertyId,
        barId: args.barId,
        beverageId: candidate.beverageId,
        logDate,
        operatorUserId: auth.user._id,
        openingStock: candidate.closingStock,
        unitCost: await resolveBeverageUnitCost(ctx, beverage),
        unitPrice: beverage.unitPrice,
      });
      inserted.push({
        propertyId: args.propertyId,
        barId: args.barId,
        userId: auth.user._id,
        beverageId: candidate.beverageId,
        logDate,
        salesQuantity: 0,
        salesValue: 0,
        cogsValue: 0,
        wasteQuantity: 0,
        compQuantity: 0,
      });
    }
    await refreshSalesSummariesForLogs(ctx, inserted);

    const remaining = candidates.length - considered;
    const added = inserted.length;
    if (added === 0) {
      return {
        success: false as const,
        message: 'No active carry-over drinks to add. Add a beverage manually.',
        added: 0,
      };
    }
    const drinkLabel = added === 1 ? '1 carry-over drink' : `${added} carry-over drinks`;
    const message =
      remaining > 0
        ? `Added ${drinkLabel}. ${remaining} more still to add — run Autofill again.`
        : `Added ${drinkLabel}`;
    return { success: true as const, message, added };
  },
});

export const saveMyClosingStock = mutation({
  args: {
    stockLogId: v.id('userStockLogs'),
    closingStock: v.number(),
    wasteQuantity: v.optional(v.number()),
    wasteReason: v.optional(v.string()),
    compQuantity: v.optional(v.number()),
    compReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingLog = await ctx.db.get(args.stockLogId);
    if (!existingLog) {
      return { success: false, message: 'User stock log does not exist' };
    }
    const auth = await requirePermission(ctx, 'fnb.update', existingLog.propertyId);
    if (!existingLog.barId) {
      return { success: false, message: 'This stock row is not on a bar' };
    }
    const denied = await assertCanOperateBar(ctx, auth, existingLog.barId);
    if (denied) return { success: false, message: denied };
    const today = await propertyDateKey(ctx, existingLog.propertyId);
    if (existingLog.logDate !== today) {
      return { success: false, message: 'You can only update today\'s stock log' };
    }
    if (existingLog.isFinalized) {
      return { success: false, message: 'Cannot update finalized stock log' };
    }
    if (args.closingStock < 0) {
      return { success: false, message: 'Closing stock cannot be negative' };
    }

    const beverage = await ctx.db.get(existingLog.beverageId);
    if (!beverage) {
      return { success: false, message: 'Associated beverage does not exist' };
    }
    let sales;
    try {
      sales = derivedSales(
        existingLog.totalStock,
        args.closingStock,
        beverage.unitPrice,
        await resolveBeverageUnitCost(ctx, beverage),
        args.wasteQuantity ?? existingLog.wasteQuantity,
        args.compQuantity ?? existingLog.compQuantity,
      );
    } catch (error: any) {
      return { success: false, message: error?.message || 'Closing stock cannot be greater than total stock' };
    }
    await ctx.db.patch(args.stockLogId, {
      closingStock: args.closingStock,
      ...sales,
      ...(args.wasteReason !== undefined ? { wasteReason: args.wasteReason } : {}),
      ...(args.compReason !== undefined ? { compReason: args.compReason } : {}),
      lastUpdatedAt: Date.now(),
    });
    await refreshSalesSummariesForLog(ctx, {
      ...existingLog,
      salesQuantity: sales.salesQuantity,
      salesValue: sales.salesValue,
      cogsValue: sales.cogsValue,
      wasteQuantity: sales.wasteQuantity,
      compQuantity: sales.compQuantity,
    });
    return { success: true, message: 'Closing stock saved' };
  },
});

export const finalizeMyToday = mutation({
  args: {
    propertyId: v.id('properties'),
    barId: v.id('bars'),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'fnb.update', args.propertyId);
    const denied = await assertCanOperateBar(ctx, auth, args.barId);
    if (denied) return { success: false, message: denied };
    const logDate = await propertyDateKey(ctx, args.propertyId);
    const rows = await ctx.db
      .query('userStockLogs')
      .withIndex('by_barId_date', (q) => q.eq('barId', args.barId).eq('logDate', logDate))
      .collect();
    const grouped = new Map<Id<'beverages'>, typeof rows>();
    for (const row of rows) {
      const list = grouped.get(row.beverageId) ?? [];
      list.push(row);
      grouped.set(row.beverageId, list);
    }
    const logs: Doc<'userStockLogs'>[] = [];
    for (const group of grouped.values()) {
      const book = group.find((row) => row.holder === 'bar');
      if (book) logs.push(book);
      else if (group.length === 1) logs.push(group[0]);
    }

    if (logs.length === 0) {
      return { success: false, message: 'No stock logs to finalize for today' };
    }

    const now = Date.now();
    const finalized: Array<(typeof logs)[number] & { cogsValue: number }> = [];
    for (const log of logs) {
      const cogs = await computeCogsSnapshot(ctx, log);
      if (!log.isFinalized) {
        await ctx.db.patch(log._id, { isFinalized: true, ...cogs, lastUpdatedAt: now });
      } else if (log.cogsValue === undefined || log.unitCostAtSale === undefined) {
        await ctx.db.patch(log._id, { ...cogs, lastUpdatedAt: now });
      }
      finalized.push({ ...log, ...cogs });
    }
    await refreshSalesSummariesForLogs(ctx, finalized);
    return { success: true, message: 'Today\'s stock logs finalized' };
  },
});

