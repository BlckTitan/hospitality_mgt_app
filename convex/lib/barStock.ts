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

export function resolveUnitCost(unitCost?: number | null): number {
  return typeof unitCost === "number" && Number.isFinite(unitCost) && unitCost >= 0
    ? unitCost
    : 0;
}

export function recipeLineCost(quantity: number, unitCost: number, wastePercent?: number): number {
  const waste = typeof wastePercent === "number" && wastePercent > 0 ? wastePercent / 100 : 0;
  return quantity * unitCost * (1 + waste);
}

export async function resolveBeverageUnitCost(
  ctx: DbCtx,
  beverage: Doc<"beverages"> | null | undefined,
): Promise<number> {
  if (!beverage) return 0;

  const recipeLines = await ctx.db
    .query("beverageRecipeLines")
    .withIndex("by_beverageId", (q) => q.eq("beverageId", beverage._id))
    .collect();
  if (recipeLines.length > 0) {
    let cost = 0;
    for (const line of recipeLines) {
      const item = await ctx.db.get(line.inventoryItemId);
      cost += recipeLineCost(line.quantity, resolveUnitCost(item?.unitCost), line.wastePercent);
    }
    return cost;
  }

  if (beverage.inventoryItemId) {
    const item = await ctx.db.get(beverage.inventoryItemId);
    if (item && item.unitCost !== undefined && item.unitCost !== null) {
      return resolveUnitCost(item.unitCost);
    }
  }

  return resolveUnitCost(beverage.unitCost);
}

export function derivedSales(
  totalStock: number,
  closingStock: number,
  unitPrice: number,
  unitCost: number,
  wasteQuantity = 0,
  compQuantity = 0,
) {
  const disappeared = totalStock - closingStock;
  if (disappeared < 0) {
    throw new Error("Closing stock cannot be greater than total stock");
  }
  const waste = resolveUnitCost(wasteQuantity);
  const comps = resolveUnitCost(compQuantity);
  if (waste + comps > disappeared) {
    throw new Error("Waste and comps cannot exceed stock that disappeared");
  }
  const salesQuantity = disappeared - waste - comps;
  return {
    salesQuantity,
    salesValue: salesQuantity * unitPrice,
    wasteQuantity: waste,
    compQuantity: comps,
    unitCostAtSale: unitCost,
    cogsValue: disappeared * unitCost,
  };
}

export async function computeCogsSnapshot(
  ctx: DbCtx,
  log: Pick<
    Doc<"userStockLogs">,
    "beverageId" | "salesQuantity" | "wasteQuantity" | "compQuantity" | "unitCostAtSale" | "cogsValue"
  >,
): Promise<{ unitCostAtSale: number; cogsValue: number }> {
  if (log.unitCostAtSale !== undefined && log.cogsValue !== undefined) {
    return { unitCostAtSale: log.unitCostAtSale, cogsValue: log.cogsValue };
  }
  const beverage = await ctx.db.get(log.beverageId);
  const unitCostAtSale = log.unitCostAtSale ?? (await resolveBeverageUnitCost(ctx, beverage));
  const disappeared =
    log.salesQuantity + (log.wasteQuantity ?? 0) + (log.compQuantity ?? 0);
  return {
    unitCostAtSale,
    cogsValue: log.cogsValue ?? disappeared * unitCostAtSale,
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
    unitCost?: number;
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
    const sales = derivedSales(
      totalStock,
      closingStock,
      args.unitPrice,
      resolveUnitCost(args.unitCost),
      existing.wasteQuantity,
      existing.compQuantity,
    );
    await ctx.db.patch(existing._id, {
      newStockReceived,
      totalStock,
      closingStock,
      ...sales,
      lastUpdatedAt: Date.now(),
    });
    await refreshSalesSummariesForLog(ctx, {
      propertyId: existing.propertyId,
      barId: existing.barId,
      userId: existing.userId,
      beverageId: existing.beverageId,
      logDate: existing.logDate,
      salesQuantity: sales.salesQuantity,
      salesValue: sales.salesValue,
      cogsValue: sales.cogsValue,
      wasteQuantity: sales.wasteQuantity,
      compQuantity: sales.compQuantity,
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
    wasteQuantity: 0,
    compQuantity: 0,
    unitCostAtSale: resolveUnitCost(args.unitCost),
    cogsValue: 0,
    isFinalized: false,
    lastUpdatedAt: Date.now(),
  });
  await refreshSalesSummariesForLog(ctx, {
    propertyId: args.propertyId,
    barId: args.barId,
    userId: args.userId,
    beverageId: args.beverageId,
    logDate: args.logDate,
    salesQuantity: 0,
    salesValue: 0,
    cogsValue: 0,
    wasteQuantity: 0,
    compQuantity: 0,
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

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isoWeekDateKeys(dateKey: string): string[] {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = date.getUTCDay() || 7;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - (dayNum - 1));
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(monday);
    next.setUTCDate(monday.getUTCDate() + index);
    const yy = next.getUTCFullYear();
    const mm = String(next.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(next.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  });
}

export function monthDateKeys(year: number, month: number, throughDay?: number): string[] {
  const lastDay = daysInMonth(year, month);
  const endDay = Math.min(throughDay ?? lastDay, lastDay);
  const mm = String(month).padStart(2, "0");
  const keys: string[] = [];
  for (let day = 1; day <= endDay; day += 1) {
    keys.push(`${year}-${mm}-${String(day).padStart(2, "0")}`);
  }
  return keys;
}

export function periodDateKeys(
  dateKey: string,
  periodType: PeriodType,
): string[] {
  if (periodType === "daily") return [dateKey];
  if (periodType === "weekly") return isoWeekDateKeys(dateKey);
  if (periodType === "yearly") return lastNDailyKeys(dateKey, 30);
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7));
  const throughDay = Number(dateKey.slice(8, 10));
  return monthDateKeys(year, month, throughDay);
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
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
    .withIndex("by_barId_beverage_period", (q) =>
      q
        .eq("barId", args.barId)
        .eq("beverageId", args.beverageId)
        .eq("periodType", args.periodType)
        .eq("periodKey", args.periodKey),
    )
    .collect();

  return (
    rows.find(
      (row) =>
        row.propertyId === args.propertyId &&
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
    totalCogs?: number;
    totalWasteQty?: number;
    totalCompQty?: number;
  },
) {
  const existing = await findSalesSummary(ctx, args);
  const totals = {
    totalQtySold: args.totalQtySold,
    totalRevenue: args.totalRevenue,
    totalCogs: args.totalCogs ?? 0,
    totalWasteQty: args.totalWasteQty ?? 0,
    totalCompQty: args.totalCompQty ?? 0,
  };
  if (existing) {
    await ctx.db.patch(existing._id, totals);
    return existing._id;
  }
  return await ctx.db.insert("salesSummaries", { ...args, ...totals });
}

type SummaryLog = {
  propertyId: Id<"properties">;
  barId?: Id<"bars">;
  userId: Id<"users">;
  beverageId: Id<"beverages">;
  logDate: string;
  salesQuantity: number;
  salesValue: number;
  cogsValue?: number;
  wasteQuantity?: number;
  compQuantity?: number;
};

async function sumDailySummaries(
  ctx: MutationCtx,
  args: {
    propertyId: Id<"properties">;
    barId: Id<"bars">;
    userId: Id<"users">;
    beverageId: Id<"beverages">;
    dayKeys: string[];
  },
) {
  let totalQtySold = 0;
  let totalRevenue = 0;
  let totalCogs = 0;
  let totalWasteQty = 0;
  let totalCompQty = 0;
  for (const periodKey of args.dayKeys) {
    const row = await findSalesSummary(ctx, {
      propertyId: args.propertyId,
      barId: args.barId,
      userId: args.userId,
      beverageId: args.beverageId,
      periodType: "daily",
      periodKey,
    });
    if (!row) continue;
    totalQtySold += row.totalQtySold;
    totalRevenue += row.totalRevenue;
    totalCogs += row.totalCogs ?? 0;
    totalWasteQty += row.totalWasteQty ?? 0;
    totalCompQty += row.totalCompQty ?? 0;
  }
  return { totalQtySold, totalRevenue, totalCogs, totalWasteQty, totalCompQty };
}

export async function refreshSalesSummariesForLog(
  ctx: MutationCtx,
  log: SummaryLog,
) {
  if (!log.barId) return;

  const identity = {
    propertyId: log.propertyId,
    barId: log.barId,
    userId: log.userId,
    beverageId: log.beverageId,
  };
  const year = Number(log.logDate.slice(0, 4));
  const month = Number(log.logDate.slice(5, 7));
  const { year: isoYear, week } = isoWeekNumber(log.logDate);
  const weekKey = currentPeriodKey(log.logDate, "weekly");
  const monthKey = currentPeriodKey(log.logDate, "monthly");
  const yearKey = currentPeriodKey(log.logDate, "yearly");

  await upsertSalesSummaryDoc(ctx, {
    ...identity,
    periodType: "daily",
    periodKey: log.logDate,
    year,
    month,
    weekNumber: week,
    totalQtySold: log.salesQuantity,
    totalRevenue: log.salesValue,
    totalCogs: log.cogsValue ?? 0,
    totalWasteQty: log.wasteQuantity ?? 0,
    totalCompQty: log.compQuantity ?? 0,
  });

  const weekly = await sumDailySummaries(ctx, {
    ...identity,
    dayKeys: isoWeekDateKeys(log.logDate),
  });
  await upsertSalesSummaryDoc(ctx, {
    ...identity,
    periodType: "weekly",
    periodKey: weekKey,
    year: isoYear,
    weekNumber: week,
    totalQtySold: weekly.totalQtySold,
    totalRevenue: weekly.totalRevenue,
    totalCogs: weekly.totalCogs,
    totalWasteQty: weekly.totalWasteQty,
    totalCompQty: weekly.totalCompQty,
  });

  const monthly = await sumDailySummaries(ctx, {
    ...identity,
    dayKeys: monthDateKeys(year, month),
  });
  await upsertSalesSummaryDoc(ctx, {
    ...identity,
    periodType: "monthly",
    periodKey: monthKey,
    year,
    month,
    totalQtySold: monthly.totalQtySold,
    totalRevenue: monthly.totalRevenue,
    totalCogs: monthly.totalCogs,
    totalWasteQty: monthly.totalWasteQty,
    totalCompQty: monthly.totalCompQty,
  });

  let yearlyQty = 0;
  let yearlyRevenue = 0;
  let yearlyCogs = 0;
  let yearlyWaste = 0;
  let yearlyComp = 0;
  for (let monthIndex = 1; monthIndex <= 12; monthIndex += 1) {
    const row = await findSalesSummary(ctx, {
      ...identity,
      periodType: "monthly",
      periodKey: `${year}-${String(monthIndex).padStart(2, "0")}`,
    });
    if (!row) continue;
    yearlyQty += row.totalQtySold;
    yearlyRevenue += row.totalRevenue;
    yearlyCogs += row.totalCogs ?? 0;
    yearlyWaste += row.totalWasteQty ?? 0;
    yearlyComp += row.totalCompQty ?? 0;
  }
  await upsertSalesSummaryDoc(ctx, {
    ...identity,
    periodType: "yearly",
    periodKey: yearKey,
    year,
    totalQtySold: yearlyQty,
    totalRevenue: yearlyRevenue,
    totalCogs: yearlyCogs,
    totalWasteQty: yearlyWaste,
    totalCompQty: yearlyComp,
  });
}

export async function refreshSalesSummariesForLogs(
  ctx: MutationCtx,
  logs: SummaryLog[],
) {
  for (const log of logs) {
    await refreshSalesSummariesForLog(ctx, log);
  }
}
