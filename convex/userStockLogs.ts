import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';
import { posPouredQtyByBarBeverage } from './posOrders';
import { requirePermission, tryRequirePermission } from './lib/rbac';
import { assertCanOperateBar, assignedBarIdsForUser } from './lib/barAssignment';
import { DutyPerson, listOnDutyStaffForBarDate, listOnDutyUsersForDate } from './lib/barDuty';
import {
  computeCogsSnapshot,
  derivedSales,
  findBarDayLog,
  carryOverOpeningStock,
  lastFinalizedClosingStock,
  openBarBookLine,
  openPriorBarBooks,
  previousDateKey,
  priorStockHandoverBlock,
  propertyDateKey,
  refreshSalesSummariesForLog,
  refreshSalesSummariesForLogs,
  resolveBeverageUnitCost,
} from './lib/barStock';

function stockReadFailure(error: unknown, data: null): { success: false; data: null; message: string };
function stockReadFailure(error: unknown): { success: false; data: []; message: string };
function stockReadFailure(error: unknown, data: [] | null = []) {
  return {
    success: false as const,
    data,
    message: error instanceof Error ? error.message : 'Not authenticated',
  };
}

/** Read queries must not throw when the client subscribes before a session exists. */
async function authorizeStockRead(ctx: QueryCtx, propertyId?: Id<'properties'>) {
  try {
    return { auth: await requirePermission(ctx, 'fnb.read', propertyId) };
  } catch (error) {
    return { error };
  }
}

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
    const auth = await tryRequirePermission(ctx, 'fnb.read', args.propertyId);
    if (!auth) {
      const identity = await ctx.auth.getUserIdentity();
      return {
        success: false,
        data: [],
        message: identity ? 'Unauthorized' : 'Not authenticated',
      };
    }
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
    const access = await authorizeStockRead(ctx, args.propertyId);
    if ('error' in access) return stockReadFailure(access.error);
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
    const access = await authorizeStockRead(ctx, stockLog.propertyId);
    if ('error' in access) return stockReadFailure(access.error, null);
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
    const access = await authorizeStockRead(ctx, bar.propertyId);
    if ('error' in access) return stockReadFailure(access.error);
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
    const access = await authorizeStockRead(ctx, bar.propertyId);
    if ('error' in access) return stockReadFailure(access.error);
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
    const access = await authorizeStockRead(ctx, args.propertyId);
    if ('error' in access) return stockReadFailure(access.error);
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
    const access = await authorizeStockRead(ctx, sampleLog?.propertyId);
    if ('error' in access) return stockReadFailure(access.error);
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
      const access = await authorizeStockRead(ctx, bar.propertyId);
      if ('error' in access) return stockReadFailure(access.error);
    } else {
      const access = await authorizeStockRead(ctx, beverage.propertyId);
      if ('error' in access) return stockReadFailure(access.error);
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
    const access = await authorizeStockRead(ctx, shift.propertyId);
    if ('error' in access) return stockReadFailure(access.error);
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
      (await carryOverOpeningStock(ctx, {
        barId: args.barId,
        beverageId: args.beverageId,
        beforeDate: logDate,
      }));
    const existing = await findBarDayLog(ctx, args.barId, args.beverageId, logDate);
    if (existing) {
      return { success: false, message: 'This drink is already on the bar today' };
    }
    const blocked = await priorStockHandoverBlock(ctx, {
      barId: args.barId,
      beforeDate: logDate,
      action: "opening today's stock",
    });
    if (blocked) return { success: false, message: blocked };
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

async function finalizeOpenStockLog(
  ctx: Parameters<typeof refreshSalesSummariesForLog>[0],
  log: Doc<'userStockLogs'>,
  now: number,
) {
  if (log.isFinalized) return null;
  const cogs = await computeCogsSnapshot(ctx, log);
  await ctx.db.patch(log._id, {
    isFinalized: true,
    ...cogs,
    lastUpdatedAt: now,
  });
  return { ...log, ...cogs };
}

// One log at a time. Bulk close uses finalizeUserStockLogs so sales summaries stay inside one transaction.
export const finalizeUserStockLog = mutation({
  args: { stockLogId: v.id('userStockLogs') },
  handler: async (ctx, args) => {
    const existingLog = await ctx.db.get(args.stockLogId);
    if (!existingLog) {
      return { success: false, message: 'User stock log does not exist' };
    }
    await requirePermission(ctx, 'fnb.update', existingLog.propertyId);

    try {
      if (existingLog.isFinalized) {
        return { success: false, message: 'Stock log is already finalized' };
      }

      const finalized = await finalizeOpenStockLog(ctx, existingLog, Date.now());
      if (!finalized) {
        return { success: false, message: 'Stock log is already finalized' };
      }
      await refreshSalesSummariesForLog(ctx, finalized);

      return { success: true, message: 'User stock log finalized successfully' };
    } catch (error) {
      console.log(`Failed to finalize user stock log: ${error}`);
      return { success: false, message: 'Failed to finalize user stock log' };
    }
  },
});

/** Kept small because each log refreshes daily, weekly, monthly, and yearly sales summaries. */
const FINALIZE_BATCH = 15;

export const finalizeUserStockLogs = mutation({
  args: { stockLogIds: v.array(v.id('userStockLogs')) },
  handler: async (ctx, args) => {
    if (args.stockLogIds.length === 0) {
      return { success: false, message: 'No stock logs to finalize', finalized: 0 };
    }

    const logs: Doc<'userStockLogs'>[] = [];
    for (const stockLogId of args.stockLogIds.slice(0, FINALIZE_BATCH)) {
      const log = await ctx.db.get(stockLogId);
      if (log) logs.push(log);
    }
    if (logs.length === 0) {
      return { success: false, message: 'User stock logs do not exist', finalized: 0 };
    }

    const propertyId = logs[0].propertyId;
    if (logs.some((log) => log.propertyId !== propertyId)) {
      return { success: false, message: 'Stock logs must belong to the same property', finalized: 0 };
    }
    await requirePermission(ctx, 'fnb.update', propertyId);

    try {
      const now = Date.now();
      const finalized = [];
      for (const log of logs) {
        const updated = await finalizeOpenStockLog(ctx, log, now);
        if (updated) finalized.push(updated);
      }
      await refreshSalesSummariesForLogs(ctx, finalized);
      const count = finalized.length;
      return {
        success: true,
        message: count === 1 ? '1 stock log finalized' : `${count} stock logs finalized`,
        finalized: count,
      };
    } catch (error) {
      console.log(`Failed to finalize user stock logs: ${error}`);
      return { success: false, message: 'Failed to finalize user stock logs', finalized: 0 };
    }
  },
});

// New mutation for updating stock when issued from store (called by storeTransactions)
export const getMyTodayStock = query({
  args: {
    propertyId: v.id('properties'),
    barId: v.optional(v.id('bars')),
    logDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await authorizeStockRead(ctx, args.propertyId);
    if ('error' in access) return stockReadFailure(access.error, null);
    const auth = access.auth;
    const today = await propertyDateKey(ctx, args.propertyId);
    const requested = args.logDate?.trim() ?? '';
    const logDate =
      /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested <= today ? requested : today;
    const viewingToday = logDate === today;

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

    const priorLogs: Doc<'userStockLogs'>[] = [];
    if (viewingToday) {
      for (const barId of targetIds) {
        priorLogs.push(...(await openPriorBarBooks(ctx, { barId, beforeDate: today })));
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

    const priorLogsWithData = await Promise.all(
      priorLogs.map(async (log) => {
        const [beverage, bar, operator] = await Promise.all([
          ctx.db.get(log.beverageId),
          log.barId ? ctx.db.get(log.barId) : null,
          ctx.db.get(log.userId),
        ]);
        return { ...log, beverage, bar, operatorName: operator?.name?.trim() || 'the previous shift' };
      }),
    );

    const beverages = await ctx.db
      .query('beverages')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();

    return {
      success: true as const,
      data: {
        logDate,
        today,
        userId: auth.user._id,
        logs: stockLogsWithData,
        priorLogs: priorLogsWithData,
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
    const blocked = await priorStockHandoverBlock(ctx, {
      barId: args.barId,
      beforeDate: logDate,
      action: "opening today's stock",
    });
    if (blocked) return { success: false, message: blocked };

    const openingStock = await carryOverOpeningStock(ctx, {
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
    if (denied) return { success: false as const, message: denied, added: 0, remaining: 0 };
    const logDate = await propertyDateKey(ctx, args.propertyId);
    const bar = await ctx.db.get(args.barId);
    if (!bar || bar.propertyId !== args.propertyId || !bar.isActive) {
      return {
        success: false as const,
        message: 'Bar does not exist or does not belong to this property',
        added: 0,
        remaining: 0,
      };
    }

    const todayRows = await ctx.db
      .query('userStockLogs')
      .withIndex('by_barId_date', (q) => q.eq('barId', args.barId).eq('logDate', logDate))
      .collect();
    const blocked = await priorStockHandoverBlock(ctx, {
      barId: args.barId,
      beforeDate: logDate,
      action: "opening today's stock",
    });
    if (blocked) return { success: false as const, message: blocked, added: 0, remaining: 0 };

    if (todayRows.some((log) => log.holder === 'bar' && log.isFinalized)) {
      return { success: false as const, message: 'Today is already finalized for this bar', added: 0, remaining: 0 };
    }

    const already = new Set(
      todayRows.filter((log) => log.holder === 'bar').map((log) => log.beverageId),
    );
    const yesterdayRows = await ctx.db
      .query('userStockLogs')
      .withIndex('by_barId_date', (q) => q.eq('barId', args.barId).eq('logDate', previousDateKey(logDate)))
      .collect();
    const yesterdayByDrink = new Map<Id<'beverages'>, typeof yesterdayRows>();
    for (const row of yesterdayRows) {
      const list = yesterdayByDrink.get(row.beverageId) ?? [];
      list.push(row);
      yesterdayByDrink.set(row.beverageId, list);
    }
    const candidates: Array<{ beverageId: Id<'beverages'>; closingStock: number }> = [];
    if (yesterdayByDrink.size > 0) {
      for (const [beverageId, group] of yesterdayByDrink) {
        if (already.has(beverageId)) continue;
        const book = group.find((row) => row.holder === 'bar') ?? (group.length === 1 ? group[0] : undefined);
        if (!book || book.closingStock <= 0) continue;
        candidates.push({ beverageId, closingStock: book.closingStock });
      }
    } else {
      const beverages = await ctx.db
        .query('beverages')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();
      for (const beverage of beverages) {
        if (!beverage.isActive || already.has(beverage._id)) continue;
        const closingStock = await lastFinalizedClosingStock(ctx, {
          barId: args.barId,
          beverageId: beverage._id,
          beforeDate: logDate,
        });
        if (closingStock > 0) candidates.push({ beverageId: beverage._id, closingStock });
      }
    }
    if (candidates.length === 0) {
      return already.size > 0
        ? { success: true as const, message: 'Carry-over drinks are already on today\'s log', added: 0, remaining: 0 }
        : {
            success: false as const,
            message: 'No carry-over stock found for this bar. Add a beverage manually.',
            added: 0,
            remaining: 0,
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
        remaining: 0,
      };
    }
    const drinkLabel = added === 1 ? '1 drink' : `${added} drinks`;
    const message =
      remaining > 0
        ? `Opened today with yesterday's close for ${drinkLabel}. ${remaining} more still to add.`
        : `Opened today with yesterday's close for ${drinkLabel}`;
    return { success: true as const, message, added, remaining };
  },
});

type ClosingCount = {
  closingStock: number;
  wasteQuantity?: number;
  wasteReason?: string;
  compQuantity?: number;
  compReason?: string;
};

async function prepareClosingCount(
  ctx: MutationCtx,
  log: Doc<'userStockLogs'>,
  args: ClosingCount,
  today: string,
) {
  if (!log.barId) {
    return { ok: false as const, message: 'This stock row is not on a bar' };
  }
  const yesterday = previousDateKey(today);
  const closingPriorDay = log.logDate === yesterday && !log.isFinalized;
  if (log.logDate !== today && !closingPriorDay) {
    return { ok: false as const, message: 'You can only update today\'s stock log, or yesterday while it is still open' };
  }
  if (log.isFinalized) {
    return { ok: false as const, message: 'Cannot update finalized stock log' };
  }
  if (args.closingStock < 0) {
    return { ok: false as const, message: 'Closing stock cannot be negative' };
  }
  const beverage = await ctx.db.get(log.beverageId);
  if (!beverage) {
    return { ok: false as const, message: 'Associated beverage does not exist' };
  }
  try {
    const sales = derivedSales(
      log.totalStock,
      args.closingStock,
      beverage.unitPrice,
      await resolveBeverageUnitCost(ctx, beverage),
      args.wasteQuantity ?? log.wasteQuantity,
      args.compQuantity ?? log.compQuantity,
    );
    return { ok: true as const, sales };
  } catch (error: any) {
    return { ok: false as const, message: error?.message || 'Closing stock cannot be greater than total stock' };
  }
}

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
    const prepared = await prepareClosingCount(ctx, existingLog, args, today);
    if (!prepared.ok) return { success: false, message: prepared.message };

    await ctx.db.patch(args.stockLogId, {
      closingStock: args.closingStock,
      ...prepared.sales,
      ...(args.wasteReason !== undefined ? { wasteReason: args.wasteReason } : {}),
      ...(args.compReason !== undefined ? { compReason: args.compReason } : {}),
      lastUpdatedAt: Date.now(),
    });
    await refreshSalesSummariesForLog(ctx, {
      ...existingLog,
      salesQuantity: prepared.sales.salesQuantity,
      salesValue: prepared.sales.salesValue,
      cogsValue: prepared.sales.cogsValue,
      wasteQuantity: prepared.sales.wasteQuantity,
      compQuantity: prepared.sales.compQuantity,
    });
    return { success: true, message: 'Closing stock saved' };
  },
});

const SAVE_BATCH = 10;

export const saveMyClosingStocks = mutation({
  args: {
    lines: v.array(
      v.object({
        stockLogId: v.id('userStockLogs'),
        closingStock: v.number(),
        wasteQuantity: v.optional(v.number()),
        compQuantity: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    if (args.lines.length === 0) {
      return { success: false, message: 'No stock logs to save', saved: 0 };
    }
    const batch = args.lines.slice(0, SAVE_BATCH);
    const logs: Array<{ log: Doc<'userStockLogs'>; line: (typeof batch)[number] }> = [];
    for (const line of batch) {
      const log = await ctx.db.get(line.stockLogId);
      if (!log) return { success: false, message: 'User stock log does not exist', saved: 0 };
      logs.push({ log, line });
    }
    const propertyId = logs[0].log.propertyId;
    const barId = logs[0].log.barId;
    if (!barId || logs.some(({ log }) => log.propertyId !== propertyId || log.barId !== barId)) {
      return { success: false, message: 'Stock logs must belong to the same bar', saved: 0 };
    }
    const auth = await requirePermission(ctx, 'fnb.update', propertyId);
    const denied = await assertCanOperateBar(ctx, auth, barId);
    if (denied) return { success: false, message: denied, saved: 0 };

    const today = await propertyDateKey(ctx, propertyId);
    const prepared = [];
    for (const { log, line } of logs) {
      const result = await prepareClosingCount(ctx, log, line, today);
      if (!result.ok) return { success: false, message: result.message, saved: 0 };
      prepared.push({ log, line, sales: result.sales });
    }

    const now = Date.now();
    const summaries = [];
    for (const { log, line, sales } of prepared) {
      await ctx.db.patch(log._id, {
        closingStock: line.closingStock,
        ...sales,
        lastUpdatedAt: now,
      });
      summaries.push({
        ...log,
        salesQuantity: sales.salesQuantity,
        salesValue: sales.salesValue,
        cogsValue: sales.cogsValue,
        wasteQuantity: sales.wasteQuantity,
        compQuantity: sales.compQuantity,
      });
    }
    await refreshSalesSummariesForLogs(ctx, summaries);
    const count = prepared.length;
    return {
      success: true,
      message: count === 1 ? '1 stock row saved' : `${count} stock rows saved`,
      saved: count,
    };
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

export const finalizeMyPriorDay = mutation({
  args: {
    propertyId: v.id('properties'),
    barId: v.id('bars'),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'fnb.update', args.propertyId);
    const denied = await assertCanOperateBar(ctx, auth, args.barId);
    if (denied) return { success: false, message: denied };
    const bar = await ctx.db.get(args.barId);
    if (!bar || bar.propertyId !== args.propertyId) {
      return { success: false, message: 'Bar does not exist or does not belong to this property' };
    }
    const today = await propertyDateKey(ctx, args.propertyId);
    const open = await openPriorBarBooks(ctx, { barId: args.barId, beforeDate: today });
    if (open.length === 0) {
      return { success: false, message: "Yesterday's stock is already closed" };
    }

    const now = Date.now();
    const finalized = [];
    for (const log of open) {
      const cogs = await computeCogsSnapshot(ctx, log);
      await ctx.db.patch(log._id, { isFinalized: true, ...cogs, lastUpdatedAt: now });
      finalized.push({ ...log, ...cogs });
    }
    await refreshSalesSummariesForLogs(ctx, finalized);
    return { success: true, message: "Yesterday's stock is closed" };
  },
});

