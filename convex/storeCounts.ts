import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import {
  applyStoreQtyChange,
  findStoreInventory,
  maybeOpenReorderAlert,
  propertyDateKey,
} from "./lib/barStock";

export const listStoreCounts = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "inventory.read", args.propertyId);
    const counts = await ctx.db
      .query("storeCounts")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .order("desc")
      .take(50);

    const data = await Promise.all(
      counts.map(async (count) => {
        const countedBy = await ctx.db.get(count.countedByUserId);
        return { ...count, countedBy };
      }),
    );
    return { success: true, data };
  },
});

export const getActiveStoreCount = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "inventory.read", args.propertyId);

    const draft = await ctx.db
      .query("storeCounts")
      .withIndex("by_propertyId_status", (q) =>
        q.eq("propertyId", args.propertyId).eq("status", "draft"),
      )
      .order("desc")
      .first();

    const count =
      draft ??
      (await ctx.db
        .query("storeCounts")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
        .order("desc")
        .first());

    if (!count) {
      return { success: true, data: null };
    }

    const lines = await ctx.db
      .query("storeCountLines")
      .withIndex("by_countId", (q) => q.eq("countId", count._id))
      .collect();

    const linesWithData = await Promise.all(
      lines.map(async (line) => {
        const beverage = await ctx.db.get(line.beverageId);
        const liveBook = await findStoreInventory(ctx, args.propertyId, line.beverageId);
        return {
          ...line,
          beverage,
          liveBookQty: liveBook?.qtyInStore ?? line.bookQty,
        };
      }),
    );

    const countedBy = await ctx.db.get(count.countedByUserId);
    return {
      success: true,
      data: {
        ...count,
        countedBy,
        lines: linesWithData.sort((a, b) =>
          (a.beverage?.name ?? "").localeCompare(b.beverage?.name ?? ""),
        ),
      },
    };
  },
});

export const startStoreCount = mutation({
  args: {
    propertyId: v.id("properties"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, "inventory.update", args.propertyId);

    const existingDraft = await ctx.db
      .query("storeCounts")
      .withIndex("by_propertyId_status", (q) =>
        q.eq("propertyId", args.propertyId).eq("status", "draft"),
      )
      .first();
    if (existingDraft) {
      return {
        success: false,
        message: "A draft store count already exists. Finish or continue that count.",
        id: existingDraft._id,
      };
    }

    const inventories = await ctx.db
      .query("storeInventories")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    if (inventories.length === 0) {
      return { success: false, message: "No store inventory rows to count. Receive stock first." };
    }

    const now = Date.now();
    const countDateKey = await propertyDateKey(ctx, args.propertyId, now);
    const countId = await ctx.db.insert("storeCounts", {
      propertyId: args.propertyId,
      countDateKey,
      status: "draft",
      countedByUserId: auth.user._id,
      notes: args.notes,
      createdAt: now,
    });

    for (const inventory of inventories) {
      await ctx.db.insert("storeCountLines", {
        propertyId: args.propertyId,
        countId,
        beverageId: inventory.beverageId,
        bookQty: inventory.qtyInStore,
      });
    }

    return { success: true, message: "Store count started", id: countId };
  },
});

export const saveStoreCountLines = mutation({
  args: {
    countId: v.id("storeCounts"),
    lines: v.array(
      v.object({
        lineId: v.id("storeCountLines"),
        countedQty: v.number(),
        notes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const count = await ctx.db.get(args.countId);
    if (!count) {
      return { success: false, message: "Store count not found" };
    }
    await requirePermission(ctx, "inventory.update", count.propertyId);
    if (count.status !== "draft") {
      return { success: false, message: "Only draft counts can be edited" };
    }

    for (const patch of args.lines) {
      if (patch.countedQty < 0 || !Number.isFinite(patch.countedQty)) {
        return { success: false, message: "Counted qty must be a non-negative number" };
      }
      const line = await ctx.db.get(patch.lineId);
      if (!line || line.countId !== args.countId) {
        return { success: false, message: "Invalid count line" };
      }
      await ctx.db.patch(patch.lineId, {
        countedQty: patch.countedQty,
        varianceQty: patch.countedQty - line.bookQty,
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      });
    }

    return { success: true, message: "Count lines saved" };
  },
});

export const postStoreCount = mutation({
  args: { countId: v.id("storeCounts") },
  handler: async (ctx, args) => {
    const count = await ctx.db.get(args.countId);
    if (!count) {
      return { success: false, message: "Store count not found" };
    }
    const auth = await requirePermission(ctx, "inventory.update", count.propertyId);
    if (count.status !== "draft") {
      return { success: false, message: "Count is already posted" };
    }

    const lines = await ctx.db
      .query("storeCountLines")
      .withIndex("by_countId", (q) => q.eq("countId", args.countId))
      .collect();

    if (lines.length === 0) {
      return { success: false, message: "Count has no lines" };
    }
    for (const line of lines) {
      if (line.countedQty === undefined || line.countedQty === null) {
        return { success: false, message: "Enter counted qty for every line before posting" };
      }
    }

    const now = Date.now();
    const txnDateKey = await propertyDateKey(ctx, count.propertyId, now);
    let netVarianceQty = 0;

    for (const line of lines) {
      const countedQty = line.countedQty!;
      const inventory = await findStoreInventory(ctx, count.propertyId, line.beverageId);
      if (!inventory) {
        return { success: false, message: "Store inventory missing for a count line" };
      }

      // Re-snapshot book at post time so variance matches live on-hand
      const bookQty = inventory.qtyInStore;
      const varianceQty = countedQty - bookQty;
      netVarianceQty += varianceQty;

      await ctx.db.patch(line._id, {
        bookQty,
        countedQty,
        varianceQty,
      });

      if (varianceQty === 0) continue;

      await applyStoreQtyChange(ctx, inventory, varianceQty);
      await ctx.db.insert("storeTransactions", {
        propertyId: count.propertyId,
        beverageId: line.beverageId,
        txnType: "count_adjust",
        qty: varianceQty,
        txnDate: now,
        txnDateKey,
        notes: line.notes || "Store physical count",
        storeCountLineId: line._id,
      });

      const refreshed = await findStoreInventory(ctx, count.propertyId, line.beverageId);
      if (refreshed) {
        await maybeOpenReorderAlert(ctx, {
          propertyId: count.propertyId,
          beverageId: line.beverageId,
          qtyInStore: refreshed.qtyInStore,
          reorderThreshold: refreshed.reorderThreshold,
        });
      }
    }

    await ctx.db.patch(args.countId, {
      status: "posted",
      postedAt: now,
      postedByUserId: auth.user._id,
      netVarianceQty,
    });

    return {
      success: true,
      message: "Store count posted",
      netVarianceQty,
    };
  },
});
