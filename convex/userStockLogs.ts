import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getAllUserStockLogs = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      const userStockLogs = await ctx.db
        .query('userStockLogs')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();
      
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
    try {
      const stockLog = await ctx.db.get(args.stockLogId);
      if (!stockLog) {
        return { success: false, data: null, message: 'User stock log not found' };
      }
      
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
    shiftId: v.id('shifts'),
    userId: v.id('users'),
    barId: v.id('bars'),
    beverageId: v.id('beverages'),
    logDate: v.string(), // ISO 8601 date string
    openingStock: v.number(),
    closingStock: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      // Verify shift exists and is not finalized
      const shift = await ctx.db.get(args.shiftId);
      if (!shift) {
        return { success: false, message: 'Shift does not exist' };
      }
      
      if (shift.isFinalized) {
        return { success: false, message: 'Cannot add stock log to finalized shift' };
      }

      // Verify beverage exists
      const beverage = await ctx.db.get(args.beverageId);
      if (!beverage) {
        return { success: false, message: 'Beverage does not exist' };
      }

      // Check if stock log already exists for this user, bar, beverage, and date
      const existingLog = await ctx.db
        .query('userStockLogs')
        .withIndex('by_userId_barId_bev_date', (q) =>
          q.eq('userId', args.userId)
           .eq('barId', args.barId)
           .eq('beverageId', args.beverageId)
           .eq('logDate', args.logDate)
        )
        .first();

      if (existingLog) {
        return { success: false, message: 'Stock log already exists for this beverage on this date' };
      }

      // Initialize with no new stock received (will be updated by storeTransactions)
      const newStockReceived = 0;
      const totalStock = args.openingStock + newStockReceived;
      const salesQuantity = totalStock - args.closingStock;
      
      if (salesQuantity < 0) {
        return { success: false, message: 'Closing stock cannot be greater than total stock' };
      }

      const salesValue = salesQuantity * beverage.unitPrice;
      const lastUpdatedAt = Date.now();

      const stockLogId = await ctx.db.insert('userStockLogs', {
        propertyId: args.propertyId,
        shiftId: args.shiftId,
        userId: args.userId,
        barId: args.barId,
        beverageId: args.beverageId,
        logDate: args.logDate,
        openingStock: args.openingStock,
        newStockReceived,
        totalStock,
        closingStock: args.closingStock,
        salesQuantity,
        salesValue,
        isFinalized: false,
        lastUpdatedAt,
      });

      return { success: true, message: 'User stock log created successfully', id: stockLogId };
    } catch (error) {
      console.log(`Failed to create user stock log: ${error}`);
      return { success: false, message: 'Failed to create user stock log' };
    }
  },
});

export const updateUserStockLog = mutation({
  args: {
    stockLogId: v.id('userStockLogs'),
    openingStock: v.number(),
    closingStock: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const existingLog = await ctx.db.get(args.stockLogId);
      if (!existingLog) {
        return { success: false, message: 'User stock log does not exist' };
      }

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
    try {
      const existingLog = await ctx.db.get(args.stockLogId);
      if (!existingLog) {
        return { success: false, message: 'User stock log does not exist' };
      }

      // Check if log is finalized
      if (existingLog.isFinalized) {
        return { success: false, message: 'Cannot delete finalized stock log' };
      }

      await ctx.db.delete(args.stockLogId);
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
    try {
      const existingLog = await ctx.db.get(args.stockLogId);
      if (!existingLog) {
        return { success: false, message: 'User stock log does not exist' };
      }

      // Check if already finalized
      if (existingLog.isFinalized) {
        return { success: false, message: 'Stock log is already finalized' };
      }

      await ctx.db.patch(args.stockLogId, {
        isFinalized: true,
        lastUpdatedAt: Date.now(),
      });

      return { success: true, message: 'User stock log finalized successfully' };
    } catch (error) {
      console.log(`Failed to finalize user stock log: ${error}`);
      return { success: false, message: 'Failed to finalize user stock log' };
    }
  },
});

// New mutation for updating stock when issued from store (called by storeTransactions)
export const updateStockFromIssue = mutation({
  args: {
    userId: v.id('users'),
    barId: v.id('bars'),
    beverageId: v.id('beverages'),
    logDate: v.string(), // ISO 8601 date string
    qty: v.number(),
    propertyId: v.id('properties'),
  },
  handler: async (ctx, args) => {
    try {
      // Get beverage for unit price
      const beverage = await ctx.db.get(args.beverageId);
      if (!beverage) {
        return { success: false, message: 'Beverage does not exist' };
      }

      // Look for existing stock log for today
      const existingLog = await ctx.db
        .query('userStockLogs')
        .withIndex('by_userId_barId_bev_date', (q) =>
          q.eq('userId', args.userId)
           .eq('barId', args.barId)
           .eq('beverageId', args.beverageId)
           .eq('logDate', args.logDate)
        )
        .first();

      if (existingLog) {
        // Check if finalized
        if (existingLog.isFinalized) {
          return { success: false, message: 'Cannot issue stock to finalized day' };
        }

        // Update existing log
        const newStockReceived = existingLog.newStockReceived + args.qty;
        const totalStock = existingLog.openingStock + newStockReceived;
        const salesQuantity = totalStock - existingLog.closingStock;
        
        if (salesQuantity < 0) {
          return { success: false, message: 'Stock issue would result in negative sales' };
        }

        const salesValue = salesQuantity * beverage.unitPrice;

        await ctx.db.patch(existingLog._id, {
          newStockReceived,
          totalStock,
          salesQuantity,
          salesValue,
          lastUpdatedAt: Date.now(),
        });

        return { success: true, message: 'Stock log updated successfully' };
      } else {
        // Create new stock log for today
        // Get opening stock from previous day's closing stock
        const yesterday = new Date(args.logDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const previousLog = await ctx.db
          .query('userStockLogs')
          .withIndex('by_userId_barId_bev_date', (q) =>
            q.eq('userId', args.userId)
             .eq('barId', args.barId)
             .eq('beverageId', args.beverageId)
             .eq('logDate', yesterdayStr)
          )
          .first();

        const openingStock = previousLog?.closingStock || 0;
        const newStockReceived = args.qty;
        const totalStock = openingStock + newStockReceived;
        const closingStock = totalStock; // Assume no sales yet
        const salesQuantity = 0;
        const salesValue = 0;

        // Find or create a shift for today
        let shift = await ctx.db
          .query('shifts')
          .withIndex('by_userId_date', (q) =>
            q.eq('userId', args.userId).eq('shiftDate', args.logDate)
          )
          .first();

        if (!shift) {
          // Create a new shift for today
          const shiftId = await ctx.db.insert('shifts', {
            propertyId: args.propertyId,
            userId: args.userId,
            barId: args.barId,
            shiftDate: args.logDate,
            startTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
            isFinalized: false,
          });
          shift = await ctx.db.get(shiftId);
        }

        const stockLogId = await ctx.db.insert('userStockLogs', {
          propertyId: args.propertyId,
          shiftId: shift!._id,
          userId: args.userId,
          barId: args.barId,
          beverageId: args.beverageId,
          logDate: args.logDate,
          openingStock,
          newStockReceived,
          totalStock,
          closingStock,
          salesQuantity,
          salesValue,
          isFinalized: false,
          lastUpdatedAt: Date.now(),
        });

        return { success: true, message: 'Stock log created successfully', id: stockLogId };
      }
    } catch (error) {
      console.log(`Failed to update stock from issue: ${error}`);
      return { success: false, message: 'Failed to update stock from issue' };
    }
  },
});
