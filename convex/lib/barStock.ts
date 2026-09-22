import { MutationCtx, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { localDayBounds, propertyTimeZone } from "./billingPeriods";
import { findOrCreateFnBShift } from "./shiftHelpers";

type DbCtx = MutationCtx | QueryCtx;

export type StoreTxnType = "receive" | "issue";

export async function propertyDateKey(
  ctx: DbCtx,
  propertyId: Id<"properties">,
  now = Date.now(),
): Promise<string> {
  const property = await ctx.db.get(propertyId);
  return localDayBounds(now, propertyTimeZone(property)).dateKey;
}

export async function findStoreInventory(
  ctx: DbCtx,
  propertyId: Id<"properties">,
  beverageId: Id<"beverages">,
) {
  return await ctx.db
    .query("storeInventories")
    .withIndex("by_propertyId_beverageId", (q) =>
      q.eq("propertyId", propertyId).eq("beverageId", beverageId),
    )
    .first();
}

export async function lastFinalizedClosingStock(
  ctx: DbCtx,
  args: {
    userId: Id<"users">;
    barId: Id<"bars">;
    beverageId: Id<"beverages">;
    beforeDate: string;
  },
): Promise<number> {
  const prior = await ctx.db
    .query("userStockLogs")
    .withIndex("by_userId_barId_bev_date", (q) =>
      q
        .eq("userId", args.userId)
        .eq("barId", args.barId)
        .eq("beverageId", args.beverageId)
        .lt("logDate", args.beforeDate),
    )
    .order("desc")
    .take(90);

  const finalized = prior.find((log) => log.isFinalized);
  return finalized?.closingStock ?? 0;
}

function derivedSales(totalStock: number, closingStock: number, unitPrice: number) {
  const salesQuantity = totalStock - closingStock;
  if (salesQuantity < 0) {
    throw new Error("Closing stock cannot be greater than total stock");
  }
  return {
    salesQuantity,
    salesValue: salesQuantity * unitPrice,
  };
}

export async function applyIssuedQtyToStockLog(
  ctx: MutationCtx,
  args: {
    propertyId: Id<"properties">;
    userId: Id<"users">;
    barId: Id<"bars">;
    beverageId: Id<"beverages">;
    logDate: string;
    qty: number;
    unitPrice: number;
  },
): Promise<void> {
  if (args.qty === 0) return;

  const existing = await ctx.db
    .query("userStockLogs")
    .withIndex("by_userId_barId_bev_date", (q) =>
      q
        .eq("userId", args.userId)
        .eq("barId", args.barId)
        .eq("beverageId", args.beverageId)
        .eq("logDate", args.logDate),
    )
    .first();

  if (existing) {
    if (existing.isFinalized) {
      throw new Error("Cannot change stock on a finalized day");
    }
    const newStockReceived = existing.newStockReceived + args.qty;
    if (newStockReceived < 0) {
      throw new Error("Cannot reverse more issued stock than this day received");
    }
    const totalStock = existing.openingStock + newStockReceived;
    const countedClosing = existing.closingStock !== existing.totalStock;
    const closingStock = countedClosing ? existing.closingStock : totalStock;
    const sales = derivedSales(totalStock, closingStock, args.unitPrice);
    await ctx.db.patch(existing._id, {
      newStockReceived,
      totalStock,
      closingStock,
      ...sales,
      lastUpdatedAt: Date.now(),
    });
    return;
  }

  if (args.qty < 0) {
    throw new Error("No stock log exists to reverse this issue against");
  }

  const openingStock = await lastFinalizedClosingStock(ctx, {
    userId: args.userId,
    barId: args.barId,
    beverageId: args.beverageId,
    beforeDate: args.logDate,
  });
  const newStockReceived = args.qty;
  const totalStock = openingStock + newStockReceived;
  const shiftId = await findOrCreateFnBShift(ctx, {
    propertyId: args.propertyId,
    userId: args.userId,
    barId: args.barId,
    shiftDate: args.logDate,
  });

  await ctx.db.insert("userStockLogs", {
    propertyId: args.propertyId,
    shiftId,
    userId: args.userId,
    barId: args.barId,
    beverageId: args.beverageId,
    logDate: args.logDate,
    openingStock,
    newStockReceived,
    totalStock,
    closingStock: totalStock,
    salesQuantity: 0,
    salesValue: 0,
    isFinalized: false,
    lastUpdatedAt: Date.now(),
  });
}

export async function previewIssueToStockLog(
  ctx: DbCtx,
  args: {
    userId: Id<"users">;
    barId: Id<"bars">;
    beverageId: Id<"beverages">;
    logDate: string;
    qty: number;
  },
): Promise<{ error?: string }> {
  const existing = await ctx.db
    .query("userStockLogs")
    .withIndex("by_userId_barId_bev_date", (q) =>
      q
        .eq("userId", args.userId)
        .eq("barId", args.barId)
        .eq("beverageId", args.beverageId)
        .eq("logDate", args.logDate),
    )
    .first();

  if (!existing) {
    if (args.qty < 0) {
      return { error: "No stock log exists to reverse this issue against" };
    }
    return {};
  }
  if (existing.isFinalized) {
    return { error: "Cannot issue stock to a finalized day" };
  }
  const newStockReceived = existing.newStockReceived + args.qty;
  if (newStockReceived < 0) {
    return { error: "Cannot reverse more issued stock than this day received" };
  }
  const totalStock = existing.openingStock + newStockReceived;
  const countedClosing = existing.closingStock !== existing.totalStock;
  const closingStock = countedClosing ? existing.closingStock : totalStock;
  if (totalStock - closingStock < 0) {
    return { error: "This change would make closing stock greater than total stock" };
  }
  return {};
}

export async function applyStoreQtyChange(
  ctx: MutationCtx,
  inventory: Doc<"storeInventories">,
  delta: number,
): Promise<number> {
  const newQty = inventory.qtyInStore + delta;
  if (newQty < 0) {
    throw new Error("Insufficient stock in store");
  }
  await ctx.db.patch(inventory._id, {
    qtyInStore: newQty,
    lastUpdated: Date.now(),
  });
  return newQty;
}

export async function maybeOpenReorderAlert(
  ctx: MutationCtx,
  args: {
    propertyId: Id<"properties">;
    beverageId: Id<"beverages">;
    qtyInStore: number;
    reorderThreshold: number;
  },
) {
  if (args.qtyInStore > args.reorderThreshold) return;

  const existingOpenAlert = await ctx.db
    .query("reorderAlerts")
    .withIndex("by_beverageId_status", (q) =>
      q.eq("beverageId", args.beverageId).eq("status", "open"),
    )
    .first();
  if (existingOpenAlert) return;

  await ctx.db.insert("reorderAlerts", {
    propertyId: args.propertyId,
    beverageId: args.beverageId,
    qtyAtAlert: args.qtyInStore,
    reorderLevel: args.reorderThreshold,
    alertedAt: Date.now(),
    status: "open",
  });
}

export async function ensureStoreInventoryForReceive(
  ctx: MutationCtx,
  args: {
    propertyId: Id<"properties">;
    beverageId: Id<"beverages">;
    reorderThreshold: number;
  },
): Promise<Doc<"storeInventories">> {
  const existing = await findStoreInventory(ctx, args.propertyId, args.beverageId);
  if (existing) return existing;

  const id = await ctx.db.insert("storeInventories", {
    propertyId: args.propertyId,
    beverageId: args.beverageId,
    qtyInStore: 0,
    reorderThreshold: args.reorderThreshold,
    lastUpdated: Date.now(),
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Failed to create store inventory");
  return created;
}

export function isoWeekNumber(dateKey: string): { year: number; week: number } {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const year = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year, week };
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(next.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function lastNDailyKeys(endDateKey: string, n: number): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(shiftDateKey(endDateKey, -i));
  }
  return keys;
}

export type PeriodType = "daily" | "weekly" | "monthly" | "yearly";

export function currentPeriodKey(dateKey: string, periodType: PeriodType): string {
  if (periodType === "daily") return dateKey;
  if (periodType === "monthly") return dateKey.slice(0, 7);
  if (periodType === "yearly") return dateKey.slice(0, 4);
  const { year, week } = isoWeekNumber(dateKey);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export async function findSalesSummary(
  ctx: DbCtx,
  args: {
    propertyId: Id<"properties">;
    barId: Id<"bars">;
    beverageId: Id<"beverages">;
    userId?: Id<"users">;
    periodType: PeriodType;
    periodKey: string;
  },
) {
  const rows = await ctx.db
    .query("salesSummaries")
    .withIndex("by_propertyId_barId_period", (q) =>
      q
        .eq("propertyId", args.propertyId)
        .eq("barId", args.barId)
        .eq("periodType", args.periodType)
        .eq("periodKey", args.periodKey),
    )
    .take(200);

  return (
    rows.find(
      (row) =>
        row.beverageId === args.beverageId &&
        (row.userId ?? undefined) === (args.userId ?? undefined),
    ) ?? null
  );
}

export async function upsertSalesSummaryDoc(
  ctx: MutationCtx,
  args: {
    propertyId: Id<"properties">;
    barId: Id<"bars">;
    userId?: Id<"users">;
    beverageId: Id<"beverages">;
    periodType: PeriodType;
    periodKey: string;
    year: number;
    month?: number;
    weekNumber?: number;
    totalQtySold: number;
    totalRevenue: number;
  },
) {
  const existing = await findSalesSummary(ctx, args);
  if (existing) {
    await ctx.db.patch(existing._id, {
      totalQtySold: args.totalQtySold,
      totalRevenue: args.totalRevenue,
    });
    return existing._id;
  }
  return await ctx.db.insert("salesSummaries", args);
}
