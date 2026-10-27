import { MutationCtx, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { maybeCreateRestockTask } from "./taskAssignment";

type DbCtx = MutationCtx | QueryCtx;

export const TRANSACTION_TYPES = [
  "purchase",
  "usage",
  "adjustment",
  "waste",
  "transfer",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export type PostResult =
  | { success: true; id?: Id<"inventoryTransactions">; shortageQty?: number }
  | { success: false; message: string };

const DEFAULT_STORE_NAME = "Main storeroom";
const BAR_STORE_NAME = "Bar store";

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

export async function listStockLocations(ctx: DbCtx, propertyId: Id<"properties">) {
  return await ctx.db
    .query("stockLocations")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
    .collect();
}

export async function ensureStockLocation(
  ctx: MutationCtx,
  args: {
    propertyId: Id<"properties">;
    name: string;
    kind: "storeroom" | "outlet" | "floor" | "bar";
    isDefault?: boolean;
  },
) {
  const name = args.name.trim();
  const rows = await listStockLocations(ctx, args.propertyId);
  const match = rows.find((row) => row.name.toLowerCase() === name.toLowerCase());
  if (match) return match;
  const now = Date.now();
  const wantsDefault = args.isDefault === true && !rows.some((row) => row.isDefault);
  const id = await ctx.db.insert("stockLocations", {
    propertyId: args.propertyId,
    name,
    kind: args.kind,
    isDefault: wantsDefault,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Failed to create stock location");
  return created;
}

export async function ensureDefaultLocation(ctx: MutationCtx, propertyId: Id<"properties">) {
  const rows = await listStockLocations(ctx, propertyId);
  const existing = rows.find((row) => row.isDefault && row.isActive);
  if (existing) return existing;
  return await ensureStockLocation(ctx, {
    propertyId,
    name: DEFAULT_STORE_NAME,
    kind: "storeroom",
    isDefault: true,
  });
}

export async function ensureBarLocation(ctx: MutationCtx, propertyId: Id<"properties">) {
  const rows = await listStockLocations(ctx, propertyId);
  const existing = rows.find((row) => row.kind === "bar" && row.isActive);
  if (existing) return existing;
  return await ensureStockLocation(ctx, {
    propertyId,
    name: BAR_STORE_NAME,
    kind: "bar",
    isDefault: false,
  });
}

async function balancesForItem(ctx: DbCtx, inventoryItemId: Id<"inventoryItems">) {
  return await ctx.db
    .query("inventoryBalances")
    .withIndex("by_inventoryItemId", (q) => q.eq("inventoryItemId", inventoryItemId))
    .collect();
}

export async function ensureItemBalances(ctx: MutationCtx, item: Doc<"inventoryItems">) {
  const existing = await balancesForItem(ctx, item._id);
  if (existing.length > 0) return existing;
  const location = item.location?.trim()
    ? await ensureStockLocation(ctx, {
        propertyId: item.propertyId,
        name: item.location.trim(),
        kind: "storeroom",
      })
    : await ensureDefaultLocation(ctx, item.propertyId);
  const id = await ctx.db.insert("inventoryBalances", {
    propertyId: item.propertyId,
    inventoryItemId: item._id,
    locationId: location._id,
    quantity: item.currentQuantity,
    updatedAt: Date.now(),
  });
  const created = await ctx.db.get(id);
  return created ? [created] : [];
}

export async function balanceAt(
  ctx: MutationCtx,
  item: Doc<"inventoryItems">,
  locationId: Id<"stockLocations">,
) {
  await ensureItemBalances(ctx, item);
  const row = await ctx.db
    .query("inventoryBalances")
    .withIndex("by_item_location", (q) =>
      q.eq("inventoryItemId", item._id).eq("locationId", locationId),
    )
    .unique();
  if (row) return row;
  const id = await ctx.db.insert("inventoryBalances", {
    propertyId: item.propertyId,
    inventoryItemId: item._id,
    locationId,
    quantity: 0,
    updatedAt: Date.now(),
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Failed to create inventory balance");
  return created;
}

async function primaryLocationId(ctx: MutationCtx, item: Doc<"inventoryItems">) {
  const balances = await ensureItemBalances(ctx, item);
  const withStock = [...balances].sort((a, b) => b.quantity - a.quantity)[0];
  if (withStock) return withStock.locationId;
  const fallback = await ensureDefaultLocation(ctx, item.propertyId);
  return fallback._id;
}

export async function syncItemQuantity(ctx: MutationCtx, inventoryItemId: Id<"inventoryItems">) {
  const rows = await balancesForItem(ctx, inventoryItemId);
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);
  await ctx.db.patch(inventoryItemId, {
    currentQuantity: total,
    updatedAt: Date.now(),
  });
  const item = await ctx.db.get(inventoryItemId);
  if (item) await maybeCreateRestockTask(ctx, item);
  return total;
}

async function mirrorBarLocationToStore(
  ctx: MutationCtx,
  inventoryItemId: Id<"inventoryItems">,
  locationId: Id<"stockLocations">,
) {
  const location = await ctx.db.get(locationId);
  if (!location || location.kind !== "bar") return;
  const balance = await ctx.db
    .query("inventoryBalances")
    .withIndex("by_item_location", (q) =>
      q.eq("inventoryItemId", inventoryItemId).eq("locationId", locationId),
    )
    .unique();
  if (!balance) return;
  const beverages = await ctx.db
    .query("beverages")
    .withIndex("by_inventoryItemId", (q) => q.eq("inventoryItemId", inventoryItemId))
    .collect();
  const now = Date.now();
  for (const beverage of beverages) {
    if (beverage.propertyId !== location.propertyId) continue;
    const store = await ctx.db
      .query("storeInventories")
      .withIndex("by_propertyId_beverageId", (q) =>
        q.eq("propertyId", beverage.propertyId).eq("beverageId", beverage._id),
      )
      .unique();
    if (!store) {
      await ctx.db.insert("storeInventories", {
        propertyId: beverage.propertyId,
        beverageId: beverage._id,
        qtyInStore: balance.quantity,
        reorderThreshold: beverage.reorderLevel || 0,
        lastUpdated: now,
      });
    } else if (store.qtyInStore !== balance.quantity) {
      await ctx.db.patch(store._id, {
        qtyInStore: balance.quantity,
        lastUpdated: now,
      });
    }
  }
}

export async function mirrorStoreQtyToBarLocation(
  ctx: MutationCtx,
  beverage: Doc<"beverages">,
  newQty: number,
) {
  if (!beverage.inventoryItemId) return;
  const item = await ctx.db.get(beverage.inventoryItemId);
  if (!item || item.propertyId !== beverage.propertyId) return;
  const bar = await ensureBarLocation(ctx, beverage.propertyId);
  const balance = await balanceAt(ctx, item, bar._id);
  if (balance.quantity === newQty) return;
  const delta = newQty - balance.quantity;
  const now = Date.now();
  await ctx.db.patch(balance._id, { quantity: newQty, updatedAt: now });
  await ctx.db.insert("inventoryTransactions", {
    inventoryItemId: item._id,
    transactionType: "adjustment",
    quantity: delta,
    locationId: bar._id,
    referenceType: "StoreInventory",
    referenceId: beverage._id,
    reason: "Bar store quantity synced to the catalog",
    transactionDate: now,
    createdAt: now,
  });
  await syncItemQuantity(ctx, item._id);
}

async function setBalanceQuantity(
  ctx: MutationCtx,
  balanceId: Id<"inventoryBalances">,
  quantity: number,
) {
  await ctx.db.patch(balanceId, { quantity, updatedAt: Date.now() });
}

export async function reverseTransactionEffect(
  ctx: MutationCtx,
  transaction: Doc<"inventoryTransactions">,
): Promise<PostResult> {
  const item = await ctx.db.get(transaction.inventoryItemId);
  if (!item) return { success: false, message: "Inventory item does not exist" };
  return await applyTransactionEffect(ctx, item, transaction, -1);
}

export async function reapplyTransactionEffect(
  ctx: MutationCtx,
  transaction: Doc<"inventoryTransactions">,
): Promise<PostResult> {
  const item = await ctx.db.get(transaction.inventoryItemId);
  if (!item) return { success: false, message: "Inventory item does not exist" };
  const applied = await applyTransactionEffect(ctx, item, transaction, 1);
  if (applied.success === false) return applied;
  if (transaction.transactionType === "purchase" && transaction.unitCost !== undefined && transaction.unitCost !== null) {
    const fresh = await ctx.db.get(item._id);
    const added = Math.abs(transaction.quantity);
    const beforeQty = (fresh?.currentQuantity ?? item.currentQuantity) - added;
    await ctx.db.patch(item._id, {
      unitCost: weightedAverageCost(beforeQty, item.unitCost ?? 0, added, transaction.unitCost),
      lastCostUpdate: Date.now(),
    });
  }
  return applied;
}

async function applyTransactionEffect(
  ctx: MutationCtx,
  item: Doc<"inventoryItems">,
  transaction: Doc<"inventoryTransactions">,
  direction: 1 | -1,
): Promise<PostResult> {
  if (transaction.transactionType === "transfer" && transaction.fromLocationId && transaction.toLocationId) {
    const moved = Math.abs(transaction.quantity);
    const fromDelta = direction === 1 ? -moved : moved;
    const toDelta = -fromDelta;
    const fromBalance = await balanceAt(ctx, item, transaction.fromLocationId);
    const toBalance = await balanceAt(ctx, item, transaction.toLocationId);
    if (fromBalance.quantity + fromDelta < -1e-9 || toBalance.quantity + toDelta < -1e-9) {
      return { success: false, message: "That change would make a location quantity negative" };
    }
    await setBalanceQuantity(ctx, fromBalance._id, fromBalance.quantity + fromDelta);
    await setBalanceQuantity(ctx, toBalance._id, toBalance.quantity + toDelta);
    await syncItemQuantity(ctx, item._id);
    await mirrorBarLocationToStore(ctx, item._id, transaction.fromLocationId);
    await mirrorBarLocationToStore(ctx, item._id, transaction.toLocationId);
    return { success: true };
  }

  const change = quantityChangeForType(transaction.transactionType, transaction.quantity) * direction;
  const locationId = transaction.locationId ?? await primaryLocationId(ctx, item);
  const balance = await balanceAt(ctx, item, locationId);
  const next = balance.quantity + change;
  if (next < -1e-9 && transaction.transactionType !== "adjustment") {
    return { success: false, message: "That change would make on-hand negative" };
  }
  await setBalanceQuantity(ctx, balance._id, next);
  await syncItemQuantity(ctx, item._id);
  await mirrorBarLocationToStore(ctx, item._id, locationId);
  return { success: true };
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
    recordShortage?: boolean;
    locationId?: Id<"stockLocations">;
    fromLocationId?: Id<"stockLocations">;
    toLocationId?: Id<"stockLocations">;
  },
): Promise<PostResult> {
  const inventoryItem = await ctx.db.get(args.inventoryItemId);
  if (!inventoryItem) {
    return { success: false, message: "Inventory item does not exist" };
  }
  await ensureItemBalances(ctx, inventoryItem);

  if (args.transactionType === "transfer") {
    return await postTransfer(ctx, inventoryItem, args);
  }

  const locationId = args.locationId ?? await primaryLocationId(ctx, inventoryItem);
  const location = await ctx.db.get(locationId);
  if (!location || location.propertyId !== inventoryItem.propertyId) {
    return { success: false, message: "Stock location does not belong to this property" };
  }

  const quantityChange = quantityChangeForType(args.transactionType, args.quantity);
  const balance = await balanceAt(ctx, inventoryItem, locationId);
  let appliedChange = quantityChange;
  let storedQuantity = args.quantity;
  let shortageQty = 0;
  const allowNegative = args.allowNegative ?? args.transactionType === "adjustment";

  if (balance.quantity + quantityChange < -1e-9) {
    if (args.recordShortage && quantityChange < 0) {
      const needed = Math.abs(args.quantity);
      const filled = Math.min(Math.max(balance.quantity, 0), needed);
      shortageQty = needed - filled;
      const now = Date.now();
      await ctx.db.insert("inventoryShortages", {
        propertyId: inventoryItem.propertyId,
        inventoryItemId: inventoryItem._id,
        locationId,
        neededQty: needed,
        filledQty: filled,
        shortQty: shortageQty,
        referenceType: args.referenceType ?? "InventoryTransaction",
        referenceId: args.referenceId ?? inventoryItem._id,
        reason: args.reason,
        createdAt: now,
      });
      if (filled <= 0) {
        const item = await ctx.db.get(inventoryItem._id);
        if (item) await maybeCreateRestockTask(ctx, item);
        return { success: true, shortageQty };
      }
      appliedChange = -filled;
      storedQuantity = filled;
    } else if (!allowNegative) {
      return {
        success: false,
        message: `Insufficient inventory at ${location.name}. On hand: ${balance.quantity}, attempting to remove: ${Math.abs(quantityChange)}`,
      };
    }
  }

  const now = Date.now();
  const totalCost =
    args.unitCost !== undefined && args.unitCost !== null
      ? args.unitCost * Math.abs(storedQuantity)
      : undefined;

  const transactionId = await ctx.db.insert("inventoryTransactions", {
    inventoryItemId: args.inventoryItemId,
    transactionType: args.transactionType,
    quantity: storedQuantity,
    unitCost: args.unitCost,
    totalCost,
    referenceType: args.referenceType,
    referenceId: args.referenceId,
    reason: args.reason,
    performedBy: args.performedBy,
    transactionDate: args.transactionDate ?? now,
    locationId,
    createdAt: now,
  });

  await setBalanceQuantity(ctx, balance._id, balance.quantity + appliedChange);

  if (args.transactionType === "purchase" && args.unitCost !== undefined && args.unitCost !== null) {
    await ctx.db.patch(args.inventoryItemId, {
      unitCost: weightedAverageCost(
        inventoryItem.currentQuantity,
        inventoryItem.unitCost ?? 0,
        Math.abs(appliedChange),
        args.unitCost,
      ),
      lastCostUpdate: now,
    });
  }

  await syncItemQuantity(ctx, args.inventoryItemId);
  await mirrorBarLocationToStore(ctx, args.inventoryItemId, locationId);
  return { success: true, id: transactionId, shortageQty: shortageQty || undefined };
}

async function postTransfer(
  ctx: MutationCtx,
  item: Doc<"inventoryItems">,
  args: {
    inventoryItemId: Id<"inventoryItems">;
    quantity: number;
    unitCost?: number;
    referenceType?: string;
    referenceId?: string;
    reason?: string;
    performedBy?: Id<"staffs">;
    transactionDate?: number;
    fromLocationId?: Id<"stockLocations">;
    toLocationId?: Id<"stockLocations">;
  },
): Promise<PostResult> {
  if (!args.fromLocationId || !args.toLocationId) {
    return { success: false, message: "A transfer needs a source location and a destination location" };
  }
  if (args.fromLocationId === args.toLocationId) {
    return { success: false, message: "Choose two different locations" };
  }
  const moved = Math.abs(args.quantity);
  if (moved <= 0) {
    return { success: false, message: "Transfer quantity must be greater than 0" };
  }
  const from = await ctx.db.get(args.fromLocationId);
  const to = await ctx.db.get(args.toLocationId);
  if (!from || !to || from.propertyId !== item.propertyId || to.propertyId !== item.propertyId) {
    return { success: false, message: "Stock location does not belong to this property" };
  }
  const fromBalance = await balanceAt(ctx, item, args.fromLocationId);
  if (fromBalance.quantity + 1e-9 < moved) {
    return {
      success: false,
      message: `Not enough stock in ${from.name}. On hand there: ${fromBalance.quantity}. Receive a purchase order into the storeroom first, or count that location.`,
    };
  }
  const toBalance = await balanceAt(ctx, item, args.toLocationId);
  const now = Date.now();
  const transactionId = await ctx.db.insert("inventoryTransactions", {
    inventoryItemId: item._id,
    transactionType: "transfer",
    quantity: moved,
    unitCost: args.unitCost,
    referenceType: args.referenceType,
    referenceId: args.referenceId,
    reason: args.reason ?? `Transfer from ${from.name} to ${to.name}`,
    performedBy: args.performedBy,
    transactionDate: args.transactionDate ?? now,
    fromLocationId: args.fromLocationId,
    toLocationId: args.toLocationId,
    createdAt: now,
  });
  await setBalanceQuantity(ctx, fromBalance._id, fromBalance.quantity - moved);
  await setBalanceQuantity(ctx, toBalance._id, toBalance.quantity + moved);
  await syncItemQuantity(ctx, item._id);
  await mirrorBarLocationToStore(ctx, item._id, args.fromLocationId);
  await mirrorBarLocationToStore(ctx, item._id, args.toLocationId);
  return { success: true, id: transactionId };
}

export async function moveCatalogStockToBar(
  ctx: MutationCtx,
  args: {
    item: Doc<"inventoryItems">;
    quantity: number;
    reason?: string;
    transactionDate?: number;
  },
): Promise<PostResult> {
  const bar = await ensureBarLocation(ctx, args.item.propertyId);
  const balances = await ensureItemBalances(ctx, args.item);
  const candidates: Array<{ locationId: Id<"stockLocations">; quantity: number; isDefault: boolean; name: string }> = [];
  for (const balance of balances) {
    if (balance.locationId === bar._id) continue;
    const location = await ctx.db.get(balance.locationId);
    if (!location || location.kind === "bar") continue;
    candidates.push({
      locationId: balance.locationId,
      quantity: balance.quantity,
      isDefault: location.isDefault,
      name: location.name,
    });
  }
  candidates.sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return b.quantity - a.quantity;
  });
  const source = candidates.find((row) => row.quantity + 1e-9 >= args.quantity);
  const awayFromBar = candidates.reduce((sum, row) => sum + row.quantity, 0);
  if (!source) {
    return {
      success: false,
      message: `Not enough ${args.item.name} outside the bar (${awayFromBar} on hand). Receive a purchase order into the storeroom first.`,
    };
  }
  return await postInventoryTransaction(ctx, {
    inventoryItemId: args.item._id,
    transactionType: "transfer",
    quantity: args.quantity,
    fromLocationId: source.locationId,
    toLocationId: bar._id,
    reason: args.reason ?? `Moved from ${source.name} into the bar`,
    referenceType: "StoreReceive",
    transactionDate: args.transactionDate,
  });
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
