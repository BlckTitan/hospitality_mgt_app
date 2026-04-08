import { internalMutation } from './_generated/server';
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

// Daily aggregation - runs every day at 01:00 UTC
export const aggregateDailySummaries = internalMutation({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('Starting daily sales aggregation');
      
      // Get yesterday's date (the day we're aggregating)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getISODateString(yesterday);
      const year = yesterday.getFullYear();
      const month = yesterday.getMonth() + 1;

      // Get all finalized user stock logs for yesterday
      const stockLogs = await ctx.db.query('userStockLogs').collect();

      // Filter for yesterday's date and finalized logs
      const finalizedLogs = stockLogs.filter(log => 
        log.logDate === yesterdayStr && log.isFinalized === true
      );

      if (finalizedLogs.length === 0) {
        console.log('No finalized stock logs found for yesterday');
        return { success: true, message: 'No data to aggregate' };
      }

      // Group by property, bar, user, and beverage
      const groupedData = new Map();
      
      finalizedLogs.forEach(log => {
        const key = `${log.propertyId}-${log.barId}-${log.userId || 'null'}-${log.beverageId}`;
        
        if (!groupedData.has(key)) {
          groupedData.set(key, {
            propertyId: log.propertyId,
            barId: log.barId!,
            userId: log.userId,
            beverageId: log.beverageId,
            totalQtySold: 0,
            totalRevenue: 0,
          });
        }
        
        const group = groupedData.get(key);
        group.totalQtySold += log.salesQuantity;
        group.totalRevenue += log.salesValue;
      });

      // Create or update daily summaries
      for (const group of groupedData.values()) {
        // Check if a summary already exists for this combination
        const existing = await ctx.db.query('salesSummaries')
          .withIndex('by_propertyId_barId_period', (q) =>
            q.eq('propertyId', group.propertyId)
             .eq('barId', group.barId)
             .eq('periodType', 'daily')
             .eq('periodKey', yesterdayStr)
          )
          .filter(q => group.userId ? q.eq('userId', group.userId) : q.eq('userId', undefined))
          .filter(q => q.eq('beverageId', group.beverageId))
          .first();

        if (existing) {
          // Update existing summary
          await ctx.db.patch(existing._id, {
            totalQtySold: group.totalQtySold,
            totalRevenue: group.totalRevenue,
          });
        } else {
          // Create new summary
          await ctx.db.insert('salesSummaries', {
            ...group,
            periodType: 'daily',
            periodKey: yesterdayStr,
            year,
            month,
            weekNumber: undefined,
          });
        }
      }

      console.log(`Daily aggregation completed: ${groupedData.size} summaries processed`);
      return { success: true, message: 'Daily aggregation completed' };
    } catch (error) {
      console.error('Daily aggregation failed:', error);
      return { success: false, message: 'Daily aggregation failed' };
    }
  },
});

// Weekly aggregation - runs every Monday at 02:00 UTC
export const aggregateWeeklySummaries = internalMutation({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('Starting weekly sales aggregation');
      
      // Get last week's dates
      const today = new Date();
      const currentWeekNumber = getWeekNumber(today);
      const currentYear = today.getFullYear();
      
      // Find the most recent completed week
      let targetWeekNumber = currentWeekNumber - 1;
      let targetYear = currentYear;
      
      if (targetWeekNumber === 0) {
        targetWeekNumber = 52; // Last week of previous year
        targetYear = currentYear - 1;
      }

      const weekKey = `${targetYear}-W${targetWeekNumber.toString().padStart(2, '0')}`;

      // Get daily summaries for the target week
      const dailySummaries = await ctx.db.query('salesSummaries')
        .withIndex('by_year_periodType', (q) =>
          q.eq('year', targetYear).eq('periodType', 'daily')
        )
        .collect();

      // Filter for the target week
      const weekSummaries = dailySummaries.filter(summary => {
        const summaryDate = new Date(summary.periodKey);
        const summaryWeekNumber = getWeekNumber(summaryDate);
        const summaryYear = summaryDate.getFullYear();
        return summaryWeekNumber === targetWeekNumber && summaryYear === targetYear;
      });

      if (weekSummaries.length === 0) {
        console.log('No daily summaries found for the target week');
        return { success: true, message: 'No data to aggregate' };
      }

      // Group by property, bar, user, and beverage
      const groupedData = new Map();
      
      weekSummaries.forEach(summary => {
        const key = `${summary.propertyId}-${summary.barId}-${summary.userId || 'null'}-${summary.beverageId}`;
        
        if (!groupedData.has(key)) {
          groupedData.set(key, {
            propertyId: summary.propertyId,
            barId: summary.barId,
            userId: summary.userId,
            beverageId: summary.beverageId,
            totalQtySold: 0,
            totalRevenue: 0,
          });
        }
        
        const group = groupedData.get(key);
        group.totalQtySold += summary.totalQtySold;
        group.totalRevenue += summary.totalRevenue;
      });

      // Create or update weekly summaries
      for (const group of groupedData.values()) {
        // Check if a summary already exists for this combination
        const existing = await ctx.db.query('salesSummaries')
          .withIndex('by_propertyId_barId_period', (q) =>
            q.eq('propertyId', group.propertyId)
             .eq('barId', group.barId)
             .eq('periodType', 'weekly')
             .eq('periodKey', weekKey)
          )
          .filter(q => group.userId ? q.eq('userId', group.userId) : q.eq('userId', undefined))
          .filter(q => q.eq('beverageId', group.beverageId))
          .first();

        if (existing) {
          // Update existing summary
          await ctx.db.patch(existing._id, {
            totalQtySold: group.totalQtySold,
            totalRevenue: group.totalRevenue,
          });
        } else {
          // Create new summary
          await ctx.db.insert('salesSummaries', {
            ...group,
            periodType: 'weekly',
            periodKey: weekKey,
            year: targetYear,
            month: undefined,
            weekNumber: targetWeekNumber,
          });
        }
      }

      console.log(`Weekly aggregation completed: ${groupedData.size} summaries processed`);
      return { success: true, message: 'Weekly aggregation completed' };
    } catch (error) {
      console.error('Weekly aggregation failed:', error);
      return { success: false, message: 'Weekly aggregation failed' };
    }
  },
});

// Monthly aggregation - runs on the 1st of each month at 03:00 UTC
export const aggregateMonthlySummaries = internalMutation({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('Starting monthly sales aggregation');
      
      // Get last month
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const year = lastMonth.getFullYear();
      const month = lastMonth.getMonth() + 1;
      const monthKey = getMonthKey(lastMonth);

      // Get daily summaries for the target month
      const dailySummaries = await ctx.db.query('salesSummaries')
        .withIndex('by_year_periodType', (q) =>
          q.eq('year', year).eq('periodType', 'daily')
        )
        .collect();

      // Filter for the target month
      const monthSummaries = dailySummaries.filter(summary => {
        const summaryDate = new Date(summary.periodKey);
        return summaryDate.getFullYear() === year && summaryDate.getMonth() + 1 === month;
      });

      if (monthSummaries.length === 0) {
        console.log('No daily summaries found for the target month');
        return { success: true, message: 'No data to aggregate' };
      }

      // Group by property, bar, user, and beverage
      const groupedData = new Map();
      
      monthSummaries.forEach(summary => {
        const key = `${summary.propertyId}-${summary.barId}-${summary.userId || 'null'}-${summary.beverageId}`;
        
        if (!groupedData.has(key)) {
          groupedData.set(key, {
            propertyId: summary.propertyId,
            barId: summary.barId,
            userId: summary.userId,
            beverageId: summary.beverageId,
            totalQtySold: 0,
            totalRevenue: 0,
          });
        }
        
        const group = groupedData.get(key);
        group.totalQtySold += summary.totalQtySold;
        group.totalRevenue += summary.totalRevenue;
      });

      // Create or update monthly summaries
      for (const group of groupedData.values()) {
        // Check if a summary already exists for this combination
        const existing = await ctx.db.query('salesSummaries')
          .withIndex('by_propertyId_barId_period', (q) =>
            q.eq('propertyId', group.propertyId)
             .eq('barId', group.barId)
             .eq('periodType', 'monthly')
             .eq('periodKey', monthKey)
          )
          .filter(q => group.userId ? q.eq('userId', group.userId) : q.eq('userId', undefined))
          .filter(q => q.eq('beverageId', group.beverageId))
          .first();

        if (existing) {
          // Update existing summary
          await ctx.db.patch(existing._id, {
            totalQtySold: group.totalQtySold,
            totalRevenue: group.totalRevenue,
          });
        } else {
          // Create new summary
          await ctx.db.insert('salesSummaries', {
            ...group,
            periodType: 'monthly',
            periodKey: monthKey,
            year,
            month,
            weekNumber: undefined,
          });
        }
      }

      console.log(`Monthly aggregation completed: ${groupedData.size} summaries processed`);
      return { success: true, message: 'Monthly aggregation completed' };
    } catch (error) {
      console.error('Monthly aggregation failed:', error);
      return { success: false, message: 'Monthly aggregation failed' };
    }
  },
});

// Yearly aggregation - runs on January 1st at 04:00 UTC
export const aggregateYearlySummaries = internalMutation({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('Starting yearly sales aggregation');
      
      // Get last year
      const today = new Date();
      const lastYear = today.getFullYear() - 1;

      // Get monthly summaries for the target year
      const monthlySummaries = await ctx.db.query('salesSummaries')
        .withIndex('by_year_periodType', (q) =>
          q.eq('year', lastYear).eq('periodType', 'monthly')
        )
        .collect();

      if (monthlySummaries.length === 0) {
        console.log('No monthly summaries found for the target year');
        return { success: true, message: 'No data to aggregate' };
      }

      // Group by property, bar, user, and beverage
      const groupedData = new Map();
      
      monthlySummaries.forEach(summary => {
        const key = `${summary.propertyId}-${summary.barId}-${summary.userId || 'null'}-${summary.beverageId}`;
        
        if (!groupedData.has(key)) {
          groupedData.set(key, {
            propertyId: summary.propertyId,
            barId: summary.barId,
            userId: summary.userId,
            beverageId: summary.beverageId,
            totalQtySold: 0,
            totalRevenue: 0,
          });
        }
        
        const group = groupedData.get(key);
        group.totalQtySold += summary.totalQtySold;
        group.totalRevenue += summary.totalRevenue;
      });

      // Create or update yearly summaries
      for (const group of groupedData.values()) {
        // Check if a summary already exists for this combination
        const existing = await ctx.db.query('salesSummaries')
          .withIndex('by_propertyId_barId_period', (q) =>
            q.eq('propertyId', group.propertyId)
             .eq('barId', group.barId)
             .eq('periodType', 'yearly')
             .eq('periodKey', lastYear.toString())
          )
          .filter(q => group.userId ? q.eq('userId', group.userId) : q.eq('userId', undefined))
          .filter(q => q.eq('beverageId', group.beverageId))
          .first();

        if (existing) {
          // Update existing summary
          await ctx.db.patch(existing._id, {
            totalQtySold: group.totalQtySold,
            totalRevenue: group.totalRevenue,
          });
        } else {
          // Create new summary
          await ctx.db.insert('salesSummaries', {
            ...group,
            periodType: 'yearly',
            periodKey: lastYear.toString(),
            year: lastYear,
            month: undefined,
            weekNumber: undefined,
          });
        }
      }

      console.log(`Yearly aggregation completed: ${groupedData.size} summaries processed`);
      return { success: true, message: 'Yearly aggregation completed' };
    } catch (error) {
      console.error('Yearly aggregation failed:', error);
      return { success: false, message: 'Yearly aggregation failed' };
    }
  },
});
