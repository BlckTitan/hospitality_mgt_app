import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requirePermission, tryRequirePermission } from "./lib/rbac";
import { periodDateKeys, percentChange, propertyDateKey } from "./lib/barStock";

const STALE_MS = 24 * 60 * 60 * 1000;

export const getBarHealthMetrics = query({
  args: {
    propertyId: v.id("properties"),
    periodType: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly"),
      v.literal("yoy"),
    ),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "fnb.read", args.propertyId);
    const dateKey = await propertyDateKey(ctx, args.propertyId);
    const logPeriod = args.periodType === "yoy" ? "yearly" : args.periodType;
    const keys = periodDateKeys(dateKey, logPeriod);

    const logs = [];
    for (const logDate of keys) {
      const page = await ctx.db
        .query("userStockLogs")
        .withIndex("by_propertyId_logDate", (q) =>
          q.eq("propertyId", args.propertyId).eq("logDate", logDate),
        )
        .collect();
      logs.push(...page);
    }

    const sessions = new Map<string, boolean>();
    const waiterShifts = new Set<string>();
    const waiterAgg = new Map<
      string,
      { userId: Id<"users">; revenue: number; qty: number; shifts: Set<string> }
    >();
    const skuAgg = new Map<
      Id<"beverages">,
      { beverageId: Id<"beverages">; qty: number; revenue: number }
    >();

    let totalRevenue = 0;
    let totalQtySold = 0;
    let finalizedLogCount = 0;

    for (const log of logs) {
      totalRevenue += log.salesValue;
      totalQtySold += log.salesQuantity;
      if (log.isFinalized) finalizedLogCount += 1;

      const sessionKey = `${log.userId}:${log.barId ?? ""}:${log.logDate}`;
      const sessionFinalized = sessions.get(sessionKey);
      sessions.set(
        sessionKey,
        sessionFinalized === undefined ? log.isFinalized : sessionFinalized && log.isFinalized,
      );

      const shiftKey = log.shiftId ?? `${log.userId}:${log.logDate}`;
      waiterShifts.add(shiftKey);

      let waiter = waiterAgg.get(log.userId);
      if (!waiter) {
        waiter = { userId: log.userId, revenue: 0, qty: 0, shifts: new Set() };
        waiterAgg.set(log.userId, waiter);
      }
      waiter.revenue += log.salesValue;
      waiter.qty += log.salesQuantity;
      waiter.shifts.add(shiftKey);

      const sku = skuAgg.get(log.beverageId) ?? {
        beverageId: log.beverageId,
        qty: 0,
        revenue: 0,
      };
      sku.qty += log.salesQuantity;
      sku.revenue += log.salesValue;
      skuAgg.set(log.beverageId, sku);
    }

    const liveRevenue = totalRevenue;
    const liveWaiterShiftCount = waiterShifts.size;

    let priorYearRevenue: number | null = null;
    let priorYearQty: number | null = null;
    let revenueYoY: number | null = null;
    let qtyYoY: number | null = null;

    if (args.periodType === "yearly" || args.periodType === "yoy") {
      const yearKey = dateKey.slice(0, 4);
      const yearRows = await ctx.db
        .query("salesSummaries")
        .withIndex("by_propertyId_periodType_periodKey", (q) =>
          q.eq("propertyId", args.propertyId).eq("periodType", "yearly").eq("periodKey", yearKey),
        )
        .collect();

      if (yearRows.length > 0) {
        skuAgg.clear();
        waiterAgg.clear();
        totalRevenue = 0;
        totalQtySold = 0;
        for (const row of yearRows) {
          totalRevenue += row.totalRevenue;
          totalQtySold += row.totalQtySold;
          const sku = skuAgg.get(row.beverageId) ?? {
            beverageId: row.beverageId,
            qty: 0,
            revenue: 0,
          };
          sku.qty += row.totalQtySold;
          sku.revenue += row.totalRevenue;
          skuAgg.set(row.beverageId, sku);
          if (row.userId) {
            let waiter = waiterAgg.get(row.userId);
            if (!waiter) {
              waiter = { userId: row.userId, revenue: 0, qty: 0, shifts: new Set() };
              waiterAgg.set(row.userId, waiter);
            }
            waiter.revenue += row.totalRevenue;
            waiter.qty += row.totalQtySold;
          }
        }
      }

      if (args.periodType === "yoy") {
        const priorKey = String(Number(yearKey) - 1);
        const priorRows = await ctx.db
          .query("salesSummaries")
          .withIndex("by_propertyId_periodType_periodKey", (q) =>
            q.eq("propertyId", args.propertyId).eq("periodType", "yearly").eq("periodKey", priorKey),
          )
          .collect();
        priorYearRevenue = priorRows.reduce((sum, row) => sum + row.totalRevenue, 0);
        priorYearQty = priorRows.reduce((sum, row) => sum + row.totalQtySold, 0);
        revenueYoY = percentChange(totalRevenue, priorYearRevenue);
        qtyYoY = percentChange(totalQtySold, priorYearQty);
      }
    }

    const sessionCount = sessions.size;
    const finalizedSessionCount = [...sessions.values()].filter(Boolean).length;

    const waiterRows = [...waiterAgg.values()]
      .map((waiter) => {
        const shiftCount = waiter.shifts.size;
        return {
          userId: waiter.userId,
          totalRevenue: waiter.revenue,
          totalQtySold: waiter.qty,
          shiftCount,
          revenuePerShift: shiftCount > 0 ? waiter.revenue / shiftCount : 0,
        };
      })
      .sort((a, b) => b.revenuePerShift - a.revenuePerShift || b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    const waiters = await Promise.all(
      waiterRows.map(async (waiter) => {
        const user = await ctx.db.get(waiter.userId);
        return {
          ...waiter,
          name: user?.name ?? "Unknown",
        };
      }),
    );

    const skuList = [...skuAgg.values()].sort((a, b) => b.revenue - a.revenue || b.qty - a.qty);
    const topSlice = skuList.slice(0, 5);
    const topIds = new Set(topSlice.map((row) => row.beverageId));
    const bottomSlice = [...skuList]
      .reverse()
      .filter((row) => !topIds.has(row.beverageId))
      .slice(0, 5);

    const withBeverage = async (
      rows: { beverageId: Id<"beverages">; qty: number; revenue: number }[],
    ) =>
      Promise.all(
        rows.map(async (row) => {
          const beverage = await ctx.db.get(row.beverageId);
          return {
            beverageId: row.beverageId,
            name: beverage?.name ?? "Unknown",
            category: beverage?.category ?? null,
            qty: row.qty,
            revenue: row.revenue,
          };
        }),
      );

    const canInventory = await tryRequirePermission(ctx, "inventory.read", args.propertyId);
    let openReorderCount: number | null = null;
    let unresolvedReorderCount: number | null = null;
    let staleReorderCount: number | null = null;
    let oldestReorderAgeHours: number | null = null;

    if (canInventory) {
      const open = await ctx.db
        .query("reorderAlerts")
        .withIndex("by_propertyId_status", (q) =>
          q.eq("propertyId", args.propertyId).eq("status", "open"),
        )
        .collect();
      const acknowledged = await ctx.db
        .query("reorderAlerts")
        .withIndex("by_propertyId_status", (q) =>
          q.eq("propertyId", args.propertyId).eq("status", "acknowledged"),
        )
        .collect();
      const unresolved = [...open, ...acknowledged];
      const now = Date.now();
      let oldestAlertedAt: number | null = null;
      let staleCount = 0;
      for (const alert of unresolved) {
        if (oldestAlertedAt === null || alert.alertedAt < oldestAlertedAt) {
          oldestAlertedAt = alert.alertedAt;
        }
        if (now - alert.alertedAt >= STALE_MS) staleCount += 1;
      }
      openReorderCount = open.length;
      unresolvedReorderCount = unresolved.length;
      staleReorderCount = staleCount;
      oldestReorderAgeHours =
        oldestAlertedAt === null ? null : Math.floor((now - oldestAlertedAt) / 3_600_000);
    }

    return {
      periodType: args.periodType,
      periodStart: keys[0] ?? dateKey,
      periodEnd: dateKey,
      logCount: logs.length,
      finalizedLogCount,
      openLogCount: logs.length - finalizedLogCount,
      sessionCount,
      finalizedSessionCount,
      finalizeRate: sessionCount > 0 ? finalizedSessionCount / sessionCount : 1,
      waiterShiftCount: liveWaiterShiftCount,
      revenuePerWaiterShift: liveWaiterShiftCount > 0 ? liveRevenue / liveWaiterShiftCount : 0,
      totalRevenue,
      totalQtySold,
      openReorderCount,
      unresolvedReorderCount,
      staleReorderCount,
      oldestReorderAgeHours,
      waiters,
      topSkus: await withBeverage(topSlice),
      bottomSkus: await withBeverage(bottomSlice),
      priorYearRevenue,
      priorYearQty,
      revenueYoY,
      qtyYoY,
      healthWindowDays: args.periodType === "yearly" || args.periodType === "yoy" ? 30 : keys.length,
    };
  },
});
