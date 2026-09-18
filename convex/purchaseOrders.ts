import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission, tryRequirePermission } from './lib/rbac';
import { maybeCreatePutawayTask } from './lib/taskAssignment';
import { postCashOutflow } from './lib/postCashOutflow';

export const getAllPurchaseOrders = query({
  args: { 
    propertyId: v.id('properties'),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'inventory.read', args.propertyId);
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
    const purchaseOrder = await ctx.db.get(args.purchaseOrderId);
    if (!purchaseOrder) {
      return { success: false, data: null, message: 'Purchase order not found' };
    }
    await requirePermission(ctx, 'inventory.read', purchaseOrder.propertyId);
    try {
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
    await requirePermission(ctx, 'inventory.create', args.propertyId);
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
    const existingOrder = await ctx.db.get(args.purchaseOrderId);

    if (!existingOrder) {
      return { success: false, message: 'Purchase order does not exist' };
    }

    const auth = await requirePermission(ctx, 'inventory.update', existingOrder.propertyId);

    try {
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

      if (args.status === 'received' && existingOrder.status !== 'received') {
        const updated = await ctx.db.get(args.purchaseOrderId);
        if (updated) {
          await maybeCreatePutawayTask(ctx, updated, auth.user._id);
        }
      }

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
    const existingOrder = await ctx.db.get(args.purchaseOrderId);

    if (!existingOrder) {
      return { success: false, message: 'Purchase order does not exist' };
    }

    await requirePermission(ctx, 'inventory.delete', existingOrder.propertyId);

    try {
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

const paymentMethodValidator = v.union(
  v.literal('cash'),
  v.literal('card'),
  v.literal('bank_transfer'),
  v.literal('check'),
);

export const markPurchaseOrderPaid = mutation({
  args: {
    purchaseOrderId: v.id('purchaseOrders'),
    paymentMethod: paymentMethodValidator,
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.purchaseOrderId);
    if (!order) {
      return { success: false, message: 'Purchase order not found' };
    }
    const auth =
      (await tryRequirePermission(ctx, 'inventory.po.pay', order.propertyId))
      ?? (await tryRequirePermission(ctx, 'expenses.create', order.propertyId));
    if (!auth) {
      throw new Error('Unauthorized');
    }
    if (order.status === 'cancelled') {
      return { success: false, message: 'Cannot pay a cancelled purchase order' };
    }
    if (order.expenseId && order.paidAt) {
      return { success: true, message: 'Purchase order already marked as paid' };
    }
    if (!order.totalAmount || order.totalAmount <= 0) {
      return { success: false, message: 'Purchase order total must be greater than 0' };
    }
    const supplier = await ctx.db.get(order.supplierId);
    const now = Date.now();
    const posted = await postCashOutflow(ctx, {
      propertyId: order.propertyId,
      sourceType: 'PurchaseOrder',
      sourceId: order._id,
      amount: order.totalAmount,
      category: 'supplies',
      description: `PO ${order.orderNumber}`,
      vendor: supplier?.name,
      paymentMethod: args.paymentMethod,
      paymentType: 'PurchaseOrder',
      createdBy: auth.user._id,
      expenseDate: now,
    });
    await ctx.db.patch(order._id, {
      paidAt: order.paidAt ?? now,
      paymentMethod: args.paymentMethod,
      expenseId: posted.expenseId,
      updatedAt: now,
    });
    return {
      success: true,
      message: posted.alreadyPosted
        ? 'Purchase order already marked as paid'
        : 'Purchase order marked as paid',
    };
  },
});

// Purchase Order Lines
export const getPurchaseOrderLines = query({
  args: { purchaseOrderId: v.id('purchaseOrders') },
  handler: async (ctx, args) => {
    const purchaseOrder = await ctx.db.get(args.purchaseOrderId);
    if (!purchaseOrder) {
      return { success: false, data: [], message: 'Purchase order not found' };
    }
    await requirePermission(ctx, 'inventory.read', purchaseOrder.propertyId);
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
    const purchaseOrderLine = await ctx.db.get(args.purchaseOrderLineId);
    if (!purchaseOrderLine) {
      return { success: false, data: null, message: 'Purchase order line not found' };
    }
    await requirePermission(ctx, 'inventory.read', purchaseOrderLine.propertyId);
    try {
      const inventoryItem = await ctx.db.get(purchaseOrderLine.inventoryItemId);
      const purchaseOrder = await ctx.db.get(purchaseOrderLine.purchaseOrderId);
      
      return { success: true, data: { ...purchaseOrderLine, inventoryItem, purchaseOrder } };
    } catch (error) {
      console.log(`Failed to fetch purchase order line: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch purchase order line' };
    }
  },
});
