import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/rbac';
import { maybeCreateRestockTask } from './lib/taskAssignment';
import { postInventoryTransaction } from './lib/inventoryStock';
import { currentUsersStaff } from './lib/staffAccess';

export const getAllInventoryItems = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'inventory.read', args.propertyId);
    try {
      const inventoryItems = await ctx.db
        .query('inventoryItems')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();
      
      // Fetch suppliers for each inventory item
      const itemsWithSuppliers = await Promise.all(
        inventoryItems.map(async (item) => {
          const supplier = item.supplierId ? await ctx.db.get(item.supplierId) : null;
          return {
            ...item,
            supplier,
          };
        })
      );
      
      return { success: true, data: itemsWithSuppliers };
    } catch (error) {
      console.log(`Failed to fetch inventory items: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch inventory items' };
    }
  },
});

export const getInventoryItem = query({
  args: { inventoryItemId: v.id('inventoryItems') },
  handler: async (ctx, args) => {
    const inventoryItem = await ctx.db.get(args.inventoryItemId);
    if (!inventoryItem) {
      return { success: false, data: null, message: 'Inventory item not found' };
    }
    await requirePermission(ctx, 'inventory.read', inventoryItem.propertyId);
    try {
      // Fetch related data
      const supplier = inventoryItem.supplierId ? await ctx.db.get(inventoryItem.supplierId) : null;
      
      return { success: true, data: { ...inventoryItem, supplier } };
    } catch (error) {
      console.log(`Failed to fetch inventory item: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch inventory item' };
    }
  },
});

export const createInventoryItem = mutation({
  args: {
    propertyId: v.id('properties'),
    supplierId: v.optional(v.id('suppliers')),
    sku: v.string(),
    name: v.string(),
    category: v.string(),
    unit: v.string(),
    openingQuantity: v.optional(v.number()),
    reorderPoint: v.optional(v.number()),
    reorderQuantity: v.optional(v.number()),
    unitCost: v.optional(v.number()),
    location: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'inventory.create', args.propertyId);
    try {
      // Check if SKU already exists for this property
      const existingItem = await ctx.db
        .query('inventoryItems')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .filter((q) => q.eq(q.field('sku'), args.sku))
        .first();

      if (existingItem) {
        return { success: false, message: 'SKU already exists for this property' };
      }

      // Verify supplier exists if provided
      if (args.supplierId) {
        const supplier = await ctx.db.get(args.supplierId);
        if (!supplier || supplier.propertyId !== args.propertyId) {
          return { success: false, message: 'Supplier does not exist' };
        }
      }

      const openingQuantity = args.openingQuantity ?? 0;
      if (openingQuantity < 0) {
        return { success: false, message: 'Opening quantity cannot be negative' };
      }

      const now = Date.now();
      const inventoryItemId = await ctx.db.insert('inventoryItems', {
        propertyId: args.propertyId,
        supplierId: args.supplierId,
        sku: args.sku,
        name: args.name,
        category: args.category,
        unit: args.unit,
        currentQuantity: 0,
        reorderPoint: args.reorderPoint,
        reorderQuantity: args.reorderQuantity,
        unitCost: args.unitCost,
        lastCostUpdate: args.unitCost ? now : undefined,
        location: args.location,
        isActive: args.isActive,
        createdAt: now,
        updatedAt: now,
      });

      if (openingQuantity > 0) {
        const staff = await currentUsersStaff(ctx, auth.user._id);
        const posted = await postInventoryTransaction(ctx, {
          inventoryItemId,
          transactionType: 'adjustment',
          quantity: openingQuantity,
          unitCost: args.unitCost,
          referenceType: 'OpeningBalance',
          referenceId: inventoryItemId,
          reason: 'Opening balance',
          performedBy: staff?._id,
          transactionDate: now,
        });
        if (!posted.success) {
          return { success: false, message: posted.message };
        }
      }

      const createdItem = await ctx.db.get(inventoryItemId);
      if (createdItem) await maybeCreateRestockTask(ctx, createdItem);

      return { success: true, message: 'Inventory item created successfully', id: inventoryItemId };
    } catch (error) {
      console.log(`Failed to create inventory item: ${error}`);
      return { success: false, message: 'Failed to create inventory item' };
    }
  },
});

export const updateInventoryItem = mutation({
  args: {
    inventoryItemId: v.id('inventoryItems'),
    supplierId: v.optional(v.id('suppliers')),
    sku: v.string(),
    name: v.string(),
    category: v.string(),
    unit: v.string(),
    reorderPoint: v.optional(v.number()),
    reorderQuantity: v.optional(v.number()),
    unitCost: v.optional(v.number()),
    location: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existingItem = await ctx.db.get(args.inventoryItemId);

    if (!existingItem) {
      return { success: false, message: 'Inventory item does not exist' };
    }

    await requirePermission(ctx, 'inventory.update', existingItem.propertyId);

    try {
      // Check if SKU is being changed and if new SKU already exists
      if (args.sku !== existingItem.sku) {
        const duplicateItem = await ctx.db
          .query('inventoryItems')
          .withIndex('by_propertyId', (q) => q.eq('propertyId', existingItem.propertyId))
          .filter((q) => q.eq(q.field('sku'), args.sku))
          .first();

        if (duplicateItem) {
          return { success: false, message: 'SKU already exists for this property' };
        }
      }

      // Verify supplier exists if provided
      if (args.supplierId) {
        const supplier = await ctx.db.get(args.supplierId);
        if (!supplier || supplier.propertyId !== existingItem.propertyId) {
          return { success: false, message: 'Supplier does not exist' };
        }
      }

      const now = Date.now();
      const updateData: any = {
        supplierId: args.supplierId,
        sku: args.sku,
        name: args.name,
        category: args.category,
        unit: args.unit,
        reorderPoint: args.reorderPoint,
        reorderQuantity: args.reorderQuantity,
        location: args.location,
        isActive: args.isActive,
        updatedAt: now,
      };

      // Update unitCost and lastCostUpdate if unitCost is provided
      if (args.unitCost !== undefined) {
        updateData.unitCost = args.unitCost;
        updateData.lastCostUpdate = now;
      }

      await ctx.db.patch(args.inventoryItemId, updateData);

      const updatedItem = await ctx.db.get(args.inventoryItemId);
      if (updatedItem) await maybeCreateRestockTask(ctx, updatedItem);

      return { success: true, message: 'Inventory item updated successfully' };
    } catch (error) {
      console.log(`Failed to update inventory item: ${error}`);
      return { success: false, message: 'Failed to update inventory item' };
    }
  },
});

export const deleteInventoryItem = mutation({
  args: { inventoryItemId: v.id('inventoryItems') },
  handler: async (ctx, args) => {
    const existingItem = await ctx.db.get(args.inventoryItemId);

    if (!existingItem) {
      return { success: false, message: 'Inventory item does not exist' };
    }

    await requirePermission(ctx, 'inventory.delete', existingItem.propertyId);

    try {
      // Check if inventory item has transactions
      const hasTransactions = await ctx.db
        .query('inventoryTransactions')
        .withIndex('by_inventoryItemId', (q) => q.eq('inventoryItemId', args.inventoryItemId))
        .first();

      if (hasTransactions) {
        return { success: false, message: 'Cannot delete inventory item - has associated transactions' };
      }

      // Check if inventory item is used in purchase orders
      const hasPurchaseOrders = await ctx.db
        .query('purchaseOrderLines')
        .withIndex('by_inventoryItemId', (q) => q.eq('inventoryItemId', args.inventoryItemId))
        .first();

      if (hasPurchaseOrders) {
        return { success: false, message: 'Cannot delete inventory item - is used in purchase orders' };
      }

      const hasTasks = await ctx.db
        .query('inventoryTasks')
        .withIndex('by_inventoryItemId', (q) => q.eq('inventoryItemId', args.inventoryItemId))
        .first();
      if (hasTasks) {
        return { success: false, message: 'Cannot delete inventory item - has inventory tasks' };
      }

      const hasParts = await ctx.db
        .query('maintenanceOrderParts')
        .withIndex('by_inventoryItemId', (q) => q.eq('inventoryItemId', args.inventoryItemId))
        .first();
      if (hasParts) {
        return { success: false, message: 'Cannot delete inventory item - is used on maintenance orders' };
      }

      await ctx.db.delete(args.inventoryItemId);
      return { success: true, message: 'Inventory item deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete inventory item: ${error}`);
      return { success: false, message: 'Failed to delete inventory item' };
    }
  },
});

export const getPropertyCurrency = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'inventory.read', args.propertyId);
    const property = await ctx.db.get(args.propertyId);
    return property?.currency || 'USD';
  },
});

export const getInventoryDashboard = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'inventory.read', args.propertyId);
    const items = await ctx.db
      .query('inventoryItems')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    const orders = await ctx.db
      .query('purchaseOrders')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    const tasks = await ctx.db
      .query('inventoryTasks')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();

    const activeItems = items.filter((item) => item.isActive);
    const lowStock = activeItems
      .filter((item) => item.reorderPoint !== undefined && item.currentQuantity <= item.reorderPoint)
      .sort((a, b) => a.currentQuantity - b.currentQuantity);
    const stockValue = activeItems.reduce(
      (sum, item) => sum + item.currentQuantity * (item.unitCost ?? 0),
      0,
    );
    const openStatuses = new Set(['draft', 'sent', 'confirmed']);
    const openOrders = orders.filter((order) => openStatuses.has(order.status));
    const now = Date.now();
    const overdueTasks = tasks.filter(
      (task) => (task.status === 'pending' || task.status === 'in-progress') && task.dueAt < now,
    );

    const incoming: Array<{
      _id: typeof orders[number]['_id'];
      orderNumber: string;
      supplierName: string;
      status: string;
      outstandingQty: number;
      expectedDeliveryDate?: number;
    }> = [];
    for (const order of orders) {
      if (order.status === 'cancelled' || order.status === 'received') continue;
      const lines = await ctx.db
        .query('purchaseOrderLines')
        .withIndex('by_purchaseOrderId', (q) => q.eq('purchaseOrderId', order._id))
        .collect();
      const outstanding = lines.reduce(
        (sum, line) => sum + Math.max(0, line.quantity - (line.receivedQuantity ?? 0)),
        0,
      );
      if (outstanding > 0) {
        const supplier = await ctx.db.get(order.supplierId);
        incoming.push({
          _id: order._id,
          orderNumber: order.orderNumber,
          supplierName: supplier?.name ?? 'Supplier',
          status: order.status,
          outstandingQty: outstanding,
          expectedDeliveryDate: order.expectedDeliveryDate,
        });
      }
    }

    const overdueWithItems = await Promise.all(
      overdueTasks.slice(0, 8).map(async (task) => {
        const item = await ctx.db.get(task.inventoryItemId);
        return {
          _id: task._id,
          taskType: task.taskType,
          dueAt: task.dueAt,
          status: task.status,
          itemName: item?.name ?? 'Item',
        };
      }),
    );

    return {
      success: true,
      data: {
        itemCount: items.length,
        activeItemCount: activeItems.length,
        lowStockCount: lowStock.length,
        stockValue,
        openPoCount: openOrders.length,
        openPoValue: openOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        overdueTaskCount: overdueTasks.length,
        lowStock: lowStock.slice(0, 8).map((item) => ({
          _id: item._id,
          sku: item.sku,
          name: item.name,
          unit: item.unit,
          currentQuantity: item.currentQuantity,
          reorderPoint: item.reorderPoint,
          location: item.location,
        })),
        openOrders: openOrders.slice(0, 8).map((order) => ({
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: order.totalAmount,
          expectedDeliveryDate: order.expectedDeliveryDate,
        })),
        overdueTasks: overdueWithItems,
        incoming,
      },
    };
  },
});
