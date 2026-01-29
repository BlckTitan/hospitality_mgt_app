import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getAllPurchaseOrders = query({
  args: { 
    propertyId: v.id('properties'),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      let queryBuilder = ctx.db
        .query('purchaseOrders')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId));
      
      if (args.status) {
        queryBuilder = queryBuilder.filter((q) => q.eq(q.field('status'), args.status));
      }
      
      const purchaseOrders = await queryBuilder.collect();
      
      // Enrich with supplier and lines data
      const enrichedOrders = await Promise.all(purchaseOrders.map(async (order) => {
        const supplier = await ctx.db.get(order.supplierId);
        const lines = await ctx.db
          .query('purchaseOrderLines')
          .withIndex('by_purchaseOrderId', (q) => q.eq('purchaseOrderId', order._id))
          .collect();
        
        return { ...order, supplier, lines };
      }));
      
      return { success: true, data: enrichedOrders };
    } catch (error) {
      console.log(`Failed to fetch purchase orders: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch purchase orders' };
    }
  },
});

export const getPurchaseOrder = query({
  args: { purchaseOrderId: v.id('purchaseOrders') },
  handler: async (ctx, args) => {
    try {
      const purchaseOrder = await ctx.db.get(args.purchaseOrderId);
      if (!purchaseOrder) {
        return { success: false, data: null, message: 'Purchase order not found' };
      }
      
      const supplier = await ctx.db.get(purchaseOrder.supplierId);
      const lines = await ctx.db
        .query('purchaseOrderLines')
        .withIndex('by_purchaseOrderId', (q) => q.eq('purchaseOrderId', args.purchaseOrderId))
        .collect();
      
      // Enrich lines with inventory item details
      const enrichedLines = await Promise.all(lines.map(async (line) => {
        const inventoryItem = await ctx.db.get(line.inventoryItemId);
        return { ...line, inventoryItem };
      }));
      
      return { success: true, data: { ...purchaseOrder, supplier, lines: enrichedLines } };
    } catch (error) {
      console.log(`Failed to fetch purchase order: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch purchase order' };
    }
  },
});

export const createPurchaseOrder = mutation({
  args: {
    propertyId: v.id('properties'),
    supplierId: v.id('suppliers'),
    orderNumber: v.string(),
    orderDate: v.number(),
    expectedDeliveryDate: v.optional(v.number()),
    status: v.string(),
    subtotal: v.number(),
    taxAmount: v.number(),
    shippingAmount: v.optional(v.number()),
    totalAmount: v.number(),
    createdBy: v.id('staffs'),
  },
  handler: async (ctx, args) => {
    try {
      // Check if order number already exists for this property
      const existingOrder = await ctx.db
        .query('purchaseOrders')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .filter((q) => q.eq(q.field('orderNumber'), args.orderNumber))
        .first();

      if (existingOrder) {
        return { success: false, message: 'Purchase order number already exists for this property' };
      }

      const now = Date.now();
      const purchaseOrderId = await ctx.db.insert('purchaseOrders', {
        propertyId: args.propertyId,
        supplierId: args.supplierId,
        orderNumber: args.orderNumber,
        orderDate: args.orderDate,
        expectedDeliveryDate: args.expectedDeliveryDate,
        status: args.status,
        subtotal: args.subtotal,
        taxAmount: args.taxAmount,
        shippingAmount: args.shippingAmount,
        totalAmount: args.totalAmount,
        createdBy: args.createdBy,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, message: 'Purchase order created successfully', id: purchaseOrderId };
    } catch (error) {
      console.log(`Failed to create purchase order: ${error}`);
      return { success: false, message: 'Failed to create purchase order' };
    }
  },
});

export const updatePurchaseOrder = mutation({
  args: {
    purchaseOrderId: v.id('purchaseOrders'),
    supplierId: v.id('suppliers'),
    orderNumber: v.string(),
    orderDate: v.number(),
    expectedDeliveryDate: v.optional(v.number()),
    status: v.string(),
    subtotal: v.number(),
    taxAmount: v.number(),
    shippingAmount: v.optional(v.number()),
    totalAmount: v.number(),
    approvedBy: v.optional(v.id('staffs')),
    approvedAt: v.optional(v.number()),
    receivedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const existingOrder = await ctx.db.get(args.purchaseOrderId);

      if (!existingOrder) {
        return { success: false, message: 'Purchase order does not exist' };
      }

      // Check if order number is being changed and if new number already exists
      if (args.orderNumber !== existingOrder.orderNumber) {
        const duplicateOrder = await ctx.db
          .query('purchaseOrders')
          .withIndex('by_propertyId', (q) => q.eq('propertyId', existingOrder.propertyId))
          .filter((q) => q.eq(q.field('orderNumber'), args.orderNumber))
          .first();

        if (duplicateOrder) {
          return { success: false, message: 'Purchase order number already exists for this property' };
        }
      }

      const now = Date.now();
      await ctx.db.patch(args.purchaseOrderId, {
        supplierId: args.supplierId,
        orderNumber: args.orderNumber,
        orderDate: args.orderDate,
        expectedDeliveryDate: args.expectedDeliveryDate,
        status: args.status,
        subtotal: args.subtotal,
        taxAmount: args.taxAmount,
        shippingAmount: args.shippingAmount,
        totalAmount: args.totalAmount,
        approvedBy: args.approvedBy,
        approvedAt: args.approvedAt,
        receivedAt: args.receivedAt,
        updatedAt: now,
      });

      return { success: true, message: 'Purchase order updated successfully' };
    } catch (error) {
      console.log(`Failed to update purchase order: ${error}`);
      return { success: false, message: 'Failed to update purchase order' };
    }
  },
});

export const deletePurchaseOrder = mutation({
  args: { purchaseOrderId: v.id('purchaseOrders') },
  handler: async (ctx, args) => {
    try {
      const existingOrder = await ctx.db.get(args.purchaseOrderId);

      if (!existingOrder) {
        return { success: false, message: 'Purchase order does not exist' };
      }

      // Delete associated purchase order lines
      const lines = await ctx.db
        .query('purchaseOrderLines')
        .withIndex('by_purchaseOrderId', (q) => q.eq('purchaseOrderId', args.purchaseOrderId))
        .collect();

      for (const line of lines) {
        await ctx.db.delete(line._id);
      }

      await ctx.db.delete(args.purchaseOrderId);
      return { success: true, message: 'Purchase order deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete purchase order: ${error}`);
      return { success: false, message: 'Failed to delete purchase order' };
    }
  },
});

// Purchase Order Lines
export const getPurchaseOrderLines = query({
  args: { purchaseOrderId: v.id('purchaseOrders') },
  handler: async (ctx, args) => {
    try {
      const lines = await ctx.db
        .query('purchaseOrderLines')
        .withIndex('by_purchaseOrderId', (q) => q.eq('purchaseOrderId', args.purchaseOrderId))
        .collect();

      const enrichedLines = await Promise.all(lines.map(async (line) => {
        const inventoryItem = await ctx.db.get(line.inventoryItemId);
        return { ...line, inventoryItem };
      }));

      return { success: true, data: enrichedLines };
    } catch (error) {
      console.log(`Failed to fetch purchase order lines: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch purchase order lines' };
    }
  },
});

export const getPurchaseOrderLine = query({
  args: { purchaseOrderLineId: v.id('purchaseOrderLines') },
  handler: async (ctx, args) => {
    try {
      const purchaseOrderLine = await ctx.db.get(args.purchaseOrderLineId);
      if (!purchaseOrderLine) {
        return { success: false, data: null, message: 'Purchase order line not found' };
      }
      
      const inventoryItem = await ctx.db.get(purchaseOrderLine.inventoryItemId);
      const purchaseOrder = await ctx.db.get(purchaseOrderLine.purchaseOrderId);
      
      return { success: true, data: { ...purchaseOrderLine, inventoryItem, purchaseOrder } };
    } catch (error) {
      console.log(`Failed to fetch purchase order line: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch purchase order line' };
    }
  },
});
