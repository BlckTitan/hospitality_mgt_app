import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { SHIFT_DEPARTMENTS } from "./lib/shiftHelpers";

const departmentValidator = v.union(
  v.literal("front-office"),
  v.literal("housekeeping"),
  v.literal("fnb"),
  v.literal("restaurant"),
  v.literal("maintenance"),
  v.literal("finance"),
  v.literal("admin"),
  v.literal("other")
);

export const listShiftTemplates = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "staff.read", args.propertyId);
    const rows = await ctx.db
      .query("shiftTemplates")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    rows.sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name));
    const withCounts = await Promise.all(
      rows.map(async (row) => {
        const assigned = await ctx.db
          .query("staffs")
          .withIndex("by_shiftTemplateId", (q) => q.eq("shiftTemplateId", row._id))
          .collect();
        return {
          ...row,
          assignedCount: assigned.length,
        };
      })
    );
    return { success: true, data: withCounts, departments: SHIFT_DEPARTMENTS };
  },
});

export const getShiftTemplate = query({
  args: { templateId: v.id("shiftTemplates") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.templateId);
    if (!row) return { success: false, data: null, message: "Department shift not found" };
    await requirePermission(ctx, "staff.read", row.propertyId);
    return { success: true, data: row };
  },
});

export const createShiftTemplate = mutation({
  args: {
    propertyId: v.id("properties"),
    department: departmentValidator,
    name: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "staff.update", args.propertyId);
    const now = Date.now();
    if (args.isDefault) {
      const existing = await ctx.db
        .query("shiftTemplates")
        .withIndex("by_propertyId_department", (q) =>
          q.eq("propertyId", args.propertyId).eq("department", args.department)
        )
        .collect();
      for (const row of existing) {
        if (row.isDefault) {
          await ctx.db.patch(row._id, { isDefault: false, updatedAt: now });
        }
      }
    }
    const id = await ctx.db.insert("shiftTemplates", {
      propertyId: args.propertyId,
      department: args.department,
      name: args.name.trim(),
      startTime: args.startTime,
      endTime: args.endTime,
      isDefault: args.isDefault,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, id, message: "Department shift created" };
  },
});

export const updateShiftTemplate = mutation({
  args: {
    templateId: v.id("shiftTemplates"),
    name: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.templateId);
    if (!existing) return { success: false, message: "Shift not found" };
    await requirePermission(ctx, "staff.update", existing.propertyId);
    const now = Date.now();
    if (args.isDefault) {
      const siblings = await ctx.db
        .query("shiftTemplates")
        .withIndex("by_propertyId_department", (q) =>
          q.eq("propertyId", existing.propertyId).eq("department", existing.department)
        )
        .collect();
      for (const row of siblings) {
        if (row._id !== args.templateId && row.isDefault) {
          await ctx.db.patch(row._id, { isDefault: false, updatedAt: now });
        }
      }
    }
    await ctx.db.patch(args.templateId, {
      name: args.name?.trim() ?? existing.name,
      startTime: args.startTime ?? existing.startTime,
      endTime: args.endTime ?? existing.endTime,
      isDefault: args.isDefault ?? existing.isDefault,
      isActive: args.isActive ?? existing.isActive,
      updatedAt: now,
    });
    return { success: true, message: "Department shift updated" };
  },
});
