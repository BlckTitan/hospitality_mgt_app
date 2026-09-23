import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { maybeCreateRestockTask } from "./taskAssignment";

export const TRANSACTION_TYPES = [
  "purchase",
  "usage",
  "adjustment",
  "waste",
  "transfer",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export function quantityChangeForType(type: string, quantity: number): number {
  switch (type) {
    case "purchase":
      return Math.abs(quantity);
    case "usage":
    case "waste":
      return -Math.abs(quantity);
    case "adjustment":
    case "transfer":
      return quantity;
    default:
      return 0;
  }
}

export function weightedAverageCost(
  onHandQty: number,
  onHandCost: number,
  inboundQty: number,
  inboundCost: number,
): number {
  const safeOnHand = Math.max(onHandQty, 0);
  const safeInbound = Math.max(inboundQty, 0);
  const currentCost = Number.isFinite(onHandCost) && onHandCost >= 0 ? onHandCost : 0;
  const purchaseCost = Number.isFinite(inboundCost) && inboundCost >= 0 ? inboundCost : 0;
  const newQty = safeOnHand + safeInbound;
  if (safeInbound <= 0) return currentCost;
  if (newQty <= 0) return purchaseCost;
  return (safeOnHand * currentCost + safeInbound * purchaseCost) / newQty;
}

export function signedDisplayQuantity(type: string, quantity: number): number {
  switch (type) {
    case "usage":
    case "waste":
      return -Math.abs(quantity);
    default:
      return quantity;
  }
}

export async function postedPurchaseQtyForLine(
  ctx: MutationCtx,
  lineId: Id<"purchaseOrderLines">,
) {
  const rows = await ctx.db
    .query("inventoryTransactions")
    .withIndex("by_referenceType_referenceId", (q) =>
      q.eq("referenceType", "PurchaseOrderLine").eq("referenceId", lineId),
    )
    .collect();
  return rows
    .filter((row) => row.transactionType === "purchase")
    .reduce((sum, row) => sum + Math.abs(row.quantity), 0);
}

export async function postInventoryTransaction(
  ctx: MutationCtx,
  args: {
    inventoryItemId: Id<"inventoryItems">;
    transactionType: TransactionType;
    quantity: number;
    unitCost?: number;
    referenceType?: string;
    referenceId?: string;
    reason?: string;
    performedBy?: Id<"staffs">;
    transactionDate?: number;
    allowNegative?: boolean;
  },
): Promise<{ success: true; id: Id<"inventoryTransactions"> } | { success: false; message: string }> {
  const inventoryItem = await ctx.db.get(args.inventoryItemId);
  if (!inventoryItem) {
    return { success: false, message: "Inventory item does not exist" };
  }

  const quantityChange = quantityChangeForType(args.transactionType, args.quantity);
  const newQuantity = inventoryItem.currentQuantity + quantityChange;
  const allowNegative = args.allowNegative ?? args.transactionType === "adjustment";
  if (newQuantity < 0 && !allowNegative) {
    return {
      success: false,
      message: `Insufficient inventory. Current quantity: ${inventoryItem.currentQuantity}, attempting to remove: ${Math.abs(quantityChange)}`,
    };
  }

  const now = Date.now();
  const totalCost =
    args.unitCost !== undefined && args.unitCost !== null
      ? args.unitCost * Math.abs(args.quantity)
      : undefined;

  const transactionId = await ctx.db.insert("inventoryTransactions", {
    inventoryItemId: args.inventoryItemId,
    transactionType: args.transactionType,
    quantity: args.quantity,
    unitCost: args.unitCost,
    totalCost,
    referenceType: args.referenceType,
    referenceId: args.referenceId,
    reason: args.reason,
    performedBy: args.performedBy,
    transactionDate: args.transactionDate ?? now,
    createdAt: now,
  });

  const patch: {
    currentQuantity: number;
    updatedAt: number;
    unitCost?: number;
    lastCostUpdate?: number;
  } = {
    currentQuantity: newQuantity,
    updatedAt: now,
  };
  if (args.transactionType === "purchase" && args.unitCost !== undefined && args.unitCost !== null) {
    patch.unitCost = weightedAverageCost(
      inventoryItem.currentQuantity,
      inventoryItem.unitCost ?? 0,
      Math.abs(quantityChange),
      args.unitCost,
    );
    patch.lastCostUpdate = now;
  }
  await ctx.db.patch(args.inventoryItemId, patch);

  const updated = await ctx.db.get(args.inventoryItemId);
  if (updated) await maybeCreateRestockTask(ctx, updated);

  return { success: true, id: transactionId };
}

export async function refreshPurchaseOrderTotals(
  ctx: MutationCtx,
  purchaseOrderId: Id<"purchaseOrders">,
) {
  const order = await ctx.db.get(purchaseOrderId);
  if (!order) return;
  const lines = await ctx.db
    .query("purchaseOrderLines")
    .withIndex("by_purchaseOrderId", (q) => q.eq("purchaseOrderId", purchaseOrderId))
    .collect();
  const subtotal = lines.reduce((sum, line) => sum + line.totalPrice, 0);
  await ctx.db.patch(purchaseOrderId, {
    subtotal,
    totalAmount: subtotal + order.taxAmount + (order.shippingAmount ?? 0),
    updatedAt: Date.now(),
  });
}
