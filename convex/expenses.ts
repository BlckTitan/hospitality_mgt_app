import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { Doc, Id } from "./_generated/dataModel";
import {
  EXPENSE_CATEGORIES,
  postCashOutflow,
  type ExpenseCategory,
} from "./lib/postCashOutflow";

const categoryValidator = v.union(
  v.literal("utilities"),
  v.literal("supplies"),
  v.literal("staff"),
  v.literal("maintenance"),
  v.literal("other"),
);

const paymentMethodValidator = v.union(
  v.literal("cash"),
  v.literal("card"),
  v.literal("bank_transfer"),
  v.literal("check"),
);

type SourceMeta = { sourceLabel: string; sourceHref?: string };

async function sourceMeta(
  ctx: { db: { get: (id: any) => Promise<any> } },
  row: Doc<"expenses">,
): Promise<SourceMeta> {
  if (row.sourceType === "PropertyBill" && row.sourceId) {
    const period = await ctx.db.get(row.sourceId as Id<"billPeriods">);
    if (period) {
      const account = await ctx.db.get(period.accountId);
      return {
        sourceLabel: account?.name ?? "Bill",
        sourceHref: "/admin/billing/bills",
      };
    }
    return { sourceLabel: "Bill", sourceHref: "/admin/billing/bills" };
  }
  if (row.sourceType === "Payroll" && row.sourceId) {
    const run = await ctx.db.get(row.sourceId as Id<"payrolls">);
    const start = run ? new Date(run.payPeriodStart).toISOString().slice(0, 10) : "";
    const end = run ? new Date(run.payPeriodEnd).toISOString().slice(0, 10) : "";
    return {
      sourceLabel: start && end ? `Payroll ${start} – ${end}` : "Payroll",
      sourceHref: `/admin/payroll-management/payroll/view?payroll_id=${row.sourceId}`,
    };
  }
  if (row.sourceType === "MaintenanceOrder" && row.sourceId) {
    const order = await ctx.db.get(row.sourceId as Id<"maintenanceOrders">);
    return {
      sourceLabel: order?.title ?? "Maintenance",
      sourceHref: `/admin/maintenance/edit?order_id=${row.sourceId}`,
    };
  }
  if (row.sourceType === "PurchaseOrder" && row.sourceId) {
    const order = await ctx.db.get(row.sourceId as Id<"purchaseOrders">);
    return {
      sourceLabel: order ? `PO ${order.orderNumber}` : "Purchase order",
      sourceHref: `/admin/inventory-management/purchase-order/edit?purchase_order_id=${row.sourceId}`,
    };
  }
  return { sourceLabel: row.sourceType === "Manual" ? "Manual" : "—" };
}

async function expensesInRange(
  ctx: { db: any },
  propertyId: Id<"properties">,
  start: number,
  end: number,
  category?: ExpenseCategory,
) {
  const rows: Doc<"expenses">[] = await ctx.db
    .query("expenses")
    .withIndex("by_propertyId_expenseDate", (q: any) =>
      q.eq("propertyId", propertyId).gte("expenseDate", start).lt("expenseDate", end),
    )
    .order("desc")
    .collect();
  if (!category) return rows;
  return rows.filter((row) => row.category === category);
}

export const listExpensesInRange = query({
  args: {
    propertyId: v.id("properties"),
    start: v.number(),
    end: v.number(),
    category: v.optional(categoryValidator),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "expenses.read", args.propertyId);
    const rows = await expensesInRange(ctx, args.propertyId, args.start, args.end, args.category);
    const data = await Promise.all(
      rows.map(async (row) => {
        const meta = await sourceMeta(ctx, row);
        return { ...row, ...meta };
      }),
    );
    return { success: true, data };
  },
});

export const summarizeExpensesInRange = query({
  args: {
    propertyId: v.id("properties"),
    start: v.number(),
    end: v.number(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "expenses.read", args.propertyId);
    const rows = await expensesInRange(ctx, args.propertyId, args.start, args.end);
    const byCategory: Record<ExpenseCategory, number> = {
      utilities: 0,
      supplies: 0,
      staff: 0,
      maintenance: 0,
      other: 0,
    };
    for (const row of rows) {
      if (row.category in byCategory) {
        byCategory[row.category] += row.amount;
      } else {
        byCategory.other += row.amount;
      }
    }
    const total = EXPENSE_CATEGORIES.reduce((sum, key) => sum + byCategory[key], 0);
    return {
      success: true,
      data: { ...byCategory, total, count: rows.length },
    };
  },
});

export const createPaidExpense = mutation({
  args: {
    propertyId: v.id("properties"),
    amount: v.number(),
    expenseDate: v.number(),
    category: categoryValidator,
    vendor: v.string(),
    description: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    paymentMethod: paymentMethodValidator,
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, "expenses.create", args.propertyId);
    if (!Number.isFinite(args.amount) || args.amount <= 0) {
      return { success: false, message: "Amount must be greater than 0" };
    }
    const vendor = args.vendor.trim();
    if (!vendor) {
      return { success: false, message: "Vendor is required" };
    }
    const sourceId = crypto.randomUUID();
    const posted = await postCashOutflow(ctx, {
      propertyId: args.propertyId,
      sourceType: "Manual",
      sourceId,
      amount: args.amount,
      category: args.category,
      subcategory: args.subcategory?.trim() || undefined,
      description: args.description?.trim() || undefined,
      vendor,
      invoiceNumber: args.invoiceNumber?.trim() || undefined,
      paymentMethod: args.paymentMethod,
      paymentType: "expense",
      createdBy: auth.user._id,
      expenseDate: args.expenseDate,
    });
    return { success: true, message: "Expense recorded", id: posted.expenseId };
  },
});
