import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';
import { requirePermission } from './lib/rbac';
import { propertyDateKey } from './lib/barStock';
import { postInventoryTransaction } from './lib/inventoryStock';

const orderTypeValidator = v.union(
  v.literal('dine_in'),
  v.literal('takeout'),
  v.literal('room_service'),
);

const orderStatusValidator = v.union(
  v.literal('open'),
  v.literal('settled'),
  v.literal('voided'),
  v.literal('open_tab'),
);

const tenderMethodValidator = v.union(
  v.literal('cash'),
  v.literal('card'),
  v.literal('room_charge'),
  v.literal('other'),
);

const tenderLineValidator = v.object({
  paymentMethod: tenderMethodValidator,
  amount: v.number(),
});

const stationValidator = v.union(
  v.literal('kitchen'),
  v.literal('grill'),
  v.literal('other'),
);

const prepStatusValidator = v.union(
  v.literal('pending'),
  v.literal('preparing'),
  v.literal('ready'),
  v.literal('served'),
  v.literal('cancelled'),
);

const PREP_FLOW = ['pending', 'preparing', 'ready', 'served'] as const;

type DbCtx = MutationCtx | QueryCtx;

function checkSuffixFromId(orderId: Id<'restaurantOrders'>): string {
  return String(orderId).slice(-6);
}

async function recomputeOrderTotals(ctx: MutationCtx, orderId: Id<'restaurantOrders'>) {
  const lines = await ctx.db
    .query('restaurantOrderLines')
    .withIndex('by_orderId', (q) => q.eq('orderId', orderId))
    .collect();
  const subtotal = lines
    .filter((line) => line.lineStatus === 'active')
    .reduce((sum, line) => sum + line.lineTotal, 0);
  const order = await ctx.db.get(orderId);
  if (!order) return;
  const amountPaid = order.amountPaid;
  const balanceDue = Math.max(0, subtotal - amountPaid);
  await ctx.db.patch(orderId, {
    subtotal,
    taxAmount: order.taxAmount,
    totalAmount: subtotal,
    balanceDue,
  });
}

async function loadOrderOrThrow(ctx: DbCtx, orderId: Id<'restaurantOrders'>) {
  const order = await ctx.db.get(orderId);
  if (!order) throw new Error('Order not found');
  return order;
}

async function linesForOrder(ctx: DbCtx, orderId: Id<'restaurantOrders'>) {
  return await ctx.db
    .query('restaurantOrderLines')
    .withIndex('by_orderId', (q) => q.eq('orderId', orderId))
    .collect();
}

async function enrichOrder(ctx: DbCtx, order: Doc<'restaurantOrders'>) {
  const [lines, table, reservation] = await Promise.all([
    linesForOrder(ctx, order._id),
    order.tableId ? ctx.db.get(order.tableId) : null,
    order.reservationId ? ctx.db.get(order.reservationId) : null,
  ]);
  let roomLabel: string | null = null;
  let guestName: string | null = null;
  if (reservation) {
    const [room, guest] = await Promise.all([
      ctx.db.get(reservation.roomId),
      ctx.db.get(reservation.guestId),
    ]);
    roomLabel = room?.roomNumber ?? null;
    guestName = guest ? `${guest.firstName} ${guest.lastName}`.trim() : null;
  }
  return {
    ...order,
    lines,
    table,
    reservation,
    roomLabel,
    guestName,
  };
}

async function clearTableIfLinked(
  ctx: MutationCtx,
  tableId: Id<'restaurantTables'> | undefined,
  orderId: Id<'restaurantOrders'>,
) {
  if (!tableId) return;
  const table = await ctx.db.get(tableId);
  if (!table) return;
  if (table.currentOrderId && table.currentOrderId !== orderId) return;
  await ctx.db.patch(tableId, {
    status: 'available',
    currentOrderId: undefined,
    updatedAt: Date.now(),
  });
}

async function insertOrderPayment(
  ctx: MutationCtx,
  args: {
    propertyId: Id<'properties'>;
    orderId: Id<'restaurantOrders'>;
    amount: number;
    paymentMethod: string;
    createdBy: Id<'users'>;
    now: number;
  },
) {
  return await ctx.db.insert('payments', {
    propertyId: args.propertyId,
    paymentType: 'restaurant_order',
    referenceType: 'RestaurantOrder',
    referenceId: args.orderId,
    amount: args.amount,
    paymentMethod: args.paymentMethod,
    status: 'completed',
    paidAt: args.now,
    createdBy: args.createdBy,
    createdAt: args.now,
  });
}

async function applyRoomChargeToReservation(
  ctx: MutationCtx,
  args: {
    propertyId: Id<'properties'>;
    reservationId: Id<'reservations'>;
    amount: number;
    createdBy: Id<'users'>;
    now: number;
  },
) {
  const reservation = await ctx.db.get(args.reservationId);
  if (!reservation || reservation.propertyId !== args.propertyId) {
    return { success: false as const, message: 'Reservation not found for this property' };
  }
  if (reservation.status !== 'checked-in' && reservation.status !== 'confirmed') {
    return {
      success: false as const,
      message: 'Room charge requires a confirmed or checked-in reservation',
    };
  }

  await ctx.db.insert('payments', {
    propertyId: args.propertyId,
    paymentType: 'restaurant_room_charge',
    referenceType: 'Reservation',
    referenceId: args.reservationId,
    amount: args.amount,
    paymentMethod: 'room_charge',
    status: 'completed',
    paidAt: args.now,
    createdBy: args.createdBy,
    createdAt: args.now,
  });

  const nextDeposit = (reservation.depositAmount ?? 0) + args.amount;
  await ctx.db.patch(args.reservationId, {
    depositAmount: nextDeposit,
    updatedAt: args.now,
  });

  return { success: true as const };
}

/**
 * Deduct inventory for a settled restaurant order via recipes.
 * Skips if inventoryDeductedAt is already set.
 * Per active line: qty * recipeLine.qty * (1+waste/100) / servings.
 */
export async function deductInventoryForOrder(
  ctx: MutationCtx,
  orderId: Id<'restaurantOrders'>,
): Promise<{ success: true } | { success: false; message: string }> {
  const order = await ctx.db.get(orderId);
  if (!order) {
    return { success: false, message: 'Order not found' };
  }
  if (order.inventoryDeductedAt) {
    return { success: true };
  }

  const lines = await linesForOrder(ctx, orderId);
  const now = Date.now();

  for (const line of lines) {
    if (line.lineStatus !== 'active') continue;

    const recipe = await ctx.db
      .query('recipes')
      .withIndex('by_menuItemId', (q) => q.eq('menuItemId', line.menuItemId))
      .first();
    if (!recipe) continue;

    const servings = recipe.servings > 0 ? recipe.servings : 1;
    const recipeLines = await ctx.db
      .query('recipeLines')
      .withIndex('by_recipeId', (q) => q.eq('recipeId', recipe._id))
      .collect();

    for (const recipeLine of recipeLines) {
      const waste = recipeLine.wastePercent ?? 0;
      const deductQty =
        (recipeLine.quantity * line.quantity * (1 + waste / 100)) / servings;
      if (deductQty <= 0) continue;

      const inventoryItem = await ctx.db.get(recipeLine.inventoryItemId);
      const posted = await postInventoryTransaction(ctx, {
        inventoryItemId: recipeLine.inventoryItemId,
        transactionType: 'usage',
        quantity: deductQty,
        unitCost: inventoryItem?.unitCost,
        referenceType: 'RestaurantOrderLine',
        referenceId: line._id,
        reason: `Restaurant order ${checkSuffixFromId(orderId)}: ${line.nameSnapshot}`,
        allowNegative: true,
        transactionDate: now,
      });
      if (posted.success === false) {
        return { success: false, message: posted.message };
      }
    }
  }

  await ctx.db.patch(orderId, { inventoryDeductedAt: now });
  return { success: true };
}

export async function sumRestaurantGuestRevenue(
  ctx: QueryCtx | MutationCtx,
  args: {
    propertyId: Id<'properties'>;
    startDateKey: string;
    endDateKeyExclusive: string;
  },
): Promise<{ totalRevenue: number; totalQtySold: number; orderCount: number }> {
  const orders = await ctx.db
    .query('restaurantOrders')
    .withIndex('by_propertyId_openedAtDateKey', (q) =>
      q
        .eq('propertyId', args.propertyId)
        .gte('openedAtDateKey', args.startDateKey)
        .lt('openedAtDateKey', args.endDateKeyExclusive),
    )
    .collect();

  let totalRevenue = 0;
  let totalQtySold = 0;
  let orderCount = 0;

  for (const order of orders) {
    if (order.status === 'settled') {
      totalRevenue += order.totalAmount;
      orderCount += 1;
    } else if (order.status === 'open_tab') {
      totalRevenue += order.amountPaid;
      if (order.amountPaid > 0) orderCount += 1;
    } else {
      continue;
    }
    const lines = await linesForOrder(ctx, order._id);
    for (const line of lines) {
      if (line.lineStatus === 'active') totalQtySold += line.quantity;
    }
  }

  return { totalRevenue, totalQtySold, orderCount };
}

export const listSellableMenuItems = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'restaurant.read', args.propertyId);
    const items = await ctx.db
      .query('restaurantMenuItems')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    return {
      success: true,
      data: items
        .filter((item) => item.isActive && item.isAvailable)
        .map((item) => ({
          _id: item._id,
          name: item.name,
          category: item.category,
          station: item.station,
          price: item.price,
          cost: item.cost,
          preparationTime: item.preparationTime,
          imageUrl: item.imageUrl,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  },
});

export const listTablesForPos = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'restaurant.read', args.propertyId);
    const tables = await ctx.db
      .query('restaurantTables')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    return {
      success: true,
      data: tables
        .filter((t) => t.isActive)
        .sort((a, b) =>
          a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true }),
        ),
    };
  },
});

export const listStayReservationsForRestaurant = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'restaurant.read', args.propertyId);
    const reservations = await ctx.db
      .query('reservations')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    const active = reservations.filter(
      (r) => r.status === 'checked-in' || r.status === 'confirmed',
    );
    const data = await Promise.all(
      active.map(async (r) => {
        const [room, guest] = await Promise.all([
          ctx.db.get(r.roomId),
          ctx.db.get(r.guestId),
        ]);
        return {
          _id: r._id,
          confirmationNumber: r.confirmationNumber,
          status: r.status,
          roomNumber: room?.roomNumber ?? '—',
          guestName: guest ? `${guest.firstName} ${guest.lastName}`.trim() : '—',
        };
      }),
    );
    data.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
    return { success: true, data };
  },
});

export const listOrders = query({
  args: {
    propertyId: v.id('properties'),
    status: v.optional(orderStatusValidator),
    orderType: v.optional(orderTypeValidator),
    dateKey: v.optional(v.string()),
    cursor: v.optional(v.union(v.string(), v.null())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'restaurant.read', args.propertyId);
    const limit = Math.min(Math.max(args.limit ?? 10, 1), 50);
    const paginationOpts = { numItems: limit, cursor: args.cursor ?? null };
    const propertyId = args.propertyId;

    const pageResult =
      args.status && args.dateKey
        ? await ctx.db
            .query('restaurantOrders')
            .withIndex('by_propertyId_status_openedAtDateKey', (q) =>
              q
                .eq('propertyId', propertyId)
                .eq('status', args.status!)
                .eq('openedAtDateKey', args.dateKey!),
            )
            .order('desc')
            .paginate(paginationOpts)
        : args.status
          ? await ctx.db
              .query('restaurantOrders')
              .withIndex('by_propertyId_status', (q) =>
                q.eq('propertyId', propertyId).eq('status', args.status!),
              )
              .order('desc')
              .paginate(paginationOpts)
          : args.dateKey
            ? await ctx.db
                .query('restaurantOrders')
                .withIndex('by_propertyId_openedAtDateKey', (q) =>
                  q.eq('propertyId', propertyId).eq('openedAtDateKey', args.dateKey!),
                )
                .order('desc')
                .paginate(paginationOpts)
            : await ctx.db
                .query('restaurantOrders')
                .withIndex('by_propertyId', (q) => q.eq('propertyId', propertyId))
                .order('desc')
                .paginate(paginationOpts);

    let page = await Promise.all(pageResult.page.map((order) => enrichOrder(ctx, order)));
    if (args.orderType) {
      page = page.filter((order) => order.orderType === args.orderType);
    }
    return {
      success: true,
      page,
      isDone: pageResult.isDone,
      continueCursor: pageResult.continueCursor,
    };
  },
});

export const getOrder = query({
  args: { orderId: v.id('restaurantOrders') },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return { success: false, data: null, message: 'Order not found' };
    }
    await requirePermission(ctx, 'restaurant.read', order.propertyId);
    const data = await enrichOrder(ctx, order);
    const [server, payments] = await Promise.all([
      ctx.db.get(order.serverUserId),
      ctx.db
        .query('payments')
        .withIndex('by_reference', (q) =>
          q.eq('referenceType', 'RestaurantOrder').eq('referenceId', args.orderId),
        )
        .collect(),
    ]);
    const paymentsWithNames = await Promise.all(
      payments.map(async (payment) => {
        const createdBy = await ctx.db.get(payment.createdBy);
        return { ...payment, createdByName: createdBy?.name ?? null };
      }),
    );
    paymentsWithNames.sort((a, b) => a.createdAt - b.createdAt);
    return {
      success: true,
      data: { ...data, payments: paymentsWithNames, serverName: server?.name ?? null },
    };
  },
});

export const listKitchenTickets = query({
  args: {
    propertyId: v.id('properties'),
    station: v.optional(stationValidator),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'restaurant.read', args.propertyId);

    const open = await ctx.db
      .query('restaurantOrders')
      .withIndex('by_propertyId_status', (q) =>
        q.eq('propertyId', args.propertyId).eq('status', 'open'),
      )
      .collect();
    const tabs = await ctx.db
      .query('restaurantOrders')
      .withIndex('by_propertyId_status', (q) =>
        q.eq('propertyId', args.propertyId).eq('status', 'open_tab'),
      )
      .collect();
    const activeOrders = [...open, ...tabs];
    const activeOrderIds = new Set(activeOrders.map((o) => o._id));

    const prepStatuses = ['pending', 'preparing', 'ready'] as const;
    const tickets: Array<
      Doc<'restaurantOrderLines'> & {
        order: Doc<'restaurantOrders'>;
        tableNumber: string | null;
      }
    > = [];

    for (const prepStatus of prepStatuses) {
      let rows =
        args.station !== undefined
          ? await ctx.db
              .query('restaurantOrderLines')
              .withIndex('by_propertyId_station_prepStatus', (q) =>
                q
                  .eq('propertyId', args.propertyId)
                  .eq('station', args.station!)
                  .eq('prepStatus', prepStatus),
              )
              .collect()
          : await ctx.db
              .query('restaurantOrderLines')
              .withIndex('by_propertyId_prepStatus', (q) =>
                q.eq('propertyId', args.propertyId).eq('prepStatus', prepStatus),
              )
              .collect();

      rows = rows.filter(
        (line) => line.lineStatus === 'active' && activeOrderIds.has(line.orderId),
      );

      for (const line of rows) {
        const order = activeOrders.find((o) => o._id === line.orderId)!;
        const table = order.tableId ? await ctx.db.get(order.tableId) : null;
        tickets.push({
          ...line,
          order,
          tableNumber: table?.tableNumber ?? null,
        });
      }
    }

    tickets.sort((a, b) => a.createdAt - b.createdAt);
    return { success: true, data: tickets };
  },
});

export const createOrder = mutation({
  args: {
    propertyId: v.id('properties'),
    orderType: orderTypeValidator,
    tableId: v.optional(v.id('restaurantTables')),
    reservationId: v.optional(v.id('reservations')),
    guestLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'restaurant.create', args.propertyId);

    if (args.orderType === 'room_service' && !args.reservationId) {
      return { success: false, message: 'Room service requires a reservation' };
    }
    if (args.orderType === 'dine_in' && !args.tableId) {
      return { success: false, message: 'Dine-in requires a table' };
    }

    if (args.tableId) {
      const table = await ctx.db.get(args.tableId);
      if (!table || table.propertyId !== args.propertyId || !table.isActive) {
        return { success: false, message: 'Invalid table' };
      }
      if (table.status === 'out-of-service') {
        return { success: false, message: 'Table is out of service' };
      }
      if (table.currentOrderId) {
        return { success: false, message: 'Table already has an open order' };
      }
    }

    if (args.reservationId) {
      const reservation = await ctx.db.get(args.reservationId);
      if (!reservation || reservation.propertyId !== args.propertyId) {
        return { success: false, message: 'Invalid reservation' };
      }
    }

    const now = Date.now();
    const openedAtDateKey = await propertyDateKey(ctx, args.propertyId, now);
    const orderId = await ctx.db.insert('restaurantOrders', {
      propertyId: args.propertyId,
      tableId: args.tableId,
      reservationId: args.reservationId,
      orderType: args.orderType,
      status: 'open',
      serverUserId: auth.user._id,
      guestLabel: args.guestLabel?.trim() || undefined,
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
      amountPaid: 0,
      balanceDue: 0,
      openedAt: now,
      openedAtDateKey,
    });
    await ctx.db.patch(orderId, { checkSuffix: checkSuffixFromId(orderId) });

    if (args.tableId) {
      await ctx.db.patch(args.tableId, {
        status: 'occupied',
        currentOrderId: orderId,
        updatedAt: now,
      });
    }

    return { success: true, data: { orderId }, message: 'Order opened' };
  },
});

export const addLine = mutation({
  args: {
    orderId: v.id('restaurantOrders'),
    menuItemId: v.id('restaurantMenuItems'),
    quantity: v.optional(v.number()),
    specialInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await loadOrderOrThrow(ctx, args.orderId);
    await requirePermission(ctx, 'restaurant.update', order.propertyId);
    if (order.status !== 'open') {
      return { success: false, message: 'Can only add lines to an open check' };
    }
    const qty = args.quantity ?? 1;
    if (!Number.isFinite(qty) || qty <= 0) {
      return { success: false, message: 'Quantity must be greater than 0' };
    }

    const menuItem = await ctx.db.get(args.menuItemId);
    if (
      !menuItem ||
      menuItem.propertyId !== order.propertyId ||
      !menuItem.isActive ||
      !menuItem.isAvailable
    ) {
      return { success: false, message: 'Menu item not available' };
    }

    const now = Date.now();
    const instructions = args.specialInstructions?.trim() || undefined;

    const existing = (await linesForOrder(ctx, args.orderId)).find(
      (line) =>
        line.lineStatus === 'active' &&
        line.menuItemId === args.menuItemId &&
        line.unitPriceSnapshot === menuItem.price &&
        line.prepStatus === 'pending' &&
        (line.specialInstructions ?? undefined) === instructions,
    );

    if (existing) {
      const quantity = existing.quantity + qty;
      await ctx.db.patch(existing._id, {
        quantity,
        lineTotal: quantity * existing.unitPriceSnapshot,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('restaurantOrderLines', {
        propertyId: order.propertyId,
        orderId: args.orderId,
        menuItemId: args.menuItemId,
        nameSnapshot: menuItem.name,
        unitPriceSnapshot: menuItem.price,
        quantity: qty,
        lineTotal: qty * menuItem.price,
        specialInstructions: instructions,
        lineStatus: 'active',
        prepStatus: 'pending',
        station: menuItem.station,
        createdAt: now,
        updatedAt: now,
      });
    }

    await recomputeOrderTotals(ctx, args.orderId);
    return { success: true, message: 'Line added' };
  },
});

export const voidLine = mutation({
  args: { orderLineId: v.id('restaurantOrderLines') },
  handler: async (ctx, args) => {
    const line = await ctx.db.get(args.orderLineId);
    if (!line) return { success: false, message: 'Line not found' };
    const order = await loadOrderOrThrow(ctx, line.orderId);
    await requirePermission(ctx, 'restaurant.update', order.propertyId);
    if (order.status !== 'open') {
      return { success: false, message: 'Can only void lines on an open check' };
    }
    if (line.lineStatus === 'voided') {
      return { success: false, message: 'Line already voided' };
    }
    await ctx.db.patch(args.orderLineId, {
      lineStatus: 'voided',
      prepStatus: 'cancelled',
      updatedAt: Date.now(),
    });
    await recomputeOrderTotals(ctx, line.orderId);
    return { success: true, message: 'Line voided' };
  },
});

export const bumpPrepStatus = mutation({
  args: {
    orderLineId: v.id('restaurantOrderLines'),
    prepStatus: v.optional(prepStatusValidator),
  },
  handler: async (ctx, args) => {
    const line = await ctx.db.get(args.orderLineId);
    if (!line) return { success: false, message: 'Line not found' };
    const order = await loadOrderOrThrow(ctx, line.orderId);
    await requirePermission(ctx, 'restaurant.update', order.propertyId);

    if (order.status !== 'open' && order.status !== 'open_tab') {
      return { success: false, message: 'Order is not open' };
    }
    if (line.lineStatus !== 'active') {
      return { success: false, message: 'Line is not active' };
    }
    if (line.prepStatus === 'cancelled' || line.prepStatus === 'served') {
      return { success: false, message: 'Line prep is already finished' };
    }

    let next: (typeof PREP_FLOW)[number] | 'cancelled';
    if (args.prepStatus) {
      next = args.prepStatus;
    } else {
      const idx = PREP_FLOW.indexOf(line.prepStatus as (typeof PREP_FLOW)[number]);
      if (idx < 0 || idx >= PREP_FLOW.length - 1) {
        return { success: false, message: 'Cannot advance prep status further' };
      }
      next = PREP_FLOW[idx + 1];
    }

    await ctx.db.patch(args.orderLineId, {
      prepStatus: next,
      updatedAt: Date.now(),
    });
    return { success: true, message: `Prep status set to ${next}`, data: { prepStatus: next } };
  },
});

export const voidOrder = mutation({
  args: { orderId: v.id('restaurantOrders') },
  handler: async (ctx, args) => {
    const order = await loadOrderOrThrow(ctx, args.orderId);
    await requirePermission(ctx, 'restaurant.update', order.propertyId);
    if (order.status !== 'open') {
      return { success: false, message: 'Only unpaid open checks can be voided' };
    }
    if (order.amountPaid > 0) {
      return { success: false, message: 'Cannot void a check with payments; settle or pay down first' };
    }
    const now = Date.now();
    const lines = await linesForOrder(ctx, args.orderId);
    for (const line of lines) {
      if (line.lineStatus === 'active') {
        await ctx.db.patch(line._id, {
          lineStatus: 'voided',
          prepStatus: 'cancelled',
          updatedAt: now,
        });
      }
    }
    await ctx.db.patch(args.orderId, {
      status: 'voided',
      subtotal: 0,
      totalAmount: 0,
      balanceDue: 0,
    });
    await clearTableIfLinked(ctx, order.tableId, args.orderId);
    return { success: true, message: 'Order voided' };
  },
});

async function settleWithTenders(
  ctx: MutationCtx,
  args: {
    orderId: Id<'restaurantOrders'>;
    tenders: Array<{ paymentMethod: string; amount: number }>;
    allowOpenTabOnly?: boolean;
  },
) {
  const order = await loadOrderOrThrow(ctx, args.orderId);
  const auth = await requirePermission(ctx, 'restaurant.update', order.propertyId);
  if (args.allowOpenTabOnly) {
    if (order.status !== 'open_tab') {
      return { success: false as const, message: 'Order is not an open tab' };
    }
  } else if (order.status !== 'open' && order.status !== 'open_tab') {
    return { success: false as const, message: 'Order is not open for settlement' };
  }

  await recomputeOrderTotals(ctx, args.orderId);
  const fresh = await loadOrderOrThrow(ctx, args.orderId);
  if (fresh.totalAmount <= 0) {
    return { success: false as const, message: 'Add at least one active line before settling' };
  }

  const tenders = args.tenders.filter((t) => Number.isFinite(t.amount) && t.amount > 0);
  if (tenders.length === 0) {
    return { success: false as const, message: 'Enter at least one tender amount' };
  }

  const tenderSum = tenders.reduce((sum, t) => sum + t.amount, 0);
  if (tenderSum > fresh.balanceDue + 0.0001) {
    return { success: false as const, message: 'Tender total exceeds balance due' };
  }

  for (const tender of tenders) {
    if (tender.paymentMethod === 'room_charge' && !fresh.reservationId) {
      return { success: false as const, message: 'Link a reservation before using room charge' };
    }
  }

  const now = Date.now();
  for (const tender of tenders) {
    await insertOrderPayment(ctx, {
      propertyId: fresh.propertyId,
      orderId: args.orderId,
      amount: tender.amount,
      paymentMethod: tender.paymentMethod,
      createdBy: auth.user._id,
      now,
    });
    if (tender.paymentMethod === 'room_charge' && fresh.reservationId) {
      const posted = await applyRoomChargeToReservation(ctx, {
        propertyId: fresh.propertyId,
        reservationId: fresh.reservationId,
        amount: tender.amount,
        createdBy: auth.user._id,
        now,
      });
      if (!posted.success) {
        return { success: false as const, message: posted.message };
      }
    }
  }

  const amountPaid = fresh.amountPaid + tenderSum;
  const balanceDue = Math.max(0, fresh.totalAmount - amountPaid);
  const status = balanceDue > 0.0001 ? 'open_tab' : 'settled';

  const patch: Record<string, unknown> = {
    amountPaid,
    balanceDue,
    status,
  };
  if (status === 'settled') {
    patch.settledAt = now;
    patch.completedAt = now;
  }

  await ctx.db.patch(args.orderId, patch);

  if (status === 'settled') {
    const deducted = await deductInventoryForOrder(ctx, args.orderId);
    if (deducted.success === false) {
      return { success: false as const, message: deducted.message };
    }
    await clearTableIfLinked(ctx, fresh.tableId, args.orderId);
  }

  return {
    success: true as const,
    message: status === 'settled' ? 'Order settled' : 'Partial payment recorded — open tab',
    data: { status, amountPaid, balanceDue },
  };
}

export const settleOrder = mutation({
  args: {
    orderId: v.id('restaurantOrders'),
    tenders: v.array(tenderLineValidator),
  },
  handler: async (ctx, args) => {
    return await settleWithTenders(ctx, {
      orderId: args.orderId,
      tenders: args.tenders,
    });
  },
});

export const payDownTab = mutation({
  args: {
    orderId: v.id('restaurantOrders'),
    tenders: v.array(tenderLineValidator),
  },
  handler: async (ctx, args) => {
    return await settleWithTenders(ctx, {
      orderId: args.orderId,
      tenders: args.tenders,
      allowOpenTabOnly: true,
    });
  },
});

export const markOpenTab = mutation({
  args: { orderId: v.id('restaurantOrders') },
  handler: async (ctx, args) => {
    const order = await loadOrderOrThrow(ctx, args.orderId);
    await requirePermission(ctx, 'restaurant.update', order.propertyId);
    if (order.status !== 'open') {
      return { success: false, message: 'Only an open check can become an open tab' };
    }
    await recomputeOrderTotals(ctx, args.orderId);
    const fresh = await loadOrderOrThrow(ctx, args.orderId);
    if (fresh.totalAmount <= 0) {
      return { success: false, message: 'Add lines before opening a tab' };
    }
    await ctx.db.patch(args.orderId, {
      status: 'open_tab',
      balanceDue: Math.max(0, fresh.totalAmount - fresh.amountPaid),
    });
    return { success: true, message: 'Check held as open tab' };
  },
});
