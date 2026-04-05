import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Helper functions for date calculations
const getISODateString = (date: Date) => date.toISOString().split('T')[0];

const getWeekKey = (date: Date) => {
  const year = date.getFullYear();
  const weekNumber = getWeekNumber(date);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
};

const getWeekNumber = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getMonthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
};

// Queries for sales summaries
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
    try {
      let query = ctx.db.query('salesSummaries')
        .withIndex('by_propertyId_periodType', (q) => 
          q.eq('propertyId', args.propertyId).eq('periodType', args.periodType)
        );

      // Apply additional filters
      if (args.barId) {
        query = ctx.db.query('salesSummaries')
          .withIndex('by_propertyId_barId_period', (q) =>
            q.eq('propertyId', args.propertyId).eq('barId', args.barId!).eq('periodType', args.periodType)
          );
      }

      if (args.periodKey && args.barId) {
        query = ctx.db.query('salesSummaries')
          .withIndex('by_barId_period', (q) =>
            q.eq('barId', args.barId!).eq('periodType', args.periodType).eq('periodKey', args.periodKey!)
          );
      }

      if (args.userId) {
        query = ctx.db.query('salesSummaries')
          .withIndex('by_userId_period', (q) =>
            q.eq('userId', args.userId).eq('periodType', args.periodType)
          );
      }

      if (args.beverageId) {
        query = ctx.db.query('salesSummaries')
          .withIndex('by_beverageId_period', (q) =>
            q.eq('beverageId', args.beverageId!).eq('periodType', args.periodType)
          );
      }

      if (args.year) {
        query = ctx.db.query('salesSummaries')
          .withIndex('by_year_periodType', (q) =>
            q.eq('year', args.year!).eq('periodType', args.periodType)
          );
      }

      let summaries = await query.collect();

      // Apply periodKey filter if not already applied in index
      if (args.periodKey && !args.barId) {
        summaries = summaries.filter(s => s.periodKey === args.periodKey);
      }

      // Apply property filter if not already applied
      summaries = summaries.filter(s => s.propertyId === args.propertyId);

      // Sort by periodKey descending (most recent first)
      summaries.sort((a, b) => b.periodKey.localeCompare(a.periodKey));

      // Apply limit
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
    try {
      let query = ctx.db.query('salesSummaries')
        .withIndex('by_propertyId_periodType', (q) => 
          q.eq('propertyId', args.propertyId).eq('periodType', args.periodType)
        );

      let summaries = await query.collect();

      // Apply periodKey filter if provided
      if (args.periodKey) {
        summaries = summaries.filter(s => s.periodKey === args.periodKey);
      }

      // Group by bar and aggregate
      const barAggregates = new Map();
      
      summaries.forEach(summary => {
        const barId = summary.barId;
        if (!barAggregates.has(barId)) {
          barAggregates.set(barId, {
            barId,
            totalQtySold: 0,
            totalRevenue: 0,
            periodType: summary.periodType,
            periodKey: summary.periodKey,
          });
        }
        
        const aggregate = barAggregates.get(barId);
        aggregate.totalQtySold += summary.totalQtySold;
        aggregate.totalRevenue += summary.totalRevenue;
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
    } catch (error) {
      console.log(`Failed to fetch sales by bar: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch sales by bar' };
    }
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
    try {
      let summaries = await ctx.db.query('salesSummaries')
        .withIndex('by_propertyId_periodType', (q) => 
          q.eq('propertyId', args.propertyId).eq('periodType', args.periodType)
        )
        .collect();

      // Apply periodKey filter if provided
      if (args.periodKey) {
        summaries = summaries.filter(s => s.periodKey === args.periodKey);
      }

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
            periodType: summary.periodType,
            periodKey: summary.periodKey,
          });
        }
        
        const aggregate = userAggregates.get(userId);
        aggregate.totalQtySold += summary.totalQtySold;
        aggregate.totalRevenue += summary.totalRevenue;
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
    } catch (error) {
      console.log(`Failed to fetch sales by user: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch sales by user' };
    }
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
    try {
      const summaries = await ctx.db.query('salesSummaries')
        .withIndex('by_beverageId_period', (q) =>
          q.eq('beverageId', args.beverageId).eq('periodType', args.periodType)
        )
        .collect();

      // Filter by property and sort
      const filteredSummaries = summaries
        .filter(s => s.propertyId === args.propertyId)
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
    try {
      const summaries1 = await ctx.db.query('salesSummaries')
        .withIndex('by_year_periodType', (q) =>
          q.eq('year', args.year1).eq('periodType', args.periodType)
        )
        .collect();

      const summaries2 = await ctx.db.query('salesSummaries')
        .withIndex('by_year_periodType', (q) =>
          q.eq('year', args.year2).eq('periodType', args.periodType)
        )
        .collect();

      // Filter by property and group by periodKey
      const filterAndGroup = (summaries: any[], year: number) => {
        const filtered = summaries.filter(s => s.propertyId === args.propertyId);
        const grouped = new Map();
        
        filtered.forEach(summary => {
          const periodKey = summary.periodKey;
          if (!grouped.has(periodKey)) {
            grouped.set(periodKey, {
              periodKey,
              year,
              totalQtySold: 0,
              totalRevenue: 0,
            });
          }
          
          const group = grouped.get(periodKey);
          group.totalQtySold += summary.totalQtySold;
          group.totalRevenue += summary.totalRevenue;
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

// Mutation to create or update sales summary
export const upsertSalesSummary = mutation({
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
  },
  handler: async (ctx, args) => {
    try {
      // Check if a summary already exists for this combination
      const existing = await ctx.db.query('salesSummaries')
        .withIndex('by_propertyId_barId_period', (q) =>
          q.eq('propertyId', args.propertyId)
           .eq('barId', args.barId)
           .eq('periodType', args.periodType)
           .eq('periodKey', args.periodKey)
        )
        .filter(q => q.eq(q.field('beverageId'), args.beverageId))
        .filter(q => args.userId ? q.eq(q.field('userId'), args.userId) : true)
        .first();

      if (existing) {
        // Update existing summary
        await ctx.db.patch(existing._id, {
          totalQtySold: args.totalQtySold,
          totalRevenue: args.totalRevenue,
        });
        return { success: true, data: existing._id, message: 'Sales summary updated' };
      } else {
        // Create new summary
        const summaryId = await ctx.db.insert('salesSummaries', args);
        return { success: true, data: summaryId, message: 'Sales summary created' };
      }
    } catch (error) {
      console.log(`Failed to upsert sales summary: ${error}`);
      return { success: false, message: 'Failed to upsert sales summary' };
    }
  },
});
