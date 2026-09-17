import { internalMutation, mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { Doc, Id } from "./_generated/dataModel";
import {
  BILL_TYPES,
  currentPeriodBounds,
  expenseCategoryForBillType,
  FREQUENCIES,
  propertyTimeZone,
  weekWindow,
  type BillType,
  type Frequency,
} from "./lib/billingPeriods";

const billTypeValidator = v.union(
  v.literal("electricity"),
  v.literal("water"),
  v.literal("gas"),
  v.literal("internet"),
  v.literal("cable"),
  v.literal("waste"),
  v.literal("local_government"),
  v.literal("other"),
);

const frequencyValidator = v.union(
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("annually"),
);

const periodStatusValidator = v.union(
  v.literal("expected"),
  v.literal("pending"),
  v.literal("paid"),
  v.literal("overdue"),
);

const paymentMethodValidator = v.union(
  v.literal("cash"),
  v.literal("card"),
  v.literal("bank_transfer"),
  v.literal("check"),
);

function isBillType(value: string): value is BillType {
  return (BILL_TYPES as readonly string[]).includes(value);
}

function isFrequency(value: string): value is Frequency {
  return (FREQUENCIES as readonly string[]).includes(value);
}

async function findPeriodByStart(
  ctx: QueryCtx | MutationCtx,
  accountId: Id<"billAccounts">,
  periodStart: number,
) {
  return await ctx.db
    .query("billPeriods")
    .withIndex("by_accountId_periodStart", (q) =>
      q.eq("accountId", accountId).eq("periodStart", periodStart),
    )
    .first();
}

async function listBillDocs(ctx: QueryCtx | MutationCtx, periodId: Id<"billPeriods">) {
  const rows = await ctx.db
    .query("billDocuments")
    .withIndex("by_periodId", (q) => q.eq("periodId", periodId))
    .collect();
  return await Promise.all(
    rows.map(async (row) => ({
      ...row,
      url: await ctx.storage.getUrl(row.storageId),
    })),
  );
}

export const listAccounts = query({
  args: {
    propertyId: v.id("properties"),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "billing.account.read", args.propertyId);
    const rows = await ctx.db
      .query("billAccounts")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const data = args.activeOnly ? rows.filter((row) => row.isActive) : rows;
    data.sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, data };
  },
});

export const getAccount = query({
  args: { accountId: v.id("billAccounts") },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) {
      return { success: false, data: null, message: "Bill account not found" };
    }
    await requirePermission(ctx, "billing.account.read", account.propertyId);
    return { success: true, data: account };
  },
});

export const createAccount = mutation({
  args: {
    propertyId: v.id("properties"),
    name: v.string(),
    billType: billTypeValidator,
    frequency: frequencyValidator,
    isMetered: v.boolean(),
    provider: v.string(),
    accountNumber: v.optional(v.string()),
    supplierId: v.optional(v.id("suppliers")),
    expectedAmount: v.optional(v.number()),
    contractEndDate: v.optional(v.number()),
    glAccountCode: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "billing.account.create", args.propertyId);
    const name = args.name.trim();
    const provider = args.provider.trim();
    if (name.length < 2) {
      return { success: false, message: "Name must be at least 2 characters" };
    }
    if (!provider) {
      return { success: false, message: "Provider is required" };
    }
    if (args.supplierId) {
      const supplier = await ctx.db.get(args.supplierId);
      if (!supplier || supplier.propertyId !== args.propertyId) {
        return { success: false, message: "Supplier is not at this property" };
      }
    }
    const now = Date.now();
    const id = await ctx.db.insert("billAccounts", {
      propertyId: args.propertyId,
      name,
      billType: args.billType,
      frequency: args.frequency,
      isMetered: args.isMetered,
      provider,
      accountNumber: args.accountNumber?.trim() || undefined,
      supplierId: args.supplierId,
      expectedAmount: args.expectedAmount,
      contractEndDate: args.contractEndDate,
      glAccountCode: args.glAccountCode?.trim() || undefined,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
    const created = await ctx.db.get(id);
    if (created?.isActive) {
      const property = await ctx.db.get(args.propertyId);
      await openCurrentPeriod(ctx, created, now, propertyTimeZone(property));
    }
    return { success: true, id, message: "Bill account created" };
  },
});

export const updateAccount = mutation({
  args: {
    accountId: v.id("billAccounts"),
    name: v.string(),
    billType: billTypeValidator,
    frequency: frequencyValidator,
    isMetered: v.boolean(),
    provider: v.string(),
    accountNumber: v.optional(v.string()),
    supplierId: v.optional(v.id("suppliers")),
    expectedAmount: v.optional(v.number()),
    contractEndDate: v.optional(v.number()),
    glAccountCode: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) {
      return { success: false, message: "Bill account not found" };
    }
    await requirePermission(ctx, "billing.account.update", account.propertyId);
    const name = args.name.trim();
    const provider = args.provider.trim();
    if (name.length < 2) {
      return { success: false, message: "Name must be at least 2 characters" };
    }
    if (!provider) {
      return { success: false, message: "Provider is required" };
    }
    if (args.supplierId) {
      const supplier = await ctx.db.get(args.supplierId);
      if (!supplier || supplier.propertyId !== account.propertyId) {
        return { success: false, message: "Supplier is not at this property" };
      }
    }
    await ctx.db.patch(args.accountId, {
      name,
      billType: args.billType,
      frequency: args.frequency,
      isMetered: args.isMetered,
      provider,
      accountNumber: args.accountNumber?.trim() || undefined,
      supplierId: args.supplierId,
      expectedAmount: args.expectedAmount,
      contractEndDate: args.contractEndDate,
      glAccountCode: args.glAccountCode?.trim() || undefined,
      isActive: args.isActive,
      updatedAt: Date.now(),
    });
    if (args.isActive) {
      const updated = await ctx.db.get(args.accountId);
      if (updated) {
        const property = await ctx.db.get(updated.propertyId);
        await openCurrentPeriod(ctx, updated, Date.now(), propertyTimeZone(property));
      }
    }
    return { success: true, message: "Bill account updated" };
  },
});

export const listPeriods = query({
  args: {
    propertyId: v.id("properties"),
    status: v.optional(periodStatusValidator),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "billing.period.read", args.propertyId);
    const rows = args.status
      ? await ctx.db
          .query("billPeriods")
          .withIndex("by_propertyId_status", (q) =>
            q.eq("propertyId", args.propertyId).eq("status", args.status!),
          )
          .collect()
      : await ctx.db
          .query("billPeriods")
          .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
          .collect();
    const accounts = await ctx.db
      .query("billAccounts")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const accountById = new Map(accounts.map((account) => [account._id, account]));
    const data = await Promise.all(
      rows.map(async (row) => {
        const account = accountById.get(row.accountId);
        const documents = await listBillDocs(ctx, row._id);
        return {
          ...row,
          accountName: account?.name ?? "Unknown",
          billType: account?.billType ?? "other",
          frequency: account?.frequency ?? "monthly",
          provider: account?.provider ?? "",
          isMetered: account?.isMetered ?? false,
          documents,
        };
      }),
    );
    data.sort((a, b) => a.dueDate - b.dueDate);
    return { success: true, data };
  },
});

export const getPeriod = query({
  args: { periodId: v.id("billPeriods") },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId);
    if (!period) {
      return { success: false, data: null, message: "Bill not found" };
    }
    await requirePermission(ctx, "billing.period.read", period.propertyId);
    const account = await ctx.db.get(period.accountId);
    const documents = await listBillDocs(ctx, period._id);
    return {
      success: true,
      data: {
        ...period,
        account,
        documents,
      },
    };
  },
});

export const listDashboard = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "billing.period.read", args.propertyId);
    const property = await ctx.db.get(args.propertyId);
    const timeZone = propertyTimeZone(property);
    const now = Date.now();
    const week = weekWindow(now, timeZone);
    const periods = await ctx.db
      .query("billPeriods")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const accounts = await ctx.db
      .query("billAccounts")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const accountById = new Map(accounts.map((account) => [account._id, account]));
    const withAccount = periods.map((row) => {
      const account = accountById.get(row.accountId);
      return {
        ...row,
        accountName: account?.name ?? "Unknown",
        billType: account?.billType ?? "other",
        provider: account?.provider ?? "",
      };
    });
    const overdue = withAccount
      .filter((row) => row.status === "overdue" || (row.status !== "paid" && row.dueDate < now))
      .sort((a, b) => a.dueDate - b.dueDate);
    const dueThisWeek = withAccount
      .filter(
        (row) =>
          row.status !== "paid" &&
          row.dueDate >= week.periodStart &&
          row.dueDate <= week.periodEnd,
      )
      .sort((a, b) => a.dueDate - b.dueDate);
    return {
      success: true,
      data: {
        overdue,
        dueThisWeek,
        accountCount: accounts.filter((account) => account.isActive).length,
      },
    };
  },
});

async function openCurrentPeriod(
  ctx: MutationCtx,
  account: Doc<"billAccounts">,
  now: number,
  timeZone: string,
) {
  if (!account.isActive || !isFrequency(account.frequency)) {
    return null;
  }
  const bounds = currentPeriodBounds(now, account.frequency, timeZone);
  const existing = await findPeriodByStart(ctx, account._id, bounds.periodStart);
  if (existing) {
    return existing._id;
  }
  return await ctx.db.insert("billPeriods", {
    accountId: account._id,
    propertyId: account.propertyId,
    periodStart: bounds.periodStart,
    periodEnd: bounds.periodEnd,
    dueDate: bounds.dueDate,
    status: "expected",
    createdAt: now,
    updatedAt: now,
  });
}

export const ensureCurrentPeriod = mutation({
  args: { accountId: v.id("billAccounts") },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) {
      return { success: false, message: "Bill account not found" };
    }
    await requirePermission(ctx, "billing.period.update", account.propertyId);
    if (!account.isActive) {
      return { success: false, message: "Account is inactive" };
    }
    const property = await ctx.db.get(account.propertyId);
    const id = await openCurrentPeriod(
      ctx,
      account,
      Date.now(),
      propertyTimeZone(property),
    );
    return { success: true, id, message: "Current period is ready" };
  },
});

export const capturePeriod = mutation({
  args: {
    periodId: v.id("billPeriods"),
    amount: v.number(),
    invoiceNumber: v.optional(v.string()),
    usageAmount: v.optional(v.number()),
    unitRate: v.optional(v.number()),
    meterReading: v.optional(v.number()),
    previousMeterReading: v.optional(v.number()),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId);
    if (!period) {
      return { success: false, message: "Bill not found" };
    }
    await requirePermission(ctx, "billing.period.update", period.propertyId);
    if (period.status === "paid") {
      return { success: false, message: "Paid bills cannot be edited" };
    }
    if (!Number.isFinite(args.amount) || args.amount <= 0) {
      return { success: false, message: "Amount must be greater than 0" };
    }
    const dueDate = args.dueDate ?? period.dueDate;
    await ctx.db.patch(args.periodId, {
      amount: args.amount,
      invoiceNumber: args.invoiceNumber?.trim() || undefined,
      usageAmount: args.usageAmount,
      unitRate: args.unitRate,
      meterReading: args.meterReading,
      previousMeterReading: args.previousMeterReading,
      dueDate,
      status: dueDate < Date.now() ? "overdue" : "pending",
      updatedAt: Date.now(),
    });
    return { success: true, message: "Bill captured" };
  },
});

export const generateUploadUrl = mutation({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "billing.period.update", args.propertyId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachDocument = mutation({
  args: {
    periodId: v.id("billPeriods"),
    kind: v.union(v.literal("bill"), v.literal("receipt")),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId);
    if (!period) {
      return { success: false, message: "Bill not found" };
    }
    const auth = await requirePermission(ctx, "billing.period.update", period.propertyId);
    await ctx.db.insert("billDocuments", {
      periodId: period._id,
      kind: args.kind,
      storageId: args.storageId,
      fileName: args.fileName,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      uploadedBy: auth.user._id,
      createdAt: Date.now(),
    });
    return { success: true, message: "Document attached" };
  },
});

export const markPeriodPaid = mutation({
  args: {
    periodId: v.id("billPeriods"),
    paymentMethod: paymentMethodValidator,
  },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId);
    if (!period) {
      return { success: false, message: "Bill not found" };
    }
    const auth = await requirePermission(ctx, "billing.pay", period.propertyId);
    if (period.status === "paid" && period.expenseId) {
      return { success: true, message: "Already posted to expenses" };
    }
    if (!period.amount || period.amount <= 0) {
      return { success: false, message: "Capture an amount before marking paid" };
    }
    const documents = await ctx.db
      .query("billDocuments")
      .withIndex("by_periodId", (q) => q.eq("periodId", period._id))
      .collect();
    if (!documents.some((doc) => doc.kind === "bill")) {
      return { success: false, message: "Attach the original bill before marking paid" };
    }
    const existingBySource = await ctx.db
      .query("expenses")
      .withIndex("by_sourceType_sourceId", (q) =>
        q.eq("sourceType", "PropertyBill").eq("sourceId", period._id),
      )
      .first();
    if (existingBySource) {
      const now = Date.now();
      await ctx.db.patch(period._id, {
        status: "paid",
        expenseId: existingBySource._id,
        paidAt: period.paidAt ?? now,
        updatedAt: now,
      });
      return { success: true, message: "Already posted to expenses" };
    }
    const account = await ctx.db.get(period.accountId);
    if (!account) {
      return { success: false, message: "Bill account not found" };
    }
    const invoiceNumber = period.invoiceNumber?.trim();
    if (invoiceNumber) {
      const propertyExpenses = await ctx.db
        .query("expenses")
        .withIndex("by_propertyId_expenseDate", (q) => q.eq("propertyId", period.propertyId))
        .collect();
      const duplicate = propertyExpenses.find(
        (row) =>
          row.invoiceNumber === invoiceNumber &&
          row.vendor === account.provider &&
          row.amount === period.amount &&
          row.sourceId !== period._id,
      );
      if (duplicate) {
        return {
          success: false,
          message:
            "An expense with this vendor, invoice number, and amount already exists. Do not post twice.",
        };
      }
    }
    const now = Date.now();
    await ctx.db.insert("payments", {
      propertyId: period.propertyId,
      paymentType: "PropertyBill",
      referenceType: "PropertyBill",
      referenceId: period._id,
      amount: period.amount,
      paymentMethod: args.paymentMethod,
      status: "completed",
      paidAt: now,
      createdBy: auth.user._id,
      createdAt: now,
    });
    const billType = isBillType(account.billType) ? account.billType : "other";
    const expenseId = await ctx.db.insert("expenses", {
      propertyId: period.propertyId,
      category: expenseCategoryForBillType(billType),
      amount: period.amount,
      expenseDate: now,
      description: `${account.name} (${account.billType})`,
      vendor: account.provider,
      invoiceNumber,
      status: "paid",
      sourceType: "PropertyBill",
      sourceId: period._id,
      submittedBy: auth.user._id,
      paidBy: auth.user._id,
    });
    await ctx.db.patch(period._id, {
      status: "paid",
      expenseId,
      paidAt: now,
      updatedAt: now,
    });
    return { success: true, message: "Bill paid and posted to expenses" };
  },
});

export const generateCurrentPeriods = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const accounts = await ctx.db.query("billAccounts").collect();
    const propertyZones = new Map<string, string>();
    for (const account of accounts) {
      if (!account.isActive || !isFrequency(account.frequency)) {
        continue;
      }
      let timeZone = propertyZones.get(account.propertyId);
      if (!timeZone) {
        const property = await ctx.db.get(account.propertyId);
        timeZone = propertyTimeZone(property);
        propertyZones.set(account.propertyId, timeZone);
      }
      await openCurrentPeriod(ctx, account, now, timeZone);
    }
    const periods = await ctx.db.query("billPeriods").collect();
    for (const period of periods) {
      if (period.status !== "paid" && period.dueDate < now && period.status !== "overdue") {
        await ctx.db.patch(period._id, { status: "overdue", updatedAt: now });
      }
    }
  },
});
