import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import {
  isoWeekNumber,
  shiftDateKey,
  upsertSalesSummaryDoc,
} from './lib/barStock';
import { Id } from './_generated/dataModel';

const PAGE_SIZE = 80;

function utcDateKey(offsetDays = 0): string {
  const ms = Date.now() + offsetDays * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

function monthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export const aggregateDailySummaries = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    dateKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dateKey = args.dateKey ?? utcDateKey(-1);
    const year = Number(dateKey.slice(0, 4));
    const month = Number(dateKey.slice(5, 7));
    const { week } = isoWeekNumber(dateKey);

    const page = await ctx.db
      .query('userStockLogs')
      .withIndex('by_logDate', (q) => q.eq('logDate', dateKey))
      .paginate({ numItems: PAGE_SIZE, cursor: args.cursor ?? null });

    for (const log of page.page) {
      if (!log.isFinalized || !log.barId) continue;
      await upsertSalesSummaryDoc(ctx, {
        propertyId: log.propertyId,
        barId: log.barId,
        userId: log.userId,
        beverageId: log.beverageId,
        periodType: 'daily',
        periodKey: dateKey,
        year,
        month,
        weekNumber: week,
        totalQtySold: log.salesQuantity,
        totalRevenue: log.salesValue,
      });
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.cron.aggregateDailySummaries, {
        cursor: page.continueCursor,
        dateKey,
      });
    }

    return { success: true, dateKey, continued: !page.isDone };
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
      .take(200);

    for (const row of rows) {
      const key = `${row.barId}-${row.userId ?? 'null'}-${row.beverageId}`;
      const current = grouped.get(key) ?? {
        barId: row.barId,
        userId: row.userId,
        beverageId: row.beverageId,
        totalQtySold: 0,
        totalRevenue: 0,
      };
      current.totalQtySold += row.totalQtySold;
      current.totalRevenue += row.totalRevenue;
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
    });
  }
}

export const aggregateWeeklySummaries = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const todayKey = utcDateKey(0);
    const { year: currentYear, week: currentWeek } = isoWeekNumber(todayKey);
    let targetWeek = currentWeek - 1;
    let targetYear = currentYear;
    if (targetWeek <= 0) {
      const lastYearKey = `${currentYear - 1}-12-28`;
      const prior = isoWeekNumber(lastYearKey);
      targetWeek = prior.week;
      targetYear = prior.year;
    }
    const weekKey = `${targetYear}-W${String(targetWeek).padStart(2, '0')}`;

    const dayKeys: string[] = [];
    for (let offset = 1; offset <= 14; offset++) {
      const key = shiftDateKey(todayKey, -offset);
      const iso = isoWeekNumber(key);
      if (iso.year === targetYear && iso.week === targetWeek) {
        dayKeys.push(key);
      }
    }

    const properties = await ctx.db
      .query('properties')
      .paginate({ numItems: 5, cursor: args.cursor ?? null });

    for (const property of properties.page) {
      await rollupDailiesForKeys(ctx, {
        propertyId: property._id,
        dayKeys,
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

    return { success: true, weekKey, continued: !properties.isDone };
  },
});

export const aggregateMonthlySummaries = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const todayKey = utcDateKey(0);
    const yearNow = Number(todayKey.slice(0, 4));
    const monthNow = Number(todayKey.slice(5, 7));
    const lastMonth = monthNow === 1 ? 12 : monthNow - 1;
    const year = monthNow === 1 ? yearNow - 1 : yearNow;
    const periodKey = `${year}-${String(lastMonth).padStart(2, '0')}`;
    const dayCount = daysInMonth(year, lastMonth);
    const dayKeys = Array.from({ length: dayCount }, (_, i) =>
      `${periodKey}-${String(i + 1).padStart(2, '0')}`,
    );

    const properties = await ctx.db
      .query('properties')
      .paginate({ numItems: 3, cursor: args.cursor ?? null });

    for (const property of properties.page) {
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

    return { success: true, periodKey, continued: !properties.isDone };
  },
});

export const aggregateYearlySummaries = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const lastYear = Number(utcDateKey(0).slice(0, 4)) - 1;
    const monthKeys = Array.from({ length: 12 }, (_, i) =>
      `${lastYear}-${String(i + 1).padStart(2, '0')}`,
    );

    const properties = await ctx.db
      .query('properties')
      .paginate({ numItems: 5, cursor: args.cursor ?? null });

    for (const property of properties.page) {
      const grouped = new Map<
        string,
        {
          barId: Id<'bars'>;
          userId?: Id<'users'>;
          beverageId: Id<'beverages'>;
          totalQtySold: number;
          totalRevenue: number;
        }
      >();

      for (const month of monthKeys) {
        const rows = await ctx.db
          .query('salesSummaries')
          .withIndex('by_propertyId_periodType_periodKey', (q) =>
            q
              .eq('propertyId', property._id)
              .eq('periodType', 'monthly')
              .eq('periodKey', month),
          )
          .take(200);
        for (const row of rows) {
          const key = `${row.barId}-${row.userId ?? 'null'}-${row.beverageId}`;
          const current = grouped.get(key) ?? {
            barId: row.barId,
            userId: row.userId,
            beverageId: row.beverageId,
            totalQtySold: 0,
            totalRevenue: 0,
          };
          current.totalQtySold += row.totalQtySold;
          current.totalRevenue += row.totalRevenue;
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
        });
      }
    }

    if (!properties.isDone) {
      await ctx.scheduler.runAfter(0, internal.cron.aggregateYearlySummaries, {
        cursor: properties.continueCursor,
      });
    }

    return { success: true, year: lastYear, continued: !properties.isDone };
  },
});
