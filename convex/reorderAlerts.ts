import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Queries for reorder alerts
export const getOpenReorderAlerts = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      const alerts = await ctx.db
        .query('reorderAlerts')
        .withIndex('by_propertyId_status', (q) => 
          q.eq('propertyId', args.propertyId).eq('status', 'open')
        )
        .collect();

      // Fetch beverage details for each alert
      const alertsWithBeverages = await Promise.all(
        alerts.map(async (alert) => {
          const beverage = await ctx.db.get(alert.beverageId);
          return {
            ...alert,
            beverage
          };
        })
      );

      return { success: true, data: alertsWithBeverages };
    } catch (error) {
      console.log(`Failed to fetch open reorder alerts: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch reorder alerts' };
    }
  },
});

export const getAllReorderAlerts = query({
  args: { 
    propertyId: v.id('properties'),
    status: v.optional(v.union(v.literal("open"), v.literal("acknowledged"), v.literal("resolved")))
  },
  handler: async (ctx, args) => {
    try {
      let alertsQuery;
      
      if (args.status) {
        alertsQuery = ctx.db
          .query('reorderAlerts')
          .withIndex('by_propertyId_status', (q) => 
            q.eq('propertyId', args.propertyId).eq('status', args.status as "open" | "acknowledged" | "resolved")
          );
      } else {
        alertsQuery = ctx.db
          .query('reorderAlerts')
          .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId));
      }

      const alerts = await alertsQuery.collect();

      // Fetch beverage details for each alert
      const alertsWithBeverages = await Promise.all(
        alerts.map(async (alert) => {
          const beverage = await ctx.db.get(alert.beverageId);
          return {
            ...alert,
            beverage
          };
        })
      );

      return { success: true, data: alertsWithBeverages };
    } catch (error) {
      console.log(`Failed to fetch reorder alerts: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch reorder alerts' };
    }
  },
});

export const getReorderAlert = query({
  args: { alertId: v.id('reorderAlerts') },
  handler: async (ctx, args) => {
    try {
      const alert = await ctx.db.get(args.alertId);
      if (!alert) {
        return { success: false, data: null, message: 'Reorder alert not found' };
      }

      const beverage = await ctx.db.get(alert.beverageId);
      
      return { success: true, data: { ...alert, beverage } };
    } catch (error) {
      console.log(`Failed to fetch reorder alert: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch reorder alert' };
    }
  },
});

export const getReorderAlertsByBeverage = query({
  args: { 
    beverageId: v.id('beverages'),
    propertyId: v.id('properties')
  },
  handler: async (ctx, args) => {
    try {
      const alerts = await ctx.db
        .query('reorderAlerts')
        .withIndex('by_beverageId', (q) => q.eq('beverageId', args.beverageId))
        .collect();

      // Filter by propertyId to ensure data isolation
      const propertyAlerts = alerts.filter(alert => alert.propertyId === args.propertyId);

      return { success: true, data: propertyAlerts };
    } catch (error) {
      console.log(`Failed to fetch reorder alerts for beverage: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch reorder alerts' };
    }
  },
});

// Mutations for reorder alerts
export const createReorderAlert = mutation({
  args: {
    propertyId: v.id('properties'),
    beverageId: v.id('beverages'),
    qtyAtAlert: v.number(),
    reorderLevel: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      // Check if there's already an open alert for this beverage
      const existingOpenAlert = await ctx.db
        .query('reorderAlerts')
        .withIndex('by_beverageId_status', (q) => 
          q.eq('beverageId', args.beverageId).eq('status', 'open')
        )
        .first();

      if (existingOpenAlert) {
        return { success: false, message: 'An open reorder alert already exists for this beverage' };
      }

      const alertId = await ctx.db.insert('reorderAlerts', {
        ...args,
        alertedAt: Date.now(),
        status: 'open',
      });

      return { success: true, data: alertId, message: 'Reorder alert created successfully' };
    } catch (error) {
      console.log(`Failed to create reorder alert: ${error}`);
      return { success: false, message: 'Failed to create reorder alert' };
    }
  },
});

export const acknowledgeReorderAlert = mutation({
  args: { alertId: v.id('reorderAlerts') },
  handler: async (ctx, args) => {
    try {
      const alert = await ctx.db.get(args.alertId);
      if (!alert) {
        return { success: false, message: 'Reorder alert not found' };
      }

      if (alert.status !== 'open') {
        return { success: false, message: 'Only open alerts can be acknowledged' };
      }

      await ctx.db.patch(args.alertId, { status: 'acknowledged' });
      return { success: true, message: 'Reorder alert acknowledged successfully' };
    } catch (error) {
      console.log(`Failed to acknowledge reorder alert: ${error}`);
      return { success: false, message: 'Failed to acknowledge reorder alert' };
    }
  },
});

export const resolveReorderAlert = mutation({
  args: { alertId: v.id('reorderAlerts') },
  handler: async (ctx, args) => {
    try {
      const alert = await ctx.db.get(args.alertId);
      if (!alert) {
        return { success: false, message: 'Reorder alert not found' };
      }

      if (alert.status === 'resolved') {
        return { success: false, message: 'Alert is already resolved' };
      }

      await ctx.db.patch(args.alertId, { status: 'resolved' });
      return { success: true, message: 'Reorder alert resolved successfully' };
    } catch (error) {
      console.log(`Failed to resolve reorder alert: ${error}`);
      return { success: false, message: 'Failed to resolve reorder alert' };
    }
  },
});

// Check and create reorder alert if needed (called from store transactions)
export const checkAndCreateReorderAlert = mutation({
  args: {
    propertyId: v.id('properties'),
    beverageId: v.id('beverages'),
    currentQty: v.number(),
    reorderThreshold: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      // Only create alert if quantity is at or below threshold
      if (args.currentQty > args.reorderThreshold) {
        return { success: true, data: null, message: 'Stock level is sufficient' };
      }

      // Check if there's already an open alert for this beverage
      const existingOpenAlert = await ctx.db
        .query('reorderAlerts')
        .withIndex('by_beverageId_status', (q) => 
          q.eq('beverageId', args.beverageId).eq('status', 'open')
        )
        .first();

      if (existingOpenAlert) {
        return { success: true, data: existingOpenAlert, message: 'Open alert already exists' };
      }

      // Get beverage details to get reorder level
      const beverage = await ctx.db.get(args.beverageId);
      if (!beverage) {
        return { success: false, message: 'Beverage not found' };
      }

      // Create new reorder alert
      const alertId = await ctx.db.insert('reorderAlerts', {
        propertyId: args.propertyId,
        beverageId: args.beverageId,
        qtyAtAlert: args.currentQty,
        reorderLevel: beverage.reorderLevel,
        alertedAt: Date.now(),
        status: 'open',
      });

      return { success: true, data: alertId, message: 'Reorder alert created successfully' };
    } catch (error) {
      console.log(`Failed to check/create reorder alert: ${error}`);
      return { success: false, message: 'Failed to check/create reorder alert' };
    }
  },
});
