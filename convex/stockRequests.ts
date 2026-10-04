import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { requirePermission, tryRequirePermission } from "./lib/rbac";
import { issueStockToUser, resolveBeverageUnitCost } from "./lib/barStock";

type DbCtx = MutationCtx | QueryCtx;

async function loadRequestWithLines(ctx: DbCtx, requestId: Id<"stockRequests">) {
  const request = await ctx.db.get(requestId);
  if (!request) return null;
  const lines = await ctx.db
    .query("stockRequestLines")
    .withIndex("by_requestId", (q) => q.eq("requestId", requestId))
    .collect();
  const linesWithData = await Promise.all(
    lines.map(async (line) => {
      const beverage = await ctx.db.get(line.beverageId);
      const inventory = await ctx.db
        .query("storeInventories")
        .withIndex("by_propertyId_beverageId", (q) =>
          q.eq("propertyId", request.propertyId).eq("beverageId", line.beverageId),
        )
        .first();
      return {
        ...line,
        beverage,
        qtyInStore: inventory?.qtyInStore ?? 0,
      };
    }),
  );
  const [bar, requester, reviewer] = await Promise.all([
    ctx.db.get(request.barId),
    ctx.db.get(request.requestedByUserId),
    request.reviewedByUserId ? ctx.db.get(request.reviewedByUserId) : null,
  ]);
  return { ...request, bar, requester, reviewer, lines: linesWithData };
}

async function refreshRequestStatus(
  ctx: MutationCtx,
  requestId: Id<"stockRequests">,
  reviewedByUserId: Id<"users">,
) {
  const lines = await ctx.db
    .query("stockRequestLines")
    .withIndex("by_requestId", (q) => q.eq("requestId", requestId))
    .collect();
  const pending = lines.filter((line) => line.status === "pending").length;
  const approved = lines.filter((line) => line.status === "approved").length;
  const rejected = lines.filter((line) => line.status === "rejected").length;
  let status: Doc<"stockRequests">["status"] = "pending";
  if (pending === 0 && approved > 0 && rejected === 0) status = "approved";
  else if (pending === 0 && approved === 0 && rejected > 0) status = "rejected";
  else if (approved > 0) status = "partial";
  await ctx.db.patch(requestId, {
    status,
    reviewedAt: Date.now(),
    reviewedByUserId,
  });
  return status;
}

export const listStockRequests = query({
  args: {
    propertyId: v.id("properties"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("partial"),
        v.literal("rejected"),
        v.literal("cancelled"),
      ),
    ),
    mineOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, "fnb.read", args.propertyId);
    const canInventory = await tryRequirePermission(ctx, "inventory.read", args.propertyId);

    let rows;
    if (args.status) {
      rows = await ctx.db
        .query("stockRequests")
        .withIndex("by_propertyId_status", (q) =>
          q.eq("propertyId", args.propertyId).eq("status", args.status!),
        )
        .order("desc")
        .take(100);
    } else {
      rows = await ctx.db
        .query("stockRequests")
        .withIndex("by_propertyId_requestedAt", (q) => q.eq("propertyId", args.propertyId))
        .order("desc")
        .take(100);
    }

    const scoped = args.mineOnly || !canInventory
      ? rows.filter((row) => row.requestedByUserId === auth.user._id)
      : rows;

    const data = await Promise.all(
      scoped.map(async (request) => {
        const loaded = await loadRequestWithLines(ctx, request._id);
        return loaded!;
      }),
    );
    return { success: true, data };
  },
});

export const getStockRequest = query({
  args: { requestId: v.id("stockRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return { success: false, data: null, message: "Stock request not found" };
    }
    const auth = await requirePermission(ctx, "fnb.read", request.propertyId);
    const canInventory = await tryRequirePermission(ctx, "inventory.read", request.propertyId);
    if (!canInventory && request.requestedByUserId !== auth.user._id) {
      return { success: false, data: null, message: "Not allowed to view this request" };
    }
    const data = await loadRequestWithLines(ctx, args.requestId);
    return { success: true, data };
  },
});

export const createStockRequest = mutation({
  args: {
    propertyId: v.id("properties"),
    barId: v.id("bars"),
    note: v.optional(v.string()),
    lines: v.array(
      v.object({
        beverageId: v.id("beverages"),
        qtyRequested: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, "fnb.create", args.propertyId);
    if (args.lines.length === 0) {
      return { success: false, message: "Add at least one beverage line" };
    }

    const bar = await ctx.db.get(args.barId);
    if (!bar || bar.propertyId !== args.propertyId || !bar.isActive) {
      return { success: false, message: "Bar does not exist or is inactive" };
    }

    const seen = new Set<string>();
    for (const line of args.lines) {
      if (line.qtyRequested <= 0) {
        return { success: false, message: "Each line quantity must be greater than 0" };
      }
      if (seen.has(line.beverageId)) {
        return { success: false, message: "Duplicate beverage on the same request" };
      }
      seen.add(line.beverageId);
      const beverage = await ctx.db.get(line.beverageId);
      if (!beverage || beverage.propertyId !== args.propertyId || !beverage.isActive) {
        return { success: false, message: "Beverage does not exist or is inactive" };
      }
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("stockRequests", {
      propertyId: args.propertyId,
      barId: args.barId,
      requestedByUserId: auth.user._id,
      status: "pending",
      note: args.note,
      requestedAt: now,
    });

    for (const line of args.lines) {
      await ctx.db.insert("stockRequestLines", {
        propertyId: args.propertyId,
        requestId,
        beverageId: line.beverageId,
        qtyRequested: line.qtyRequested,
        status: "pending",
      });
    }

    return { success: true, message: "Stock request submitted", id: requestId };
  },
});

export const cancelStockRequest = mutation({
  args: { requestId: v.id("stockRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return { success: false, message: "Stock request not found" };
    }
    const auth = await requirePermission(ctx, "fnb.update", request.propertyId);
    if (request.requestedByUserId !== auth.user._id) {
      return { success: false, message: "You can only cancel your own requests" };
    }
    if (request.status !== "pending") {
      return { success: false, message: "Only pending requests can be cancelled" };
    }
    await ctx.db.patch(args.requestId, {
      status: "cancelled",
      reviewedAt: Date.now(),
      reviewedByUserId: auth.user._id,
    });
    const lines = await ctx.db
      .query("stockRequestLines")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .collect();
    for (const line of lines) {
      if (line.status === "pending") {
        await ctx.db.patch(line._id, { status: "rejected" });
      }
    }
    return { success: true, message: "Stock request cancelled" };
  },
});

export const approveStockRequestLine = mutation({
  args: {
    lineId: v.id("stockRequestLines"),
    qtyApproved: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const line = await ctx.db.get(args.lineId);
    if (!line) {
      return { success: false, message: "Request line not found" };
    }
    const request = await ctx.db.get(line.requestId);
    if (!request) {
      return { success: false, message: "Stock request not found" };
    }
    const auth = await requirePermission(ctx, "inventory.update", request.propertyId);
    if (request.status === "cancelled" || request.status === "rejected") {
      return { success: false, message: "This request is closed" };
    }
    if (line.status !== "pending") {
      return { success: false, message: "Line is already processed" };
    }

    const qty = args.qtyApproved ?? line.qtyRequested;
    if (qty <= 0 || qty > line.qtyRequested) {
      return { success: false, message: "Approved qty must be between 1 and requested qty" };
    }

    const beverage = await ctx.db.get(line.beverageId);
    if (!beverage || beverage.propertyId !== request.propertyId) {
      return { success: false, message: "Beverage does not exist" };
    }

    const issued = await issueStockToUser(ctx, {
      propertyId: request.propertyId,
      beverageId: line.beverageId,
      barId: request.barId,
      userId: request.requestedByUserId,
      qty,
      notes: request.note ? `Stock request: ${request.note}` : "Approved stock request",
      stockRequestLineId: line._id,
      unitPrice: beverage.unitPrice,
      unitCost: await resolveBeverageUnitCost(ctx, beverage),
    });
    if (issued.success === false) {
      return { success: false, message: issued.message };
    }

    await ctx.db.patch(line._id, {
      status: "approved",
      qtyApproved: qty,
    });
    await refreshRequestStatus(ctx, request._id, auth.user._id);
    return { success: true, message: "Line approved and stock issued", transactionId: issued.transactionId };
  },
});

export const rejectStockRequest = mutation({
  args: {
    requestId: v.id("stockRequests"),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return { success: false, message: "Stock request not found" };
    }
    const auth = await requirePermission(ctx, "inventory.update", request.propertyId);
    if (request.status !== "pending" && request.status !== "partial") {
      return { success: false, message: "Only open requests can be rejected" };
    }

    const lines = await ctx.db
      .query("stockRequestLines")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .collect();
    for (const line of lines) {
      if (line.status === "pending") {
        await ctx.db.patch(line._id, { status: "rejected" });
      }
    }
    await ctx.db.patch(args.requestId, {
      status: "rejected",
      rejectionReason: args.rejectionReason,
      reviewedAt: Date.now(),
      reviewedByUserId: auth.user._id,
    });
    return { success: true, message: "Stock request rejected" };
  },
});

export const rejectStockRequestLine = mutation({
  args: {
    lineId: v.id("stockRequestLines"),
  },
  handler: async (ctx, args) => {
    const line = await ctx.db.get(args.lineId);
    if (!line) {
      return { success: false, message: "Request line not found" };
    }
    const request = await ctx.db.get(line.requestId);
    if (!request) {
      return { success: false, message: "Stock request not found" };
    }
    const auth = await requirePermission(ctx, "inventory.update", request.propertyId);
    if (line.status !== "pending") {
      return { success: false, message: "Line is already processed" };
    }
    await ctx.db.patch(line._id, { status: "rejected" });
    await refreshRequestStatus(ctx, request._id, auth.user._id);
    return { success: true, message: "Line rejected" };
  },
});
