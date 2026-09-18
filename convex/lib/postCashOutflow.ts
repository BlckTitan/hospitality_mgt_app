import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export const EXPENSE_CATEGORIES = [
  "utilities",
  "supplies",
  "staff",
  "maintenance",
  "other",
] as const;

export const EXPENSE_SOURCE_TYPES = [
  "PropertyBill",
  "Payroll",
  "MaintenanceOrder",
  "PurchaseOrder",
  "Manual",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ExpenseSourceType = (typeof EXPENSE_SOURCE_TYPES)[number];

export type PostCashOutflowArgs = {
  propertyId: Id<"properties">;
  sourceType: ExpenseSourceType;
  sourceId: string;
  amount: number;
  category: ExpenseCategory;
  subcategory?: string;
  description?: string;
  vendor?: string;
  invoiceNumber?: string;
  paymentMethod: string;
  paymentType?: string;
  createdBy: Id<"users">;
  expenseDate?: number;
};

export type PostCashOutflowResult = {
  expenseId: Id<"expenses">;
  alreadyPosted: boolean;
};

export async function postCashOutflow(
  ctx: MutationCtx,
  args: PostCashOutflowArgs,
): Promise<PostCashOutflowResult> {
  if (!Number.isFinite(args.amount) || args.amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const existingExpense = await ctx.db
    .query("expenses")
    .withIndex("by_sourceType_sourceId", (q) =>
      q.eq("sourceType", args.sourceType).eq("sourceId", args.sourceId),
    )
    .first();

  const existingPayment = await ctx.db
    .query("payments")
    .withIndex("by_reference", (q) =>
      q.eq("referenceType", args.sourceType).eq("referenceId", args.sourceId),
    )
    .first();

  const now = Date.now();
  const expenseDate = args.expenseDate ?? existingPayment?.paidAt ?? now;
  const paymentType = args.paymentType ?? args.sourceType;

  if (existingExpense) {
    if (!existingPayment) {
      await ctx.db.insert("payments", {
        propertyId: args.propertyId,
        paymentType,
        referenceType: args.sourceType,
        referenceId: args.sourceId,
        amount: args.amount,
        paymentMethod: args.paymentMethod,
        status: "completed",
        paidAt: expenseDate,
        createdBy: args.createdBy,
        createdAt: now,
      });
    }
    return { expenseId: existingExpense._id, alreadyPosted: true };
  }

  if (existingPayment) {
    const expenseId = await insertExpense(ctx, args, expenseDate, now);
    return { expenseId, alreadyPosted: false };
  }

  await ctx.db.insert("payments", {
    propertyId: args.propertyId,
    paymentType,
    referenceType: args.sourceType,
    referenceId: args.sourceId,
    amount: args.amount,
    paymentMethod: args.paymentMethod,
    status: "completed",
    paidAt: expenseDate,
    createdBy: args.createdBy,
    createdAt: now,
  });
  const expenseId = await insertExpense(ctx, args, expenseDate, now);
  return { expenseId, alreadyPosted: false };
}

async function insertExpense(
  ctx: MutationCtx,
  args: PostCashOutflowArgs,
  expenseDate: number,
  now: number,
): Promise<Id<"expenses">> {
  return await ctx.db.insert("expenses", {
    propertyId: args.propertyId,
    category: args.category,
    subcategory: args.subcategory,
    amount: args.amount,
    expenseDate,
    description: args.description,
    vendor: args.vendor,
    invoiceNumber: args.invoiceNumber,
    status: "paid",
    sourceType: args.sourceType,
    sourceId: args.sourceId,
    submittedBy: args.createdBy,
    paidBy: args.createdBy,
    createdAt: now,
    updatedAt: now,
  });
}
