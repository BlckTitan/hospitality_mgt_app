import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import {
  daysInMonth,
  isoWeekDateKeys,
  isoWeekNumber,
  refreshSalesSummariesForLog,
  shiftDateKey,
  upsertSalesSummaryDoc,
} from './lib/barStock';
import { localDayBounds, propertyTimeZone } from './lib/billingPeriods';
import { Doc, Id } from './_generated/dataModel';

const PAGE_SIZE = 80;

function propertyTodayKey(property: Doc<'properties'>): string {
  return localDayBounds(Date.now(), propertyTimeZone(property)).dateKey;
}

export const aggregateDailySummaries = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    propertyCursor: v.optional(v.union(v.string(), v.null())),
    logCursor: v.optional(v.union(v.string(), v.null())),
    dateKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const properties = await ctx.db.query('properties').paginate({
      numItems: 1,
      cursor: args.propertyCursor ?? args.cursor ?? null,
    });
    const property = properties.page[0];
    if (!property) {
      return { success: true, continued: false };
    }

    const dateKey = args.dateKey ?? shiftDateKey(propertyTodayKey(property), -1);
    const page = await ctx.db
      .query('userStockLogs')
      .withIndex('by_propertyId_logDate', (q) =>
        q.eq('propertyId', property._id).eq('logDate', dateKey),
      )
      .paginate({ numItems: PAGE_SIZE, cursor: args.logCursor ?? null });

    for (const log of page.page) {
      if (!log.barId) continue;
      await refreshSalesSummariesForLog(ctx, log);
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.cron.aggregateDailySummaries, {
        propertyCursor: args.propertyCursor ?? null,
        logCursor: page.continueCursor,
        dateKey,
      });
      return { success: true, dateKey, continued: true };
    }

    if (!properties.isDone) {
      await ctx.scheduler.runAfter(0, internal.cron.aggregateDailySummaries, {
        propertyCursor: properties.continueCursor,
      });
    }

    return { success: true, dateKey, continued: !properties.isDone };
  },
});

async function rollupDailiesForKeys(
  ctx: Parameters<typeof upsertSalesSummaryDoc>[0],
  args: {
    propertyId: Id<'properties'>;
    dayKeys: string[];
    periodType: 'weekly' | 'monthly' | 'yearly';
    periodKey: string;
    year: number;
    month?: number;
    weekNumber?: number;
  },
) {
  const grouped = new Map<
    string,
    {
      barId: Id<'bars'>;
      userId?: Id<'users'>;
      beverageId: Id<'beverages'>;
      totalQtySold: number;
      totalRevenue: number;
      totalCogs: number;
      totalWasteQty: number;
      totalCompQty: number;
    }
  >();

  for (const dayKey of args.dayKeys) {
    const rows = await ctx.db
      .query('salesSummaries')
      .withIndex('by_propertyId_periodType_periodKey', (q) =>
        q
          .eq('propertyId', args.propertyId)
          .eq('periodType', 'daily')
          .eq('periodKey', dayKey),
      )
      .collect();

    for (const row of rows) {
      const key = `${row.barId}-${row.userId ?? 'null'}-${row.beverageId}`;
      const current = grouped.get(key) ?? {
        barId: row.barId,
        userId: row.userId,
        beverageId: row.beverageId,
        totalQtySold: 0,
        totalRevenue: 0,
        totalCogs: 0,
        totalWasteQty: 0,
        totalCompQty: 0,
      };
      current.totalQtySold += row.totalQtySold;
      current.totalRevenue += row.totalRevenue;
      current.totalCogs += row.totalCogs ?? 0;
      current.totalWasteQty += row.totalWasteQty ?? 0;
      current.totalCompQty += row.totalCompQty ?? 0;
      grouped.set(key, current);
    }
  }

  for (const group of grouped.values()) {
    await upsertSalesSummaryDoc(ctx, {
      propertyId: args.propertyId,
      barId: group.barId,
      userId: group.userId,
      beverageId: group.beverageId,
      periodType: args.periodType,
      periodKey: args.periodKey,
      year: args.year,
      month: args.month,
      weekNumber: args.weekNumber,
      totalQtySold: group.totalQtySold,
      totalRevenue: group.totalRevenue,
      totalCogs: group.totalCogs,
      totalWasteQty: group.totalWasteQty,
      totalCompQty: group.totalCompQty,
    });
  }
}

export const aggregateWeeklySummaries = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const properties = await ctx.db
      .query('properties')
      .paginate({ numItems: 1, cursor: args.cursor ?? null });

    for (const property of properties.page) {
      const todayKey = propertyTodayKey(property);
      const inPreviousWeek = shiftDateKey(todayKey, -7);
      const { year: targetYear, week: targetWeek } = isoWeekNumber(inPreviousWeek);
      const weekKey = `${targetYear}-W${String(targetWeek).padStart(2, '0')}`;
      await rollupDailiesForKeys(ctx, {
        propertyId: property._id,
        dayKeys: isoWeekDateKeys(inPreviousWeek),
        periodType: 'weekly',
        periodKey: weekKey,
        year: targetYear,
        weekNumber: targetWeek,
      });
    }

    if (!properties.isDone) {
      await ctx.scheduler.runAfter(0, internal.cron.aggregateWeeklySummaries, {
        cursor: properties.continueCursor,
      });
    }

    return { success: true, continued: !properties.isDone };
  },
});

export const aggregateMonthlySummaries = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const properties = await ctx.db
      .query('properties')
      .paginate({ numItems: 1, cursor: args.cursor ?? null });

    for (const property of properties.page) {
      const todayKey = propertyTodayKey(property);
      const yearNow = Number(todayKey.slice(0, 4));
      const monthNow = Number(todayKey.slice(5, 7));
      const lastMonth = monthNow === 1 ? 12 : monthNow - 1;
      const year = monthNow === 1 ? yearNow - 1 : yearNow;
      const periodKey = `${year}-${String(lastMonth).padStart(2, '0')}`;
      const dayCount = daysInMonth(year, lastMonth);
      const dayKeys = Array.from({ length: dayCount }, (_, i) =>
        `${periodKey}-${String(i + 1).padStart(2, '0')}`,
      );
      await rollupDailiesForKeys(ctx, {
        propertyId: property._id,
        dayKeys,
        periodType: 'monthly',
        periodKey,
        year,
        month: lastMonth,
      });
    }

    if (!properties.isDone) {
      await ctx.scheduler.runAfter(0, internal.cron.aggregateMonthlySummaries, {
        cursor: properties.continueCursor,
      });
    }

    return { success: true, continued: !properties.isDone };
  },
});

export const aggregateYearlySummaries = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const properties = await ctx.db
      .query('properties')
      .paginate({ numItems: 1, cursor: args.cursor ?? null });

    for (const property of properties.page) {
      const lastYear = Number(propertyTodayKey(property).slice(0, 4)) - 1;
      const grouped = new Map<
        string,
        {
          barId: Id<'bars'>;
          userId?: Id<'users'>;
          beverageId: Id<'beverages'>;
          totalQtySold: number;
          totalRevenue: number;
          totalCogs: number;
          totalWasteQty: number;
          totalCompQty: number;
        }
      >();

      for (let month = 1; month <= 12; month += 1) {
        const rows = await ctx.db
          .query('salesSummaries')
          .withIndex('by_propertyId_periodType_periodKey', (q) =>
            q
              .eq('propertyId', property._id)
              .eq('periodType', 'monthly')
              .eq('periodKey', `${lastYear}-${String(month).padStart(2, '0')}`),
          )
          .collect();
        for (const row of rows) {
          const key = `${row.barId}-${row.userId ?? 'null'}-${row.beverageId}`;
          const current = grouped.get(key) ?? {
            barId: row.barId,
            userId: row.userId,
            beverageId: row.beverageId,
            totalQtySold: 0,
            totalRevenue: 0,
            totalCogs: 0,
            totalWasteQty: 0,
            totalCompQty: 0,
          };
          current.totalQtySold += row.totalQtySold;
          current.totalRevenue += row.totalRevenue;
          current.totalCogs += row.totalCogs ?? 0;
          current.totalWasteQty += row.totalWasteQty ?? 0;
          current.totalCompQty += row.totalCompQty ?? 0;
          grouped.set(key, current);
        }
      }

      for (const group of grouped.values()) {
        await upsertSalesSummaryDoc(ctx, {
          propertyId: property._id,
          barId: group.barId,
          userId: group.userId,
          beverageId: group.beverageId,
          periodType: 'yearly',
          periodKey: String(lastYear),
          year: lastYear,
          totalQtySold: group.totalQtySold,
          totalRevenue: group.totalRevenue,
          totalCogs: group.totalCogs,
          totalWasteQty: group.totalWasteQty,
          totalCompQty: group.totalCompQty,
        });
      }
    }

    if (!properties.isDone) {
      await ctx.scheduler.runAfter(0, internal.cron.aggregateYearlySummaries, {
        cursor: properties.continueCursor,
      });
    }

    return { success: true, continued: !properties.isDone };
  },
});
