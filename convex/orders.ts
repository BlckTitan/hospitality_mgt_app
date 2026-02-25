import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Query all orders for a property
 */
export const getAllOrders = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    try {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
        .order("desc")
        .collect();

      // Fetch order lines for each order
      const ordersWithLines = await Promise.all(
        orders.map(async (order) => {
          const orderLines = await ctx.db
            .query("orderLines")
            .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
            .collect();

          return {
            ...order,
            lineCount: orderLines.length,
          };
        })
      );

      return { success: true, data: ordersWithLines };
    } catch (error) {
      console.log(`Failed to fetch orders: ${error}`);
      return { success: false, data: [], message: "Failed to fetch orders" };
    }
  },
});

/**
 * Query orders by status
 */
export const getOrdersByStatus = query({
  args: {
    propertyId: v.id("properties"),
    status: v.union(
      v.literal("pending"),
      v.literal("in-progress"),
      v.literal("ready"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    try {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_propertyId_status", (q) =>
          q.eq("propertyId", args.propertyId).eq("status", args.status)
        )
        .order("desc")
        .collect();

      return { success: true, data: orders };
    } catch (error) {
      console.log(`Failed to fetch orders by status: ${error}`);
      return {
        success: false,
        data: [],
        message: "Failed to fetch orders by status",
      };
    }
  },
});

/**
 * Query orders by table
 */
export const getTableOrders = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    try {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_tableId", (q) => q.eq("tableId", args.tableId))
        .order("desc")
        .collect();

      return { success: true, data: orders };
    } catch (error) {
      console.log(`Failed to fetch table orders: ${error}`);
      return {
        success: false,
        data: [],
        message: "Failed to fetch table orders",
      };
    }
  },
});

/**
 * Query orders by reservation
 */
export const getReservationOrders = query({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, args) => {
    try {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_reservationId", (q) =>
          q.eq("reservationId", args.reservationId)
        )
        .order("desc")
        .collect();

      return { success: true, data: orders };
    } catch (error) {
      console.log(`Failed to fetch reservation orders: ${error}`);
      return {
        success: false,
        data: [],
        message: "Failed to fetch reservation orders",
      };
    }
  },
});

/**
 * Get a single order with details
 */
export const getOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    try {
      const order = await ctx.db.get(args.orderId);

      if (!order) {
        return { success: false, data: null, message: "Order not found" };
      }

      // Fetch order lines
      const orderLines = await ctx.db
        .query("orderLines")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
        .collect();

      // Fetch menu items for each line
      const orderLinesWithItems = await Promise.all(
        orderLines.map(async (line) => {
          const menuItem = await ctx.db.get(line.menuItemId);
          return {
            ...line,
            menuItem,
          };
        })
      );

      // Fetch associated table if dine-in
      let table = null;
      if (order.tableId) {
        table = await ctx.db.get(order.tableId);
      }

      // Fetch associated reservation if room service
      let reservation = null;
      if (order.reservationId) {
        reservation = await ctx.db.get(order.reservationId);
      }

      // Fetch server details
      let server = null;
      if (order.serverId) {
        server = await ctx.db.get(order.serverId);
      }

      return {
        success: true,
        data: {
          ...order,
          orderLines: orderLinesWithItems,
          table,
          reservation,
          server,
        },
      };
    } catch (error) {
      console.log(`Failed to fetch order: ${error}`);
      return { success: false, data: null, message: "Failed to fetch order" };
    }
  },
});

/**
 * Create a new order
 */
export const createOrder = mutation({
  args: {
    propertyId: v.id("properties"),
    tableId: v.optional(v.id("tables")),
    reservationId: v.optional(v.id("reservations")),
    orderType: v.union(
      v.literal("dine-in"),
      v.literal("takeout"),
      v.literal("room-service"),
      v.literal("bar")
    ),
    serverId: v.optional(v.id("staffs")),
  },
  handler: async (ctx, args) => {
    try {
      // Validate that either tableId or reservationId is provided for certain order types
      if (args.orderType === "dine-in" && !args.tableId) {
        return {
          success: false,
          data: null,
          message: "Table ID is required for dine-in orders",
        };
      }

      if (args.orderType === "room-service" && !args.reservationId) {
        return {
          success: false,
          data: null,
          message: "Reservation ID is required for room service orders",
        };
      }

      const orderId = await ctx.db.insert("orders", {
        propertyId: args.propertyId,
        tableId: args.tableId,
        reservationId: args.reservationId,
        orderType: args.orderType,
        status: "pending",
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 0,
        serverId: args.serverId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const newOrder = await ctx.db.get(orderId);

      return {
        success: true,
        data: newOrder,
        message: "Order created successfully",
      };
    } catch (error) {
      console.log(`Failed to create order: ${error}`);
      return { success: false, data: null, message: "Failed to create order" };
    }
  },
});

/**
 * Add item to order
 */
export const addOrderLine = mutation({
  args: {
    orderId: v.id("orders"),
    menuItemId: v.id("fnbMenuItems"),
    quantity: v.number(),
    unitPrice: v.number(),
    specialInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      if (args.quantity < 1) {
        return {
          success: false,
          data: null,
          message: "Quantity must be at least 1",
        };
      }

      const totalPrice = args.quantity * args.unitPrice;

      const orderLineId = await ctx.db.insert("orderLines", {
        orderId: args.orderId,
        menuItemId: args.menuItemId,
        quantity: args.quantity,
        unitPrice: args.unitPrice,
        totalPrice,
        specialInstructions: args.specialInstructions,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Update order totals
      const orderLines = await ctx.db
        .query("orderLines")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
        .collect();

      const subtotal = orderLines.reduce(
        (sum, line) => sum + line.totalPrice,
        0
      );

      const order = await ctx.db.get(args.orderId);
      if (order) {
        const taxPercentage = 0.1; // 10% tax (can be configurable)
        const taxAmount = subtotal * taxPercentage;
        const totalAmount = subtotal + taxAmount - (order.discountAmount || 0);

        await ctx.db.patch(args.orderId, {
          subtotal,
          taxAmount,
          totalAmount,
          updatedAt: Date.now(),
        });
      }

      const newOrderLine = await ctx.db.get(orderLineId);

      return {
        success: true,
        data: newOrderLine,
        message: "Item added to order successfully",
      };
    } catch (error) {
      console.log(`Failed to add order line: ${error}`);
      return {
        success: false,
        data: null,
        message: "Failed to add item to order",
      };
    }
  },
});

/**
 * Update order line
 */
export const updateOrderLine = mutation({
  args: {
    orderLineId: v.id("orderLines"),
    orderId: v.id("orders"),
    quantity: v.optional(v.number()),
    specialInstructions: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("preparing"),
        v.literal("ready"),
        v.literal("served"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    try {
      const orderLine = await ctx.db.get(args.orderLineId);

      if (!orderLine) {
        return {
          success: false,
          data: null,
          message: "Order line not found",
        };
      }

      if (args.quantity !== undefined && args.quantity < 1) {
        return {
          success: false,
          data: null,
          message: "Quantity must be at least 1",
        };
      }

      const newQuantity = args.quantity ?? orderLine.quantity;
      const newTotalPrice = newQuantity * orderLine.unitPrice;

      const updatedLine = {
        ...orderLine,
        quantity: newQuantity,
        totalPrice: newTotalPrice,
        specialInstructions: args.specialInstructions ?? orderLine.specialInstructions,
        status: args.status ?? orderLine.status,
        updatedAt: Date.now(),
      };

      await ctx.db.patch(args.orderLineId, updatedLine);

      // Recalculate order totals
      const orderLines = await ctx.db
        .query("orderLines")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
        .collect();

      const subtotal = orderLines.reduce((sum, line) => {
        if (line._id === args.orderLineId) {
          return sum + newTotalPrice;
        }
        return sum + line.totalPrice;
      }, 0);

      const order = await ctx.db.get(args.orderId);
      if (order) {
        const taxPercentage = 0.1;
        const taxAmount = subtotal * taxPercentage;
        const totalAmount = subtotal + taxAmount - (order.discountAmount || 0);

        await ctx.db.patch(args.orderId, {
          subtotal,
          taxAmount,
          totalAmount,
          updatedAt: Date.now(),
        });
      }

      return {
        success: true,
        data: updatedLine,
        message: "Order line updated successfully",
      };
    } catch (error) {
      console.log(`Failed to update order line: ${error}`);
      return {
        success: false,
        data: null,
        message: "Failed to update order line",
      };
    }
  },
});

/**
 * Remove item from order
 */
export const removeOrderLine = mutation({
  args: {
    orderLineId: v.id("orderLines"),
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    try {
      const orderLine = await ctx.db.get(args.orderLineId);

      if (!orderLine) {
        return {
          success: false,
          data: null,
          message: "Order line not found",
        };
      }

      await ctx.db.delete(args.orderLineId);

      // Recalculate order totals
      const orderLines = await ctx.db
        .query("orderLines")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
        .collect();

      const subtotal = orderLines.reduce((sum, line) => sum + line.totalPrice, 0);

      const order = await ctx.db.get(args.orderId);
      if (order) {
        const taxPercentage = 0.1;
        const taxAmount = subtotal * taxPercentage;
        const totalAmount = subtotal + taxAmount - (order.discountAmount || 0);

        await ctx.db.patch(args.orderId, {
          subtotal,
          taxAmount,
          totalAmount,
          updatedAt: Date.now(),
        });
      }

      return {
        success: true,
        data: null,
        message: "Item removed from order successfully",
      };
    } catch (error) {
      console.log(`Failed to remove order line: ${error}`);
      return {
        success: false,
        data: null,
        message: "Failed to remove item from order",
      };
    }
  },
});

/**
 * Update order status
 */
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    propertyId: v.id("properties"),
    status: v.union(
      v.literal("pending"),
      v.literal("in-progress"),
      v.literal("ready"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    try {
      const order = await ctx.db.get(args.orderId);

      if (!order) {
        return { success: false, data: null, message: "Order not found" };
      }

      if (order.propertyId !== args.propertyId) {
        return {
          success: false,
          data: null,
          message: "Unauthorized: Order belongs to a different property",
        };
      }

      const updateData: any = {
        status: args.status,
        updatedAt: Date.now(),
      };

      // Set completion timestamp if status is completed
      if (args.status === "completed") {
        updateData.completedAt = Date.now();
      }

      await ctx.db.patch(args.orderId, updateData);

      const updatedOrder = await ctx.db.get(args.orderId);

      return {
        success: true,
        data: updatedOrder,
        message: "Order status updated successfully",
      };
    } catch (error) {
      console.log(`Failed to update order status: ${error}`);
      return {
        success: false,
        data: null,
        message: "Failed to update order status",
      };
    }
  },
});

/**
 * Apply discount to order
 */
export const applyOrderDiscount = mutation({
  args: {
    orderId: v.id("orders"),
    propertyId: v.id("properties"),
    discountAmount: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const order = await ctx.db.get(args.orderId);

      if (!order) {
        return { success: false, data: null, message: "Order not found" };
      }

      if (order.propertyId !== args.propertyId) {
        return {
          success: false,
          data: null,
          message: "Unauthorized: Order belongs to a different property",
        };
      }

      if (args.discountAmount < 0) {
        return {
          success: false,
          data: null,
          message: "Discount amount cannot be negative",
        };
      }

      if (args.discountAmount > order.subtotal) {
        return {
          success: false,
          data: null,
          message: "Discount amount cannot exceed order subtotal",
        };
      }

      const totalAmount =
        order.subtotal + order.taxAmount - args.discountAmount;

      await ctx.db.patch(args.orderId, {
        discountAmount: args.discountAmount,
        totalAmount,
        updatedAt: Date.now(),
      });

      const updatedOrder = await ctx.db.get(args.orderId);

      return {
        success: true,
        data: updatedOrder,
        message: "Discount applied successfully",
      };
    } catch (error) {
      console.log(`Failed to apply discount: ${error}`);
      return {
        success: false,
        data: null,
        message: "Failed to apply discount",
      };
    }
  },
});

/**
 * Complete order and calculate totals
 */
export const completeOrder = mutation({
  args: {
    orderId: v.id("orders"),
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    try {
      const order = await ctx.db.get(args.orderId);

      if (!order) {
        return { success: false, data: null, message: "Order not found" };
      }

      if (order.propertyId !== args.propertyId) {
        return {
          success: false,
          data: null,
          message: "Unauthorized: Order belongs to a different property",
        };
      }

      // Get all order lines
      const orderLines = await ctx.db
        .query("orderLines")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
        .collect();

      // Verify all items have been served
      const anyPending = orderLines.some((line) => line.status !== "served" && line.status !== "cancelled");
      if (anyPending) {
        return {
          success: false,
          data: null,
          message: "All items must be served or cancelled before completing order",
        };
      }

      await ctx.db.patch(args.orderId, {
        status: "completed",
        completedAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Release table if dine-in order
      if (order.tableId) {
        const table = await ctx.db.get(order.tableId);
        if (table && table.status === "occupied" && table.currentOrderId === args.orderId) {
          await ctx.db.patch(order.tableId, {
            status: "available",
            currentOrderId: undefined,
            updatedAt: Date.now(),
          });
        }
      }

      const updatedOrder = await ctx.db.get(args.orderId);

      return {
        success: true,
        data: updatedOrder,
        message: "Order completed successfully",
      };
    } catch (error) {
      console.log(`Failed to complete order: ${error}`);
      return {
        success: false,
        data: null,
        message: "Failed to complete order",
      };
    }
  },
});
