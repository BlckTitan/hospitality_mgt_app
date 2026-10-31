import { MutationCtx } from '../_generated/server';
import { Id } from '../_generated/dataModel';
import { weightedAverageCost } from './inventoryStock';

export const RESTAURANT_STOCK_TYPES = ['receive', 'usage', 'adjustment', 'waste'] as const;

export type RestaurantStockType = (typeof RESTAURANT_STOCK_TYPES)[number];

export async function applyRestaurantStockChange(
  ctx: MutationCtx,
  args: {
    itemId: Id<'restaurantInventoryItems'>;
    transactionType: RestaurantStockType;
    quantity: number;
    unitCost?: number;
    reason?: string;
    referenceType?: string;
    referenceId?: string;
    performedByUserId?: Id<'users'>;
    transactionDate?: number;
  },
): Promise<{ success: true } | { success: false; message: string }> {
  const item = await ctx.db.get(args.itemId);
  if (!item) {
    return { success: false, message: 'Restaurant inventory item does not exist' };
  }
  if (!Number.isFinite(args.quantity) || args.quantity === 0) {
    return { success: false, message: 'Quantity must be a non-zero number' };
  }

  let delta = 0;
  let storedQuantity = args.quantity;
  if (args.transactionType === 'receive') {
    delta = Math.abs(args.quantity);
    storedQuantity = delta;
  } else if (args.transactionType === 'usage' || args.transactionType === 'waste') {
    delta = -Math.abs(args.quantity);
    storedQuantity = delta;
  } else {
    delta = args.quantity;
    storedQuantity = args.quantity;
  }

  const now = args.transactionDate ?? Date.now();
  const nextQty = item.currentQuantity + delta;
  const patch: {
    currentQuantity: number;
    updatedAt: number;
    unitCost?: number;
  } = {
    currentQuantity: nextQty,
    updatedAt: now,
  };

  if (
    args.transactionType === 'receive' &&
    args.unitCost !== undefined &&
    Number.isFinite(args.unitCost) &&
    args.unitCost >= 0
  ) {
    patch.unitCost = weightedAverageCost(
      item.currentQuantity,
      item.unitCost ?? 0,
      delta,
      args.unitCost,
    );
  }

  await ctx.db.patch(item._id, patch);
  await ctx.db.insert('restaurantInventoryTransactions', {
    propertyId: item.propertyId,
    restaurantInventoryItemId: item._id,
    transactionType: args.transactionType,
    quantity: storedQuantity,
    ...(args.unitCost !== undefined ? { unitCost: args.unitCost } : {}),
    ...(args.referenceType ? { referenceType: args.referenceType } : {}),
    ...(args.referenceId ? { referenceId: args.referenceId } : {}),
    ...(args.reason?.trim() ? { reason: args.reason.trim() } : {}),
    ...(args.performedByUserId ? { performedByUserId: args.performedByUserId } : {}),
    transactionDate: now,
    createdAt: Date.now(),
  });

  return { success: true };
}
