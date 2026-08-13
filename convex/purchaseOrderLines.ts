import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/rbac';

// Get all purchase order lines for a property
export const getAllPurchaseOrderLines = query({
  args: {
    propertyId: v.id('properties')
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'inventory.read', args.propertyId);
    try {
      // First get all purchase orders for this property
      const purchaseOrders = await ctx.db
        .query('purchaseOrders')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();

      // Get all purchase order IDs
      const purchaseOrderIds = purchaseOrders.map(po => po._id);

      // Get all lines for these purchase orders
      const allLines: any[] = [];
      for (const poId of purchaseOrderIds) {
        const lines = await ctx.db
          .query('purchaseOrderLines')
          .withIndex('by_purchaseOrderId', (q) => q.eq('purchaseOrderId', poId))
          .collect();
        allLines.push(...lines);
      }

      // Enrich lines with inventory and purchase order data
      const enrichedLines = await Promise.all(allLines.map(async (line) => {
        const inventoryItem = await ctx.db.get(line.inventoryItemId);
        const purchaseOrder = await ctx.db.get(line.purchaseOrderId);
        return { ...line, inventoryItem, purchaseOrder };
      }));

      return { success: true, data: enrichedLines };
    } catch (error) {
      console.log(`Failed to fetch purchase order lines: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch purchase order lines' };
    }
  },
});

// Get purchase order lines for a specific purchase order
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

// Get single purchase order line
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

export const createPurchaseOrderLine = mutation({
  args: {
    propertyId: v.id('properties'),
    purchaseOrderId: v.id('purchaseOrders'),
    inventoryItemId: v.id('inventoryItems'),
    quantity: v.number(),
    unitPrice: v.number(),
    totalPrice: v.number(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'inventory.create', args.propertyId);
    try {
      const purchaseOrderLineId = await ctx.db.insert('purchaseOrderLines', {
        propertyId: args.propertyId,
        purchaseOrderId: args.purchaseOrderId,
        inventoryItemId: args.inventoryItemId,
        quantity: args.quantity,
        unitPrice: args.unitPrice,
        totalPrice: args.totalPrice,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return { success: true, message: 'Purchase order line created successfully', id: purchaseOrderLineId };
    } catch (error) {
      console.log(`Failed to create purchase order line: ${error}`);
      return { success: false, message: 'Failed to create purchase order line' };
    }
  },
});

export const updatePurchaseOrderLine = mutation({
  args: {
    purchaseOrderLineId: v.id('purchaseOrderLines'),
    quantity: v.number(),
    unitPrice: v.number(),
    totalPrice: v.number(),
    receivedQuantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existingLine = await ctx.db.get(args.purchaseOrderLineId);

    if (!existingLine) {
      return { success: false, message: 'Purchase order line does not exist' };
    }

    await requirePermission(ctx, 'inventory.update', existingLine.propertyId);

    try {
      await ctx.db.patch(args.purchaseOrderLineId, {
        quantity: args.quantity,
        unitPrice: args.unitPrice,
        totalPrice: args.totalPrice,
        receivedQuantity: args.receivedQuantity,
        updatedAt: Date.now(),
      });

      return { success: true, message: 'Purchase order line updated successfully' };
    } catch (error) {
      console.log(`Failed to update purchase order line: ${error}`);
      return { success: false, message: 'Failed to update purchase order line' };
    }
  },
});

export const deletePurchaseOrderLine = mutation({
  args: { purchaseOrderLineId: v.id('purchaseOrderLines') },
  handler: async (ctx, args) => {
    const existingLine = await ctx.db.get(args.purchaseOrderLineId);

    if (!existingLine) {
      return { success: false, message: 'Purchase order line does not exist' };
    }

    await requirePermission(ctx, 'inventory.delete', existingLine.propertyId);

    try {
      await ctx.db.delete(args.purchaseOrderLineId);
      return { success: true, message: 'Purchase order line deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete purchase order line: ${error}`);
      return { success: false, message: 'Failed to delete purchase order line' };
    }
  },
});
