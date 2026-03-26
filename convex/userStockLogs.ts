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
          const shift = await ctx.db.get(log.shiftId);
          const beverage = await ctx.db.get(log.beverageId);
          const user = shift ? await ctx.db.get(shift.userId) : null;
          const bar = shift ? await ctx.db.get(shift.barId) : null;
          
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
      
      // Fetch related data
      const shift = await ctx.db.get(stockLog.shiftId);
      const beverage = await ctx.db.get(stockLog.beverageId);
      const user = shift ? await ctx.db.get(shift.userId) : null;
      const bar = shift ? await ctx.db.get(shift.barId) : null;
      
      return { success: true, data: { ...stockLog, shift, beverage, user, bar } };
    } catch (error) {
      console.log(`Failed to fetch user stock log: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch user stock log' };
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
          const beverage = await ctx.db.get(log.beverageId);
          return {
            ...log,
            beverage,
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
    beverageId: v.id('beverages'),
    openingStock: v.number(),
    newStockReceived: v.number(),
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

      // Check if stock log already exists for this shift and beverage
      const existingLog = await ctx.db
        .query('userStockLogs')
        .withIndex('by_shiftId_beverage', (q) =>
          q.eq('shiftId', args.shiftId).eq('beverageId', args.beverageId)
        )
        .first();

      if (existingLog) {
        return { success: false, message: 'Stock log already exists for this beverage in this shift' };
      }

      // Calculate derived fields
      const totalStock = args.openingStock + args.newStockReceived;
      const salesQuantity = totalStock - args.closingStock;
      
      if (salesQuantity < 0) {
        return { success: false, message: 'Closing stock cannot be greater than total stock' };
      }

      const salesValue = salesQuantity * beverage.unitPrice;
      const recordedAt = Date.now();

      const stockLogId = await ctx.db.insert('userStockLogs', {
        propertyId: args.propertyId,
        shiftId: args.shiftId,
        beverageId: args.beverageId,
        openingStock: args.openingStock,
        newStockReceived: args.newStockReceived,
        totalStock,
        closingStock: args.closingStock,
        salesQuantity,
        salesValue,
        recordedAt,
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
    newStockReceived: v.number(),
    closingStock: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const existingLog = await ctx.db.get(args.stockLogId);
      if (!existingLog) {
        return { success: false, message: 'User stock log does not exist' };
      }

      // Verify shift is not finalized
      const shift = await ctx.db.get(existingLog.shiftId);
      if (!shift) {
        return { success: false, message: 'Associated shift does not exist' };
      }
      
      if (shift.isFinalized) {
        return { success: false, message: 'Cannot update stock log for finalized shift' };
      }

      // Get beverage for unit price calculation
      const beverage = await ctx.db.get(existingLog.beverageId);
      if (!beverage) {
        return { success: false, message: 'Associated beverage does not exist' };
      }

      // Calculate derived fields
      const totalStock = args.openingStock + args.newStockReceived;
      const salesQuantity = totalStock - args.closingStock;
      
      if (salesQuantity < 0) {
        return { success: false, message: 'Closing stock cannot be greater than total stock' };
      }

      const salesValue = salesQuantity * beverage.unitPrice;

      await ctx.db.patch(args.stockLogId, {
        openingStock: args.openingStock,
        newStockReceived: args.newStockReceived,
        totalStock,
        closingStock: args.closingStock,
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
    try {
      const existingLog = await ctx.db.get(args.stockLogId);
      if (!existingLog) {
        return { success: false, message: 'User stock log does not exist' };
      }

      // Verify shift is not finalized
      const shift = await ctx.db.get(existingLog.shiftId);
      if (!shift) {
        return { success: false, message: 'Associated shift does not exist' };
      }
      
      if (shift.isFinalized) {
        return { success: false, message: 'Cannot delete stock log for finalized shift' };
      }

      await ctx.db.delete(args.stockLogId);
      return { success: true, message: 'User stock log deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete user stock log: ${error}`);
      return { success: false, message: 'Failed to delete user stock log' };
    }
  },
});
