import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Query all tables for a property
 */
export const getAllTables = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    try {
      const tables = await ctx.db
        .query("tables")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
        .collect();

      return { success: true, data: tables };
    } catch (error) {
      console.log(`Failed to fetch tables: ${error}`);
      return { success: false, data: [], message: "Failed to fetch tables" };
    }
  },
});

/**
 * Query available tables for a property
 */
export const getAvailableTables = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    try {
      const tables = await ctx.db
        .query("tables")
        .withIndex("by_propertyId_status", (q) =>
          q.eq("propertyId", args.propertyId).eq("status", "available")
        )
        .collect();

      return { success: true, data: tables };
    } catch (error) {
      console.log(`Failed to fetch available tables: ${error}`);
      return {
        success: false,
        data: [],
        message: "Failed to fetch available tables",
      };
    }
  },
});

/**
 * Query tables by section
 */
export const getTablesBySection = query({
  args: { propertyId: v.id("properties"), section: v.string() },
  handler: async (ctx, args) => {
    try {
      const tables = await ctx.db
        .query("tables")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
        .filter((q) => q.eq(q.field("section"), args.section))
        .collect();

      return { success: true, data: tables };
    } catch (error) {
      console.log(`Failed to fetch tables by section: ${error}`);
      return {
        success: false,
        data: [],
        message: "Failed to fetch tables by section",
      };
    }
  },
});

/**
 * Get a single table by ID
 */
export const getTable = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    try {
      const table = await ctx.db.get(args.tableId);

      if (!table) {
        return { success: false, data: null, message: "Table not found" };
      }

      // Fetch associated order if table is occupied
      let currentOrder = null;
      if (table.currentOrderId) {
        currentOrder = await ctx.db.get(table.currentOrderId);
      }

      return {
        success: true,
        data: {
          ...table,
          currentOrder,
        },
      };
    } catch (error) {
      console.log(`Failed to fetch table: ${error}`);
      return { success: false, data: null, message: "Failed to fetch table" };
    }
  },
});

/**
 * Create a new table
 */
export const createTable = mutation({
  args: {
    propertyId: v.id("properties"),
    tableNumber: v.string(),
    capacity: v.number(),
    section: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Check if table number already exists for this property
      const existingTable = await ctx.db
        .query("tables")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
        .filter((q) => q.eq(q.field("tableNumber"), args.tableNumber))
        .first();

      if (existingTable) {
        return {
          success: false,
          data: null,
          message: "Table number already exists for this property",
        };
      }

      // Validate capacity
      if (args.capacity < 1) {
        return {
          success: false,
          data: null,
          message: "Table capacity must be at least 1",
        };
      }

      const tableId = await ctx.db.insert("tables", {
        propertyId: args.propertyId,
        tableNumber: args.tableNumber,
        capacity: args.capacity,
        section: args.section || undefined,
        status: "available",
        currentOrderId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const newTable = await ctx.db.get(tableId);

      return {
        success: true,
        data: newTable,
        message: "Table created successfully",
      };
    } catch (error) {
      console.log(`Failed to create table: ${error}`);
      return { success: false, data: null, message: "Failed to create table" };
    }
  },
});

/**
 * Update a table
 */
export const updateTable = mutation({
  args: {
    tableId: v.id("tables"),
    propertyId: v.id("properties"),
    tableNumber: v.optional(v.string()),
    capacity: v.optional(v.number()),
    section: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("available"),
        v.literal("occupied"),
        v.literal("reserved"),
        v.literal("out-of-service")
      )
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      const table = await ctx.db.get(args.tableId);

      if (!table) {
        return { success: false, data: null, message: "Table not found" };
      }

      if (table.propertyId !== args.propertyId) {
        return {
          success: false,
          data: null,
          message: "Unauthorized: Table belongs to a different property",
        };
      }

      // If updating table number, check for duplicates
      if (args.tableNumber && args.tableNumber !== table.tableNumber) {
        const existingTable = await ctx.db
          .query("tables")
          .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
          .filter((q) => q.eq(q.field("tableNumber"), args.tableNumber))
          .first();

        if (existingTable) {
          return {
            success: false,
            data: null,
            message: "Table number already exists for this property",
          };
        }
      }

      // Validate capacity if provided
      if (args.capacity !== undefined && args.capacity < 1) {
        return {
          success: false,
          data: null,
          message: "Table capacity must be at least 1",
        };
      }

      const updatedTable = {
        ...table,
        tableNumber: args.tableNumber ?? table.tableNumber,
        capacity: args.capacity ?? table.capacity,
        section: args.section ?? table.section,
        status: args.status ?? table.status,
        isActive: args.isActive ?? table.isActive,
        updatedAt: Date.now(),
      };

      await ctx.db.patch(args.tableId, updatedTable);

      return {
        success: true,
        data: updatedTable,
        message: "Table updated successfully",
      };
    } catch (error) {
      console.log(`Failed to update table: ${error}`);
      return { success: false, data: null, message: "Failed to update table" };
    }
  },
});

/**
 * Delete a table (soft delete by marking inactive)
 */
export const deleteTable = mutation({
  args: {
    tableId: v.id("tables"),
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    try {
      const table = await ctx.db.get(args.tableId);

      if (!table) {
        return { success: false, data: null, message: "Table not found" };
      }

      if (table.propertyId !== args.propertyId) {
        return {
          success: false,
          data: null,
          message: "Unauthorized: Table belongs to a different property",
        };
      }

      // Prevent deletion if table is currently occupied
      if (table.status === "occupied") {
        return {
          success: false,
          data: null,
          message: "Cannot delete table: currently occupied",
        };
      }

      // Soft delete by marking as inactive
      await ctx.db.patch(args.tableId, {
        isActive: false,
        status: "out-of-service",
        updatedAt: Date.now(),
      });

      return {
        success: true,
        data: null,
        message: "Table deleted successfully",
      };
    } catch (error) {
      console.log(`Failed to delete table: ${error}`);
      return { success: false, data: null, message: "Failed to delete table" };
    }
  },
});

/**
 * Occupy a table (assign current order)
 */
export const occupyTable = mutation({
  args: {
    tableId: v.id("tables"),
    orderId: v.id("orders"),
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    try {
      const table = await ctx.db.get(args.tableId);

      if (!table) {
        return { success: false, data: null, message: "Table not found" };
      }

      if (table.propertyId !== args.propertyId) {
        return {
          success: false,
          data: null,
          message: "Unauthorized: Table belongs to a different property",
        };
      }

      if (table.status !== "available" && table.status !== "reserved") {
        return {
          success: false,
          data: null,
          message: "Table is not available for occupation",
        };
      }

      await ctx.db.patch(args.tableId, {
        status: "occupied",
        currentOrderId: args.orderId,
        updatedAt: Date.now(),
      });

      const updatedTable = await ctx.db.get(args.tableId);

      return {
        success: true,
        data: updatedTable,
        message: "Table occupied successfully",
      };
    } catch (error) {
      console.log(`Failed to occupy table: ${error}`);
      return { success: false, data: null, message: "Failed to occupy table" };
    }
  },
});

/**
 * Release a table (mark as available)
 */
export const releaseTable = mutation({
  args: {
    tableId: v.id("tables"),
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    try {
      const table = await ctx.db.get(args.tableId);

      if (!table) {
        return { success: false, data: null, message: "Table not found" };
      }

      if (table.propertyId !== args.propertyId) {
        return {
          success: false,
          data: null,
          message: "Unauthorized: Table belongs to a different property",
        };
      }

      await ctx.db.patch(args.tableId, {
        status: "available",
        currentOrderId: undefined,
        updatedAt: Date.now(),
      });

      const updatedTable = await ctx.db.get(args.tableId);

      return {
        success: true,
        data: updatedTable,
        message: "Table released successfully",
      };
    } catch (error) {
      console.log(`Failed to release table: ${error}`);
      return { success: false, data: null, message: "Failed to release table" };
    }
  },
});

/**
 * Reserve a table
 */
export const reserveTable = mutation({
  args: {
    tableId: v.id("tables"),
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    try {
      const table = await ctx.db.get(args.tableId);

      if (!table) {
        return { success: false, data: null, message: "Table not found" };
      }

      if (table.propertyId !== args.propertyId) {
        return {
          success: false,
          data: null,
          message: "Unauthorized: Table belongs to a different property",
        };
      }

      if (table.status !== "available") {
        return {
          success: false,
          data: null,
          message: "Table is not available for reservation",
        };
      }

      await ctx.db.patch(args.tableId, {
        status: "reserved",
        updatedAt: Date.now(),
      });

      const updatedTable = await ctx.db.get(args.tableId);

      return {
        success: true,
        data: updatedTable,
        message: "Table reserved successfully",
      };
    } catch (error) {
      console.log(`Failed to reserve table: ${error}`);
      return {
        success: false,
        data: null,
        message: "Failed to reserve table",
      };
    }
  },
});

/**
 * Get table with order details by ID
 */
export const getTableWithOrder = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    try {
      const table = await ctx.db.get(args.tableId);

      if (!table) {
        return { success: false, data: null, message: "Table not found" };
      }

      let currentOrder = null;
      if (table.currentOrderId) {
        currentOrder = await ctx.db.get(table.currentOrderId);

        // Fetch order lines if order exists
        if (currentOrder) {
          const orderLines = await ctx.db
            .query("orderLines")
            .withIndex("by_orderId", (q) => q.eq("orderId", table.currentOrderId!))
            .collect();

          // Fetch menu items for each order line
          const orderLinesWithItems = await Promise.all(
            orderLines.map(async (line) => {
              const menuItem = await ctx.db.get(line.menuItemId);
              return {
                ...line,
                menuItem,
              };
            })
          );

          currentOrder = {
            ...currentOrder,
            orderLines: orderLinesWithItems,
          };
        }
      }

      return {
        success: true,
        data: {
          ...table,
          currentOrder,
        },
      };
    } catch (error) {
      console.log(`Failed to fetch table with order: ${error}`);
      return {
        success: false,
        data: null,
        message: "Failed to fetch table with order",
      };
    }
  },
});
