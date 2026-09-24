import { internalMutation, query, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/rbac';
import {
  currentPeriodKey,
  lastNDailyKeys,
  monthDateKeys,
  percentChange,
  propertyDateKey,
  upsertSalesSummaryDoc,
} from './lib/barStock';
import { Id } from './_generated/dataModel';

async function summariesForPeriod(
  ctx: QueryCtx,
  propertyId: Id<'properties'>,
  periodType: 'daily' | 'weekly' | 'monthly' | 'yearly',
  periodKey: string,
) {
  return await ctx.db
    .query('salesSummaries')
    .withIndex('by_propertyId_periodType_periodKey', (q) =>
      q.eq('propertyId', propertyId).eq('periodType', periodType).eq('periodKey', periodKey),
    )
    .collect();
}

async function sumPeriod(
  ctx: QueryCtx,
  propertyId: Id<'properties'>,
  periodType: 'daily' | 'weekly' | 'monthly' | 'yearly',
  periodKey: string,
) {
  const rows = await summariesForPeriod(ctx, propertyId, periodType, periodKey);
  return {
    totalQtySold: rows.reduce((sum, row) => sum + row.totalQtySold, 0),
    totalRevenue: rows.reduce((sum, row) => sum + row.totalRevenue, 0),
    totalCogs: rows.reduce((sum, row) => sum + (row.totalCogs ?? 0), 0),
    totalWasteQty: rows.reduce((sum, row) => sum + (row.totalWasteQty ?? 0), 0),
    totalCompQty: rows.reduce((sum, row) => sum + (row.totalCompQty ?? 0), 0),
  };
}

async function sumDailyKeys(
  ctx: QueryCtx,
  propertyId: Id<'properties'>,
  dayKeys: string[],
) {
  let totalQtySold = 0;
  let totalRevenue = 0;
  let totalCogs = 0;
  let totalWasteQty = 0;
  let totalCompQty = 0;
  for (const periodKey of dayKeys) {
    const totals = await sumPeriod(ctx, propertyId, 'daily', periodKey);
    totalQtySold += totals.totalQtySold;
    totalRevenue += totals.totalRevenue;
    totalCogs += totals.totalCogs;
    totalWasteQty += totals.totalWasteQty;
    totalCompQty += totals.totalCompQty;
  }
  return { totalQtySold, totalRevenue, totalCogs, totalWasteQty, totalCompQty };
}

export const getSalesSummaries = query({
  args: {
    propertyId: v.id('properties'),
    periodType: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("yearly")),
    barId: v.optional(v.id('bars')),
    userId: v.optional(v.id('users')),
    beverageId: v.optional(v.id('beverages')),
    periodKey: v.optional(v.string()),
    year: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'reports.read', args.propertyId);
    try {
      const dateKey = await propertyDateKey(ctx, args.propertyId);
      const periodKey = args.periodKey ?? currentPeriodKey(dateKey, args.periodType);
      let summaries = await summariesForPeriod(
        ctx,
        args.propertyId,
        args.periodType,
        periodKey,
      );

      if (args.barId) {
        summaries = summaries.filter((row) => row.barId === args.barId);
      }
      if (args.userId) {
        summaries = summaries.filter((row) => row.userId === args.userId);
      }
      if (args.beverageId) {
        summaries = summaries.filter((row) => row.beverageId === args.beverageId);
      }
      if (args.year) {
        summaries = summaries.filter((row) => row.year === args.year);
      }

      summaries.sort((a, b) => b.periodKey.localeCompare(a.periodKey));

      if (args.limit && args.limit > 0) {
        summaries = summaries.slice(0, args.limit);
      }

      // Fetch related data
      const summariesWithDetails = await Promise.all(
        summaries.map(async (summary) => {
          const bar = await ctx.db.get(summary.barId);
          const beverage = await ctx.db.get(summary.beverageId);
          const user = summary.userId ? await ctx.db.get(summary.userId) : null;
          
          return {
            ...summary,
            bar,
            beverage,
            user,
          };
        })
      );

      return { success: true, data: summariesWithDetails };
    } catch (error) {
      console.log(`Failed to fetch sales summaries: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch sales summaries' };
    }
  },
});

export const getSalesByBarPeriod = query({
  args: {
    propertyId: v.id('properties'),
    periodType: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("yearly")),
    periodKey: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'reports.read', args.propertyId);
    const dateKey = await propertyDateKey(ctx, args.propertyId);
    const periodKey = args.periodKey ?? currentPeriodKey(dateKey, args.periodType);

    const summaries = await summariesForPeriod(ctx, args.propertyId, args.periodType, periodKey);

      // Group by bar and aggregate
      const barAggregates = new Map();
      
      summaries.forEach(summary => {
        const barId = summary.barId;
        if (!barAggregates.has(barId)) {
          barAggregates.set(barId, {
            barId,
            totalQtySold: 0,
            totalRevenue: 0,
            totalCogs: 0,
            totalWasteQty: 0,
            totalCompQty: 0,
            periodType: summary.periodType,
            periodKey: summary.periodKey,
          });
        }
        
        const aggregate = barAggregates.get(barId);
        aggregate.totalQtySold += summary.totalQtySold;
        aggregate.totalRevenue += summary.totalRevenue;
        aggregate.totalCogs += summary.totalCogs ?? 0;
        aggregate.totalWasteQty += summary.totalWasteQty ?? 0;
        aggregate.totalCompQty += summary.totalCompQty ?? 0;
      });

      // Fetch bar details
      const result = await Promise.all(
        Array.from(barAggregates.values()).map(async (aggregate) => {
          const bar = await ctx.db.get(aggregate.barId);
          return {
            ...aggregate,
            bar,
          };
        })
      );

      // Sort by revenue descending
      result.sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Apply limit
      if (args.limit && args.limit > 0) {
        result.splice(args.limit);
      }

      return { success: true, data: result };
  },
});

export const getSalesByUserPeriod = query({
  args: {
    propertyId: v.id('properties'),
    periodType: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("yearly")),
    periodKey: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'reports.read', args.propertyId);
    const dateKey = await propertyDateKey(ctx, args.propertyId);
    const periodKey = args.periodKey ?? currentPeriodKey(dateKey, args.periodType);
    let summaries = await summariesForPeriod(ctx, args.propertyId, args.periodType, periodKey);

      // Filter only summaries with userId (user-specific records)
      summaries = summaries.filter(s => s.userId !== undefined);

      // Group by user and aggregate
      const userAggregates = new Map();
      
      summaries.forEach(summary => {
        const userId = summary.userId!;
        if (!userAggregates.has(userId)) {
          userAggregates.set(userId, {
            userId,
            totalQtySold: 0,
            totalRevenue: 0,
            totalCogs: 0,
            periodType: summary.periodType,
            periodKey: summary.periodKey,
          });
        }
        
        const aggregate = userAggregates.get(userId);
        aggregate.totalQtySold += summary.totalQtySold;
        aggregate.totalRevenue += summary.totalRevenue;
        aggregate.totalCogs += summary.totalCogs ?? 0;
      });

      // Fetch user details
      const result = await Promise.all(
        Array.from(userAggregates.values()).map(async (aggregate) => {
          const user = await ctx.db.get(aggregate.userId);
          return {
            ...aggregate,
            user,
          };
        })
      );

      // Sort by revenue descending
      result.sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Apply limit
      if (args.limit && args.limit > 0) {
        result.splice(args.limit);
      }

      return { success: true, data: result };
  },
});

export const getBeverageTrend = query({
  args: {
    propertyId: v.id('properties'),
    beverageId: v.id('beverages'),
    periodType: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("yearly")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'reports.read', args.propertyId);
    try {
      const summaries = await ctx.db.query('salesSummaries')
        .withIndex('by_propertyId_periodType', (q) =>
          q.eq('propertyId', args.propertyId).eq('periodType', args.periodType)
        )
        .collect();

      const filteredSummaries = summaries
        .filter((row) => row.beverageId === args.beverageId)
        .sort((a, b) => a.periodKey.localeCompare(b.periodKey));

      // Apply limit
      const result = args.limit ? filteredSummaries.slice(-args.limit) : filteredSummaries;

      return { success: true, data: result };
    } catch (error) {
      console.log(`Failed to fetch beverage trend: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch beverage trend' };
    }
  },
});

export const getYearOnYearComparison = query({
  args: {
    propertyId: v.id('properties'),
    periodType: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    year1: v.number(),
    year2: v.number(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'reports.read', args.propertyId);
    try {
      const allRows = await ctx.db.query('salesSummaries')
        .withIndex('by_propertyId_periodType', (q) =>
          q.eq('propertyId', args.propertyId).eq('periodType', args.periodType)
        )
        .collect();
      const summaries1 = allRows.filter((row) => row.year === args.year1);
      const summaries2 = allRows.filter((row) => row.year === args.year2);

      const filterAndGroup = (summaries: typeof allRows, year: number) => {
        const filtered = summaries;
        const grouped = new Map();
        
        filtered.forEach(summary => {
          const periodKey = summary.periodKey;
          if (!grouped.has(periodKey)) {
            grouped.set(periodKey, {
              periodKey,
              year,
              totalQtySold: 0,
              totalRevenue: 0,
              totalCogs: 0,
            });
          }
          
          const group = grouped.get(periodKey);
          group.totalQtySold += summary.totalQtySold;
          group.totalRevenue += summary.totalRevenue;
          group.totalCogs += summary.totalCogs ?? 0;
        });
        
        return Array.from(grouped.values());
      };

      const data1 = filterAndGroup(summaries1, args.year1);
      const data2 = filterAndGroup(summaries2, args.year2);

      return { 
        success: true, 
        data: {
          year1: args.year1,
          year2: args.year2,
          data1,
          data2,
        }
      };
    } catch (error) {
      console.log(`Failed to fetch year-on-year comparison: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch year-on-year comparison' };
    }
  },
});

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const getYearOnYearOverview = query({
  args: {
    propertyId: v.id('properties'),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'reports.read', args.propertyId);
    const dateKey = await propertyDateKey(ctx, args.propertyId);
    const thisYear = Number(dateKey.slice(0, 4));
    const lastYear = thisYear - 1;
    const throughMonth = Number(dateKey.slice(5, 7));
    const throughDay = Number(dateKey.slice(8, 10));

    const monthly = [];
    let currentRevenue = 0;
    let currentQty = 0;
    let currentCogs = 0;
    let previousRevenue = 0;
    let previousQty = 0;
    let previousCogs = 0;

    for (let month = 1; month <= 12; month += 1) {
      const mm = String(month).padStart(2, '0');
      const currentRows = await summariesForPeriod(
        ctx,
        args.propertyId,
        'monthly',
        `${thisYear}-${mm}`,
      );
      const previousRows = await summariesForPeriod(
        ctx,
        args.propertyId,
        'monthly',
        `${lastYear}-${mm}`,
      );

      let currentMonthRevenue = currentRows.reduce((sum, row) => sum + row.totalRevenue, 0);
      let currentMonthQty = currentRows.reduce((sum, row) => sum + row.totalQtySold, 0);
      let currentMonthCogs = currentRows.reduce((sum, row) => sum + (row.totalCogs ?? 0), 0);
      let previousMonthRevenue = previousRows.reduce((sum, row) => sum + row.totalRevenue, 0);
      let previousMonthQty = previousRows.reduce((sum, row) => sum + row.totalQtySold, 0);
      let previousMonthCogs = previousRows.reduce((sum, row) => sum + (row.totalCogs ?? 0), 0);

      if (month === throughMonth) {
        const currentMtd = await sumDailyKeys(
          ctx,
          args.propertyId,
          monthDateKeys(thisYear, month, throughDay),
        );
        const previousMtd = await sumDailyKeys(
          ctx,
          args.propertyId,
          monthDateKeys(lastYear, month, throughDay),
        );
        currentMonthRevenue = currentMtd.totalRevenue;
        currentMonthQty = currentMtd.totalQtySold;
        currentMonthCogs = currentMtd.totalCogs;
        previousMonthRevenue = previousMtd.totalRevenue;
        previousMonthQty = previousMtd.totalQtySold;
        previousMonthCogs = previousMtd.totalCogs;
      }

      if (month <= throughMonth) {
        currentRevenue += currentMonthRevenue;
        currentQty += currentMonthQty;
        currentCogs += currentMonthCogs;
        previousRevenue += previousMonthRevenue;
        previousQty += previousMonthQty;
        previousCogs += previousMonthCogs;
      }

      monthly.push({
        month: mm,
        label: MONTH_LABELS[month - 1],
        currentRevenue: currentMonthRevenue,
        previousRevenue: previousMonthRevenue,
        currentQty: currentMonthQty,
        previousQty: previousMonthQty,
        currentCogs: currentMonthCogs,
        previousCogs: previousMonthCogs,
      });
    }

    const currentProfit = currentRevenue - currentCogs;
    const previousProfit = previousRevenue - previousCogs;

    return {
      success: true,
      data: {
        thisYear,
        lastYear,
        throughMonth,
        current: { totalRevenue: currentRevenue, totalQtySold: currentQty, totalCogs: currentCogs },
        previous: { totalRevenue: previousRevenue, totalQtySold: previousQty, totalCogs: previousCogs },
        revenueChange: percentChange(currentRevenue, previousRevenue),
        qtyChange: percentChange(currentQty, previousQty),
        profitChange: percentChange(currentProfit, previousProfit),
        monthly,
      },
    };
  },
});

// Mutation to create or update sales summary
export const getRevenueTrend = query({
  args: {
    propertyId: v.id('properties'),
    periodType: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("yearly")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'reports.read', args.propertyId);
    const dateKey = await propertyDateKey(ctx, args.propertyId);
    const limit = args.limit && args.limit > 0 ? Math.min(args.limit, 14) : 7;
    const keys =
      args.periodType === 'daily'
        ? lastNDailyKeys(dateKey, limit)
        : args.periodType === 'monthly'
          ? lastNDailyKeys(dateKey, limit * 31)
              .map((key) => key.slice(0, 7))
              .filter((key, index, all) => all.indexOf(key) === index)
              .slice(-limit)
          : args.periodType === 'yearly'
            ? Array.from({ length: Math.min(limit, 8) }, (_, index) =>
                String(Number(dateKey.slice(0, 4)) - (Math.min(limit, 8) - 1 - index)),
              )
          : lastNDailyKeys(dateKey, limit * 7).reduce<string[]>((acc, key) => {
              const periodKey = currentPeriodKey(key, 'weekly');
              if (!acc.includes(periodKey)) acc.push(periodKey);
              return acc;
            }, []).slice(-limit);

    const points = [];
    for (const periodKey of keys) {
      const totals = await sumPeriod(ctx, args.propertyId, args.periodType, periodKey);
      points.push({
        periodKey,
        totalQtySold: totals.totalQtySold,
        totalRevenue: totals.totalRevenue,
        totalCogs: totals.totalCogs,
      });
    }

    return { success: true, data: points };
  },
});

export const upsertSalesSummary = internalMutation({
  args: {
    propertyId: v.id('properties'),
    barId: v.id('bars'),
    userId: v.optional(v.id('users')),
    beverageId: v.id('beverages'),
    periodType: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("yearly")),
    periodKey: v.string(),
    year: v.number(),
    month: v.optional(v.number()),
    weekNumber: v.optional(v.number()),
    totalQtySold: v.number(),
    totalRevenue: v.number(),
    totalCogs: v.optional(v.number()),
    totalWasteQty: v.optional(v.number()),
    totalCompQty: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const id = await upsertSalesSummaryDoc(ctx, args);
    return { success: true, data: id };
  },
});

