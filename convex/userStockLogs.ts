import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/rbac';
import { findOrCreateFnBShift } from './lib/shiftHelpers';
import {
  lastFinalizedClosingStock,
  propertyDateKey,
  refreshSalesSummariesForLog,
  refreshSalesSummariesForLogs,
} from './lib/barStock';

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
      const stockLogsWithData = await Promise.all(
        userStockLogs.map(async (log) => {
          const [shift, beverage, user, bar] = await Promise.all([
            ctx.db.get(log.shiftId),
            ctx.db.get(log.beverageId),
            ctx.db.get(log.userId),
            log.barId ? ctx.db.get(log.barId) : null
          ]);
          
          return {
            ...log,
            shift,
            beverage,
            user,
            bar,
          };
        })
      );
      
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
      const [shift, beverage, user, bar] = await Promise.all([
        ctx.db.get(stockLog.shiftId),
        ctx.db.get(stockLog.beverageId),
        ctx.db.get(stockLog.userId),
        stockLog.barId ? ctx.db.get(stockLog.barId) : null
      ]);
      
      return { success: true, data: { ...stockLog, shift, beverage, user, bar } };
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
      const stockLogsWithData = await Promise.all(
        stockLogs.map(async (log) => {
          const [shift, beverage, user, bar] = await Promise.all([
            ctx.db.get(log.shiftId),
            ctx.db.get(log.beverageId),
            ctx.db.get(log.userId),
            log.barId ? ctx.db.get(log.barId) : null
          ]);
          
          return {
            ...log,
            shift,
            beverage,
            user,
            bar,
          };
        })
      );
      
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
      const stockLogsWithData = await Promise.all(
        stockLogs.map(async (log) => {
          const [shift, beverage, user, bar] = await Promise.all([
            ctx.db.get(log.shiftId),
            ctx.db.get(log.beverageId),
            ctx.db.get(log.userId),
            log.barId ? ctx.db.get(log.barId) : null
          ]);
          
          return {
            ...log,
            shift,
            beverage,
            user,
            bar,
          };
        })
      );
      
      return { success: true, data: stockLogsWithData };
    } catch (error) {
      console.log(`Failed to fetch bar daily stock logs: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch bar daily stock logs' };
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
      const stockLogsWithData = await Promise.all(
        stockLogs.map(async (log) => {
          const [shift, beverage, user, bar] = await Promise.all([
            ctx.db.get(log.shiftId),
            ctx.db.get(log.beverageId),
            ctx.db.get(log.userId),
            log.barId ? ctx.db.get(log.barId) : null
          ]);
          
          return {
            ...log,
            shift,
            beverage,
            user,
            bar,
          };
        })
      );
      
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
      const stockLogsWithData = await Promise.all(
        stockLogs.map(async (log) => {
          const [shift, beverage, user, bar] = await Promise.all([
            ctx.db.get(log.shiftId),
            ctx.db.get(log.beverageId),
            ctx.db.get(log.userId),
            log.barId ? ctx.db.get(log.barId) : null
          ]);
          
          return {
            ...log,
            shift,
            beverage,
            user,
            bar,
          };
        })
      );
      
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
      const stockLogsWithData = await Promise.all(
        stockLogs.map(async (log) => {
          const [shift, beverage, user, bar] = await Promise.all([
            ctx.db.get(log.shiftId),
            ctx.db.get(log.beverageId),
            ctx.db.get(log.userId),
            log.barId ? ctx.db.get(log.barId) : null
          ]);
          
          return {
            ...log,
            beverage,
            user,
            bar,
          };
        })
      );
      
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
    userId: v.id('users'),
    barId: v.id('bars'),
    beverageId: v.id('beverages'),
    logDate: v.optional(v.string()),
    openingStock: v.optional(v.number()),
    closingStock: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.create', args.propertyId);

    const logDate = await propertyDateKey(ctx, args.propertyId);
    const bar = await ctx.db.get(args.barId);
    if (!bar || bar.propertyId !== args.propertyId) {
      return { success: false, message: 'Bar does not exist or does not belong to this property' };
    }
    const beverage = await ctx.db.get(args.beverageId);
    if (!beverage || beverage.propertyId !== args.propertyId || !beverage.isActive) {
      return { success: false, message: 'Beverage does not exist or is inactive' };
    }

    const existingLog = await ctx.db
      .query('userStockLogs')
      .withIndex('by_userId_barId_bev_date', (q) =>
        q.eq('userId', args.userId)
         .eq('barId', args.barId)
         .eq('beverageId', args.beverageId)
         .eq('logDate', logDate)
      )
      .first();
    if (existingLog) {
      return { success: false, message: 'Stock log already exists for this beverage on this date' };
    }

    let shiftId = args.shiftId;
    if (shiftId) {
      const shift = await ctx.db.get(shiftId);
      if (!shift) {
        return { success: false, message: 'Shift does not exist' };
      }
      if (shift.isFinalized) {
        return { success: false, message: 'Cannot add stock log to finalized shift' };
      }
      if (shift.department && shift.department !== 'fnb') {
        return { success: false, message: 'Stock logs can only be added to F&B shifts' };
      }
      if (shift.propertyId !== args.propertyId) {
        return { success: false, message: 'Shift does not belong to this property' };
      }
      if (shift.shiftDate !== logDate) {
        return { success: false, message: 'Shift date must match today for this property' };
      }
      if (shift.userId && shift.userId !== args.userId) {
        return { success: false, message: 'Shift does not belong to this user' };
      }
      if (shift.barId && shift.barId !== args.barId) {
        return { success: false, message: 'Shift is assigned to a different bar' };
      }
    } else {
      shiftId = await findOrCreateFnBShift(ctx, {
        propertyId: args.propertyId,
        userId: args.userId,
        barId: args.barId,
        shiftDate: logDate,
      });
    }

    const openingStock = await lastFinalizedClosingStock(ctx, {
      userId: args.userId,
      barId: args.barId,
      beverageId: args.beverageId,
      beforeDate: logDate,
    });
    const newStockReceived = 0;
    const totalStock = openingStock + newStockReceived;
    const closingStock = args.closingStock ?? totalStock;
    const salesQuantity = totalStock - closingStock;
    if (salesQuantity < 0) {
      return { success: false, message: 'Closing stock cannot be greater than total stock' };
    }

    const salesValue = salesQuantity * beverage.unitPrice;
    const stockLogId = await ctx.db.insert('userStockLogs', {
      propertyId: args.propertyId,
      shiftId,
      userId: args.userId,
      barId: args.barId,
      beverageId: args.beverageId,
      logDate,
      openingStock,
      newStockReceived,
      totalStock,
      closingStock,
      salesQuantity,
      salesValue,
      isFinalized: false,
      lastUpdatedAt: Date.now(),
    });
    await refreshSalesSummariesForLog(ctx, {
      propertyId: args.propertyId,
      barId: args.barId,
      userId: args.userId,
      beverageId: args.beverageId,
      logDate,
      salesQuantity,
      salesValue,
    });

    return { success: true, message: 'User stock log created successfully', id: stockLogId };
  },
});

export const updateUserStockLog = mutation({
  args: {
    stockLogId: v.id('userStockLogs'),
    openingStock: v.number(),
    closingStock: v.number(),
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
      const salesQuantity = totalStock - args.closingStock;
      
      if (salesQuantity < 0) {
        return { success: false, message: 'Closing stock cannot be greater than total stock' };
      }

      const salesValue = salesQuantity * beverage.unitPrice;

      await ctx.db.patch(args.stockLogId, {
        openingStock: args.openingStock,
        totalStock,
        closingStock: args.closingStock,
        salesQuantity,
        salesValue,
        lastUpdatedAt: Date.now(),
      });
      await refreshSalesSummariesForLog(ctx, {
        ...existingLog,
        salesQuantity,
        salesValue,
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

      await ctx.db.patch(args.stockLogId, {
        isFinalized: true,
        lastUpdatedAt: Date.now(),
      });
      await refreshSalesSummariesForLog(ctx, existingLog);

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

    const logs = args.barId
      ? await ctx.db
          .query('userStockLogs')
          .withIndex('by_userId_barId_date', (q) =>
            q.eq('userId', auth.user._id).eq('barId', args.barId!).eq('logDate', logDate),
          )
          .collect()
      : await ctx.db
          .query('userStockLogs')
          .withIndex('by_userId_date', (q) =>
            q.eq('userId', auth.user._id).eq('logDate', logDate),
          )
          .collect();

    const stockLogsWithData = await Promise.all(
      logs.map(async (log) => {
        const [beverage, bar] = await Promise.all([
          ctx.db.get(log.beverageId),
          log.barId ? ctx.db.get(log.barId) : null,
        ]);
        return { ...log, beverage, bar };
      }),
    );

    const beverages = await ctx.db
      .query('beverages')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    const bars = await ctx.db
      .query('bars')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();

    return {
      success: true,
      data: {
        logDate,
        userId: auth.user._id,
        logs: stockLogsWithData,
        beverages: beverages.filter((row) => row.isActive),
        bars: bars.filter((row) => row.isActive),
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

    const existingLog = await ctx.db
      .query('userStockLogs')
      .withIndex('by_userId_barId_bev_date', (q) =>
        q
          .eq('userId', auth.user._id)
          .eq('barId', args.barId)
          .eq('beverageId', args.beverageId)
          .eq('logDate', logDate),
      )
      .first();
    if (existingLog) {
      return { success: false, message: 'This beverage is already on today\'s log' };
    }

    const openingStock = await lastFinalizedClosingStock(ctx, {
      userId: auth.user._id,
      barId: args.barId,
      beverageId: args.beverageId,
      beforeDate: logDate,
    });
    const shiftId = await findOrCreateFnBShift(ctx, {
      propertyId: args.propertyId,
      userId: auth.user._id,
      barId: args.barId,
      shiftDate: logDate,
    });

    const stockLogId = await ctx.db.insert('userStockLogs', {
      propertyId: args.propertyId,
      shiftId,
      userId: auth.user._id,
      barId: args.barId,
      beverageId: args.beverageId,
      logDate,
      openingStock,
      newStockReceived: 0,
      totalStock: openingStock,
      closingStock: openingStock,
      salesQuantity: 0,
      salesValue: 0,
      isFinalized: false,
      lastUpdatedAt: Date.now(),
    });
    await refreshSalesSummariesForLog(ctx, {
      propertyId: args.propertyId,
      barId: args.barId,
      userId: auth.user._id,
      beverageId: args.beverageId,
      logDate,
      salesQuantity: 0,
      salesValue: 0,
    });

    return { success: true, message: 'Beverage added to today\'s log', id: stockLogId };
  },
});

export const saveMyClosingStock = mutation({
  args: {
    stockLogId: v.id('userStockLogs'),
    closingStock: v.number(),
  },
  handler: async (ctx, args) => {
    const existingLog = await ctx.db.get(args.stockLogId);
    if (!existingLog) {
      return { success: false, message: 'User stock log does not exist' };
    }
    const auth = await requirePermission(ctx, 'fnb.update', existingLog.propertyId);
    if (existingLog.userId !== auth.user._id) {
      return { success: false, message: 'You can only update your own stock log' };
    }
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
    const salesQuantity = existingLog.totalStock - args.closingStock;
    if (salesQuantity < 0) {
      return { success: false, message: 'Closing stock cannot be greater than total stock' };
    }

    const salesValue = salesQuantity * beverage.unitPrice;
    await ctx.db.patch(args.stockLogId, {
      closingStock: args.closingStock,
      salesQuantity,
      salesValue,
      lastUpdatedAt: Date.now(),
    });
    await refreshSalesSummariesForLog(ctx, {
      ...existingLog,
      salesQuantity,
      salesValue,
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
    const logDate = await propertyDateKey(ctx, args.propertyId);
    const logs = await ctx.db
      .query('userStockLogs')
      .withIndex('by_userId_barId_date', (q) =>
        q.eq('userId', auth.user._id).eq('barId', args.barId).eq('logDate', logDate),
      )
      .collect();

    if (logs.length === 0) {
      return { success: false, message: 'No stock logs to finalize for today' };
    }

    const now = Date.now();
    const finalized: typeof logs = [];
    for (const log of logs) {
      if (!log.isFinalized) {
        await ctx.db.patch(log._id, { isFinalized: true, lastUpdatedAt: now });
        finalized.push(log);
      }
    }
    await refreshSalesSummariesForLogs(ctx, finalized.length > 0 ? finalized : logs);
    return { success: true, message: 'Today\'s stock logs finalized' };
  },
});

