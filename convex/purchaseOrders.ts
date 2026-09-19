import { mutation, query, MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission, tryRequirePermission } from './lib/rbac';
import { maybeCreatePutawayTask } from './lib/taskAssignment';
import { postCashOutflow } from './lib/postCashOutflow';
import { currentUsersStaff } from './lib/staffAccess';
import { postInventoryTransaction, postedPurchaseQtyForLine } from './lib/inventoryStock';
import { Doc, Id } from './_generated/dataModel';

async function receiveLinesIntoStock(
  ctx: MutationCtx,
  order: Doc<'purchaseOrders'>,
  performedBy?: Id<'staffs'>,
  requested?: Array<{ purchaseOrderLineId: Id<'purchaseOrderLines'>; receivedQuantity: number }>,
) {
  const lines = await ctx.db
    .query('purchaseOrderLines')
    .withIndex('by_purchaseOrderId', (q) => q.eq('purchaseOrderId', order._id))
    .collect();
  const requestedById = new Map(
    (requested ?? []).map((row) => [row.purchaseOrderLineId, row.receivedQuantity]),
  );

  for (const line of lines) {
    const alreadyPosted = await postedPurchaseQtyForLine(ctx, line._id);
    const target = requested
      ? (requestedById.get(line._id) ?? alreadyPosted)
      : line.quantity;
    if (target + 1e-9 < alreadyPosted) {
      return { success: false as const, message: 'Received quantity cannot be less than stock already posted for a line' };
    }
    const delta = target - alreadyPosted;
    if (delta > 0) {
      const posted = await postInventoryTransaction(ctx, {
        inventoryItemId: line.inventoryItemId,
        transactionType: 'purchase',
        quantity: delta,
        unitCost: line.unitPrice,
        referenceType: 'PurchaseOrderLine',
        referenceId: line._id,
        reason: `Received on PO ${order.orderNumber}`,
        performedBy,
      });
      if (!posted.success) {
        return posted;
      }
    }
    await ctx.db.patch(line._id, {
      receivedQuantity: Math.max(alreadyPosted + Math.max(0, delta), target),
      updatedAt: Date.now(),
    });
  }
  return { success: true as const };
}

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
    createdBy: v.optional(v.id('staffs')),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'inventory.create', args.propertyId);
    try {
      const supplier = await ctx.db.get(args.supplierId);
      if (!supplier || supplier.propertyId !== args.propertyId) {
        return { success: false, message: 'Supplier does not exist for this property' };
      }
      const staff = args.createdBy
        ? await ctx.db.get(args.createdBy)
        : await currentUsersStaff(ctx, auth.user._id);
      if (!staff) {
        return { success: false, message: 'Link your login to a staff record before creating a purchase order' };
      }

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
        status: args.status === 'received' ? 'confirmed' : args.status,
        subtotal: args.subtotal,
        taxAmount: args.taxAmount,
        shippingAmount: args.shippingAmount,
        totalAmount: args.totalAmount,
        createdBy: staff._id,
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
      if (args.status === 'received' && existingOrder.status !== 'received') {
        const staff = await currentUsersStaff(ctx, auth.user._id);
        const received = await receiveLinesIntoStock(ctx, existingOrder, staff?._id);
        if (!received.success) {
          return { success: false, message: received.message };
        }
      }

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
        receivedAt: args.status === 'received' ? (args.receivedAt ?? existingOrder.receivedAt ?? now) : args.receivedAt,
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

      if (lines.some((line) => (line.receivedQuantity ?? 0) > 0) || existingOrder.status === 'received') {
        return { success: false, message: 'Cannot delete a purchase order after goods have been received' };
      }

      const tasks = await ctx.db
        .query('inventoryTasks')
        .withIndex('by_purchaseOrderId', (q) => q.eq('purchaseOrderId', args.purchaseOrderId))
        .collect();
      for (const task of tasks) {
        await ctx.db.delete(task._id);
      }

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

export const receivePurchaseOrder = mutation({
  args: {
    purchaseOrderId: v.id('purchaseOrders'),
    lines: v.optional(v.array(v.object({
      purchaseOrderLineId: v.id('purchaseOrderLines'),
      receivedQuantity: v.number(),
    }))),
    markReceived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.purchaseOrderId);
    if (!order) {
      return { success: false, message: 'Purchase order does not exist' };
    }
    const auth = await requirePermission(ctx, 'inventory.update', order.propertyId);
    if (order.status === 'cancelled') {
      return { success: false, message: 'Cannot receive a cancelled purchase order' };
    }
    const staff = await currentUsersStaff(ctx, auth.user._id);
    const received = await receiveLinesIntoStock(ctx, order, staff?._id, args.lines);
    if (!received.success) {
      return { success: false, message: received.message };
    }

    const now = Date.now();
    const lines = await ctx.db
      .query('purchaseOrderLines')
      .withIndex('by_purchaseOrderId', (q) => q.eq('purchaseOrderId', order._id))
      .collect();
    const fullyReceived = lines.length > 0 && lines.every(
      (line) => (line.receivedQuantity ?? 0) + 1e-9 >= line.quantity,
    );
    if (args.markReceived || fullyReceived) {
      await ctx.db.patch(order._id, {
        status: 'received',
        receivedAt: order.receivedAt ?? now,
        updatedAt: now,
      });
      const updated = await ctx.db.get(order._id);
      if (updated) {
        await maybeCreatePutawayTask(ctx, updated, auth.user._id);
      }
    }

    return { success: true, message: fullyReceived || args.markReceived
      ? 'Goods received and stock updated'
      : 'Partial receipt posted to stock' };
  },
});
