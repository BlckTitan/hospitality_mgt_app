import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requirePermission, tryRequirePermission } from "./lib/rbac";
import {
  isSystemExpenseCategory,
  SYSTEM_EXPENSE_CATEGORIES,
  systemExpenseLabel,
} from "./lib/expenseCategoryCatalog";
import { canonicalCategoryName, categoryNameError, normalizeCategoryName } from "./lib/categoryNames";

async function requireExpenseCategoryRead(ctx: QueryCtx | MutationCtx, propertyId: Id<"properties">) {
  const read = await tryRequirePermission(ctx, "expenses.read", propertyId);
  if (read) return read;
  const create = await tryRequirePermission(ctx, "expenses.create", propertyId);
  if (create) return create;
  throw new Error("Unauthorized");
}

async function rowsForProperty(ctx: QueryCtx | MutationCtx, propertyId: Id<"properties">) {
  return await ctx.db
    .query("expenseCategories")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
    .collect();
}

function conflictsWithSystem(name: string) {
  const normalized = normalizeCategoryName(name);
  if (isSystemExpenseCategory(normalized)) return true;
  return SYSTEM_EXPENSE_CATEGORIES.some(
    (item) => normalizeCategoryName(item.key) === normalized || normalizeCategoryName(item.label) === normalized,
  );
}

export async function resolveExpenseCategory(
  ctx: MutationCtx,
  propertyId: Id<"properties">,
  category: string,
) {
  const name = canonicalCategoryName(category);
  if (isSystemExpenseCategory(name)) return { success: true as const, name };

  const error = categoryNameError(name);
  if (error) return { success: false as const, message: error };
  if (conflictsWithSystem(name)) {
    return { success: false as const, message: "Choose an active expense category" };
  }

  const rows = await rowsForProperty(ctx, propertyId);
  const match = rows.find((row) => normalizeCategoryName(row.name) === normalizeCategoryName(name));
  if (!match || !match.isActive) {
    return { success: false as const, message: "Choose an active expense category" };
  }
  return { success: true as const, name: match.name };
}

export const listExpenseCategories = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requireExpenseCategoryRead(ctx, args.propertyId);
    const rows = await rowsForProperty(ctx, args.propertyId);
    const system = SYSTEM_EXPENSE_CATEGORIES.map((item) => ({
      name: item.key,
      label: item.label,
      isSystem: true,
      isActive: true,
      categoryId: null,
    }));
    const custom = rows
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((row) => ({
        name: row.name,
        label: systemExpenseLabel(row.name),
        isSystem: false,
        isActive: row.isActive,
        categoryId: row._id,
      }));
    return { success: true as const, data: [...system, ...custom] };
  },
});

export const createExpenseCategory = mutation({
  args: {
    propertyId: v.id("properties"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "expenses.create", args.propertyId);
    const name = canonicalCategoryName(args.name);
    const error = categoryNameError(name);
    if (error) return { success: false as const, message: error };
    if (conflictsWithSystem(name)) {
      return { success: false as const, message: "That category already exists" };
    }

    const rows = await rowsForProperty(ctx, args.propertyId);
    const existing = rows.find((row) => normalizeCategoryName(row.name) === normalizeCategoryName(name));
    if (existing) {
      if (!existing.isActive) {
        await ctx.db.patch(existing._id, { isActive: true, name, updatedAt: Date.now() });
        return { success: true as const, message: "Expense category restored" };
      }
      return { success: false as const, message: "That category already exists" };
    }

    const now = Date.now();
    await ctx.db.insert("expenseCategories", {
      propertyId: args.propertyId,
      name,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true as const, message: "Expense category created" };
  },
});

export const setExpenseCategoryActive = mutation({
  args: {
    categoryId: v.id("expenseCategories"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.categoryId);
    if (!row) return { success: false as const, message: "Category not found" };
    await requirePermission(ctx, "expenses.create", row.propertyId);
    await ctx.db.patch(args.categoryId, { isActive: args.isActive, updatedAt: Date.now() });
    return {
      success: true as const,
      message: args.isActive ? "Expense category activated" : "Expense category deactivated",
    };
  },
});
