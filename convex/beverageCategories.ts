import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requirePermission, tryRequirePermission } from "./lib/rbac";
import { BUILTIN_BEVERAGE_CATEGORIES, beverageCategoryLabel } from "./lib/beverageCategoryCatalog";
import { canonicalCategoryName, categoryNameError, normalizeCategoryName } from "./lib/categoryNames";

async function requireBeverageCategoryRead(ctx: QueryCtx | MutationCtx, propertyId: Id<"properties">) {
  const read = await tryRequirePermission(ctx, "fnb.read", propertyId);
  if (read) return read;
  const create = await tryRequirePermission(ctx, "fnb.create", propertyId);
  if (create) return create;
  const update = await tryRequirePermission(ctx, "fnb.update", propertyId);
  if (update) return update;
  throw new Error("Unauthorized");
}

async function rowsForProperty(ctx: QueryCtx | MutationCtx, propertyId: Id<"properties">) {
  return await ctx.db
    .query("beverageCategories")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
    .collect();
}

export async function resolveBeverageCategory(
  ctx: MutationCtx,
  propertyId: Id<"properties">,
  category: string,
) {
  const name = canonicalCategoryName(category);
  const error = categoryNameError(name);
  if (error) return { success: false as const, message: error };

  const normalized = normalizeCategoryName(name);
  const builtin = BUILTIN_BEVERAGE_CATEGORIES.find(
    (item) => normalizeCategoryName(item) === normalized,
  );
  if (builtin) return { success: true as const, name: builtin };

  const rows = await rowsForProperty(ctx, propertyId);
  const match = rows.find((row) => normalizeCategoryName(row.name) === normalized);
  if (!match || !match.isActive) {
    return { success: false as const, message: "Choose an active beverage category" };
  }
  return { success: true as const, name: match.name };
}

export const listBeverageCategories = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requireBeverageCategoryRead(ctx, args.propertyId);
    const rows = await rowsForProperty(ctx, args.propertyId);
    const custom = rows
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((row) => ({
        name: row.name,
        label: beverageCategoryLabel(row.name),
        isSystem: false,
        isActive: row.isActive,
        categoryId: row._id,
      }));
    const builtin = BUILTIN_BEVERAGE_CATEGORIES.map((name) => ({
      name,
      label: beverageCategoryLabel(name),
      isSystem: true,
      isActive: true,
      categoryId: null,
    }));
    return { success: true as const, data: [...builtin, ...custom] };
  },
});

export const createBeverageCategory = mutation({
  args: {
    propertyId: v.id("properties"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "fnb.create", args.propertyId);
    const name = canonicalCategoryName(args.name);
    const error = categoryNameError(name);
    if (error) return { success: false as const, message: error };

    const normalized = normalizeCategoryName(name);
    const builtin = BUILTIN_BEVERAGE_CATEGORIES.some(
      (item) => normalizeCategoryName(item) === normalized,
    );
    if (builtin) {
      return { success: false as const, message: "That category already exists" };
    }

    const rows = await rowsForProperty(ctx, args.propertyId);
    const existing = rows.find((row) => normalizeCategoryName(row.name) === normalized);
    if (existing) {
      if (!existing.isActive) {
        await ctx.db.patch(existing._id, { isActive: true, name, updatedAt: Date.now() });
        return { success: true as const, message: "Beverage category restored" };
      }
      return { success: false as const, message: "That category already exists" };
    }

    const now = Date.now();
    await ctx.db.insert("beverageCategories", {
      propertyId: args.propertyId,
      name,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true as const, message: "Beverage category created" };
  },
});

export const setBeverageCategoryActive = mutation({
  args: {
    categoryId: v.id("beverageCategories"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.categoryId);
    if (!row) return { success: false as const, message: "Category not found" };
    await requirePermission(ctx, "fnb.update", row.propertyId);
    await ctx.db.patch(args.categoryId, { isActive: args.isActive, updatedAt: Date.now() });
    return {
      success: true as const,
      message: args.isActive ? "Beverage category activated" : "Beverage category deactivated",
    };
  },
});
