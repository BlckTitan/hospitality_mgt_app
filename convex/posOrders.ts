import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';
import { requirePermission } from './lib/rbac';
import { lastFinalizedClosingStock, propertyDateKey, remainingSellableQty } from './lib/barStock';
import { requireFnBSaleShift } from './lib/dutyContext';
import { rowMatchesSearch } from './lib/rowSearch';
import { activeSearchTerm, docsById, offsetPage } from './lib/listSearch';

const orderTypeValidator = v.union(
  v.literal('bar'),
  v.literal('room_service'),
  v.literal('dine_in'),
  v.literal('takeout'),
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
  v.literal('bank_transfer'),
  v.literal('room_charge'),
  v.literal('other'),
);

const tenderLineValidator = v.object({
  paymentMethod: tenderMethodValidator,
  amount: v.number(),
});

type DbCtx = MutationCtx | QueryCtx;

function checkSuffixFromId(orderId: Id<'orders'>): string {
  return String(orderId).slice(-6);
}

function normalizeCheckQuery(raw: string): string {
  let value = raw.trim();
  if (value.startsWith('#')) value = value.slice(1).trim();
  const prefixed = value.match(/^check\s+(.+)$/i);
  if (prefixed) value = prefixed[1].trim();
  return value;
}

async function recomputeOrderTotals(ctx: MutationCtx, orderId: Id<'orders'>) {
  const lines = await ctx.db
    .query('orderLines')
    .withIndex('by_orderId', (q) => q.eq('orderId', orderId))
    .collect();
  const subtotal = lines
    .filter((line) => line.status === 'active')
    .reduce((sum, line) => sum + line.lineTotal, 0);
  const order = await ctx.db.get(orderId);
  if (!order) return;
  const amountPaid = order.amountPaid;
  const balanceDue = Math.max(0, subtotal - amountPaid);
  await ctx.db.patch(orderId, {
    subtotal,
    totalAmount: subtotal,
    balanceDue,
  });
}

async function loadOrderOrThrow(ctx: DbCtx, orderId: Id<'orders'>) {
  const order = await ctx.db.get(orderId);
  if (!order) throw new Error('Order not found');
  return order;
}

async function linesForOrder(ctx: DbCtx, orderId: Id<'orders'>) {
  return await ctx.db
    .query('orderLines')
    .withIndex('by_orderId', (q) => q.eq('orderId', orderId))
    .collect();
}

async function enrichOrder(ctx: DbCtx, order: Doc<'orders'>) {
  const [lines, bar, reservation, employee, server] = await Promise.all([
    linesForOrder(ctx, order._id),
    order.barId ? ctx.db.get(order.barId) : null,
    order.reservationId ? ctx.db.get(order.reservationId) : null,
    order.employeeId ? ctx.db.get(order.employeeId) : null,
    ctx.db.get(order.serverUserId),
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
    bar,
    reservation,
    roomLabel,
    guestName,
    waiterName: employee
      ? `${employee.firstName} ${employee.lastName}`.trim()
      : (server?.name ?? null),
    barName: bar?.name ?? null,
  };
}

async function assertCanWorkOrder(
  ctx: MutationCtx,
  order: Doc<'orders'>,
  userId: Id<'users'>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!order.shiftId && !order.barId) return { ok: true };
  const duty = await requireFnBSaleShift(ctx, {
    userId,
    propertyId: order.propertyId,
  });
  if (duty.ok === false) return duty;
  if (order.barId && order.barId !== duty.barId) {
    return { ok: false, message: 'This check belongs to another bar.' };
  }
  if (order.shiftId && order.serverUserId !== userId) {
    return { ok: false, message: 'This check belongs to another waiter.' };
  }
  return { ok: true };
}

async function insertOrderPayment(
  ctx: MutationCtx,
  args: {
    propertyId: Id<'properties'>;
    orderId: Id<'orders'>;
    amount: number;
    paymentMethod: string;
    createdBy: Id<'users'>;
    now: number;
  },
) {
  return await ctx.db.insert('payments', {
    propertyId: args.propertyId,
    paymentType: 'order',
    referenceType: 'Order',
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
    orderId: Id<'orders'>;
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
    paymentType: 'fnb_room_charge',
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

function formatStockQty(quantity: number): string {
  const rounded = Math.round(quantity * 1000) / 1000;
  return String(rounded);
}

function latestStockLog(
  logs: Array<Doc<'userStockLogs'>>,
  propertyId: Id<'properties'>,
): Doc<'userStockLogs'> | null {
  let latest: Doc<'userStockLogs'> | null = null;
  for (const log of logs) {
    if (log.propertyId !== propertyId) continue;
    if (!latest || log.lastUpdatedAt > latest.lastUpdatedAt) latest = log;
  }
  return latest;
}

async function availableQtyForUserBarBeverage(
  ctx: DbCtx,
  args: {
    propertyId: Id<'properties'>;
    userId: Id<'users'>;
    barId: Id<'bars'>;
    beverageId: Id<'beverages'>;
    logDate: string;
    pouredByBarBeverage: Map<string, number>;
    todayLog?: Doc<'userStockLogs'> | null;
  },
): Promise<{ availableQty: number; closed: boolean }> {
  const pouredQuantity = args.pouredByBarBeverage.get(`${args.barId}:${args.beverageId}`) ?? 0;
  const log =
    args.todayLog !== undefined
      ? args.todayLog
      : latestStockLog(
          await ctx.db
            .query('userStockLogs')
            .withIndex('by_userId_barId_bev_date', (q) =>
              q
                .eq('userId', args.userId)
                .eq('barId', args.barId)
                .eq('beverageId', args.beverageId)
                .eq('logDate', args.logDate),
            )
            .collect(),
          args.propertyId,
        );

  if (log) {
    return {
      closed: log.isFinalized,
      availableQty: remainingSellableQty({
        totalStock: log.totalStock,
        wasteQuantity: log.wasteQuantity,
        compQuantity: log.compQuantity,
        pouredQuantity,
        isFinalized: log.isFinalized,
      }),
    };
  }

  const openingStock = await lastFinalizedClosingStock(ctx, {
    userId: args.userId,
    barId: args.barId,
    beverageId: args.beverageId,
    beforeDate: args.logDate,
  });
  return {
    closed: false,
    availableQty: remainingSellableQty({
      totalStock: openingStock,
      pouredQuantity,
    }),
  };
}

function stockRefusalMessage(name: string, availableQty: number, closed: boolean): string {
  if (closed) return `${name} is closed for today.`;
  if (availableQty <= 0) return `${name} is out of stock.`;
  return `Only ${formatStockQty(availableQty)} ${name} left in your stock.`;
}

export const listSellableBeverages = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'fnb.read', args.propertyId);
    const duty = await requireFnBSaleShift(ctx, {
      userId: auth.user._id,
      propertyId: args.propertyId,
    });
    if (duty.ok === false) {
      return { success: true, data: [], message: duty.message };
    }

    const logDate = await propertyDateKey(ctx, args.propertyId);
    const [beverages, todayLogs, poured] = await Promise.all([
      ctx.db
        .query('beverages')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect(),
      ctx.db
        .query('userStockLogs')
        .withIndex('by_userId_barId_date', (q) =>
          q.eq('userId', auth.user._id).eq('barId', duty.barId).eq('logDate', logDate),
        )
        .collect(),
      posPouredQtyByBarBeverage(ctx, {
        propertyId: args.propertyId,
        userId: auth.user._id,
        dateKey: logDate,
      }),
    ]);

    const logByBeverage = new Map<Id<'beverages'>, Doc<'userStockLogs'>>();
    for (const log of todayLogs) {
      const current = logByBeverage.get(log.beverageId);
      if (log.propertyId !== args.propertyId) continue;
      if (!current || log.lastUpdatedAt > current.lastUpdatedAt) {
        logByBeverage.set(log.beverageId, log);
      }
    }

    const data = (
      await Promise.all(
        beverages.map(async (beverage) => {
          if (!beverage.isActive) return null;
          const stock = await availableQtyForUserBarBeverage(ctx, {
            propertyId: args.propertyId,
            userId: auth.user._id,
            barId: duty.barId,
            beverageId: beverage._id,
            logDate,
            pouredByBarBeverage: poured,
            todayLog: logByBeverage.get(beverage._id) ?? null,
          });
          if (stock.availableQty <= 0) return null;
          return {
            _id: beverage._id,
            name: beverage.name,
            category: beverage.category,
            unitPrice: beverage.unitPrice,
            unitOfMeasure: beverage.unitOfMeasure,
            imageUrl: beverage.imageUrl,
            availableQty: stock.availableQty,
          };
        }),
      )
    ).flatMap((row) => (row ? [row] : []));
    data.sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, data, message: null };
  },
});

export const listBarsForPos = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
    const bars = await ctx.db
      .query('bars')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    return {
      success: true,
      data: bars.filter((b) => b.isActive).sort((a, b) => a.name.localeCompare(b.name)),
    };
  },
});

export const listStayReservationsForPos = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
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

async function collectPosOrders(
  ctx: QueryCtx,
  args: {
    propertyId: Id<'properties'>;
    status?: Doc<'orders'>['status'];
    orderType?: Doc<'orders'>['orderType'];
    dateKey?: string;
  },
) {
  const propertyId = args.propertyId;
  if (args.status && args.orderType) {
    return await ctx.db
      .query('orders')
      .withIndex('by_propertyId_and_status_and_orderType', (q) =>
        q.eq('propertyId', propertyId).eq('status', args.status!).eq('orderType', args.orderType!),
      )
      .collect();
  }
  if (args.status && args.dateKey) {
    return await ctx.db
      .query('orders')
      .withIndex('by_propertyId_status_openedAtDateKey', (q) =>
        q
          .eq('propertyId', propertyId)
          .eq('status', args.status!)
          .eq('openedAtDateKey', args.dateKey!),
      )
      .collect();
  }
  if (args.status) {
    return await ctx.db
      .query('orders')
      .withIndex('by_propertyId_status', (q) => q.eq('propertyId', propertyId).eq('status', args.status!))
      .collect();
  }
  if (args.orderType) {
    return await ctx.db
      .query('orders')
      .withIndex('by_propertyId_and_orderType', (q) =>
        q.eq('propertyId', propertyId).eq('orderType', args.orderType!),
      )
      .collect();
  }
  if (args.dateKey) {
    return await ctx.db
      .query('orders')
      .withIndex('by_propertyId_openedAtDateKey', (q) =>
        q.eq('propertyId', propertyId).eq('openedAtDateKey', args.dateKey!),
      )
      .collect();
  }
  return await ctx.db
    .query('orders')
    .withIndex('by_propertyId', (q) => q.eq('propertyId', propertyId))
    .collect();
}

async function posOrdersMatching(ctx: QueryCtx, orders: Doc<'orders'>[], term: string) {
  const [staffById, userById, barById, reservationById] = await Promise.all([
    docsById(orders.map((order) => order.employeeId), (id) => ctx.db.get(id)),
    docsById(orders.map((order) => order.serverUserId), (id) => ctx.db.get(id)),
    docsById(orders.map((order) => order.barId), (id) => ctx.db.get(id)),
    docsById(orders.map((order) => order.reservationId), (id) => ctx.db.get(id)),
  ]);
  const reservations = [...reservationById.values()];
  const [roomById, guestById] = await Promise.all([
    docsById(reservations.map((reservation) => reservation.roomId), (id) => ctx.db.get(id)),
    docsById(reservations.map((reservation) => reservation.guestId), (id) => ctx.db.get(id)),
  ]);

  return orders.filter((order) => {
    const employee = order.employeeId ? staffById.get(order.employeeId) : undefined;
    const server = userById.get(order.serverUserId);
    const bar = order.barId ? barById.get(order.barId) : undefined;
    const reservation = order.reservationId ? reservationById.get(order.reservationId) : undefined;
    const room = reservation ? roomById.get(reservation.roomId) : undefined;
    const guest = reservation ? guestById.get(reservation.guestId) : undefined;
    const waiter = employee
      ? `${employee.firstName} ${employee.lastName}`.trim()
      : server?.name;
    return rowMatchesSearch(
      {
        check: order.checkSuffix ?? String(order._id).slice(-6),
        code: String(order._id),
        status: order.status,
        orderType: order.orderType,
        opened: order.openedAtDateKey,
        guestLabel: order.guestLabel,
        waiter,
        bar: bar?.name,
        room: room ? `Room ${room.roomNumber}` : undefined,
        guest: guest ? `${guest.firstName} ${guest.lastName}`.trim() : undefined,
        total: order.totalAmount,
        due: order.balanceDue,
      },
      term,
    );
  });
}

export const listOrders = query({
  args: {
    propertyId: v.id('properties'),
    status: v.optional(orderStatusValidator),
    orderType: v.optional(orderTypeValidator),
    dateKey: v.optional(v.string()),
    searchTerm: v.optional(v.string()),
    cursor: v.optional(v.union(v.string(), v.null())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
    const limit = Math.min(Math.max(args.limit ?? 10, 1), 50);
    const term = activeSearchTerm(args.searchTerm);
    if (term) {
      const orders = await collectPosOrders(ctx, args);
      const matched = await posOrdersMatching(ctx, orders, term);
      matched.sort((a, b) => b.openedAt - a.openedAt || b._creationTime - a._creationTime);
      const sliced = offsetPage(matched, args.cursor, limit);
      const page = await Promise.all(sliced.page.map((order) => enrichOrder(ctx, order)));
      return { success: true as const, ...sliced, page };
    }

    const paginationOpts = { numItems: limit, cursor: args.cursor ?? null };
    const propertyId = args.propertyId;

    const pageResult =
      args.status && args.orderType
        ? await ctx.db
            .query('orders')
            .withIndex('by_propertyId_and_status_and_orderType', (q) =>
              q.eq('propertyId', propertyId).eq('status', args.status!).eq('orderType', args.orderType!),
            )
            .order('desc')
            .paginate(paginationOpts)
        : args.status && args.dateKey
          ? await ctx.db
              .query('orders')
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
                .query('orders')
                .withIndex('by_propertyId_status', (q) =>
                  q.eq('propertyId', propertyId).eq('status', args.status!),
                )
                .order('desc')
                .paginate(paginationOpts)
            : args.orderType
              ? await ctx.db
                  .query('orders')
                  .withIndex('by_propertyId_and_orderType', (q) =>
                    q.eq('propertyId', propertyId).eq('orderType', args.orderType!),
                  )
                  .order('desc')
                  .paginate(paginationOpts)
              : args.dateKey
                ? await ctx.db
                    .query('orders')
                    .withIndex('by_propertyId_openedAtDateKey', (q) =>
                      q.eq('propertyId', propertyId).eq('openedAtDateKey', args.dateKey!),
                    )
                    .order('desc')
                    .paginate(paginationOpts)
                : await ctx.db
                    .query('orders')
                    .withIndex('by_propertyId', (q) => q.eq('propertyId', propertyId))
                    .order('desc')
                    .paginate(paginationOpts);

    const page = await Promise.all(pageResult.page.map((order) => enrichOrder(ctx, order)));
    return {
      success: true,
      page,
      isDone: pageResult.isDone,
      continueCursor: pageResult.continueCursor,
    };
  },
});

export const listOpenOrders = query({
  args: {
    propertyId: v.id('properties'),
    orderType: v.optional(orderTypeValidator),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
    const open = await ctx.db
      .query('orders')
      .withIndex('by_propertyId_status', (q) =>
        q.eq('propertyId', args.propertyId).eq('status', 'open'),
      )
      .collect();
    const tabs = await ctx.db
      .query('orders')
      .withIndex('by_propertyId_status', (q) =>
        q.eq('propertyId', args.propertyId).eq('status', 'open_tab'),
      )
      .collect();
    let rows = [...open, ...tabs];
    if (args.orderType) {
      rows = rows.filter((row) => row.orderType === args.orderType);
    }
    rows.sort((a, b) => b.openedAt - a.openedAt);
    const data = await Promise.all(rows.map((order) => enrichOrder(ctx, order)));
    return { success: true, data };
  },
});

export const getOrder = query({
  args: { orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return { success: false, data: null, message: 'Order not found' };
    }
    await requirePermission(ctx, 'fnb.read', order.propertyId);
    const data = await enrichOrder(ctx, order);
    const [server, payments] = await Promise.all([
      ctx.db.get(order.serverUserId),
      ctx.db
        .query('payments')
        .withIndex('by_reference', (q) =>
          q.eq('referenceType', 'Order').eq('referenceId', args.orderId),
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

export const findOrdersByCheckId = query({
  args: {
    propertyId: v.id('properties'),
    checkId: v.string(),
    status: v.optional(orderStatusValidator),
    orderType: v.optional(orderTypeValidator),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
    const checkId = normalizeCheckQuery(args.checkId);
    if (checkId.length < 6) {
      return {
        success: true,
        data: [],
        message: 'Enter the last 6 characters of the check ID, or the full ID',
      };
    }

    const exactId = ctx.db.normalizeId('orders', checkId);
    if (exactId) {
      const order = await ctx.db.get(exactId);
      if (!order || order.propertyId !== args.propertyId) {
        return { success: true, data: [], message: 'No check found for that ID' };
      }
      if (args.status && order.status !== args.status) {
        return { success: true, data: [], message: 'No check found for that ID with the current filters' };
      }
      if (args.orderType && order.orderType !== args.orderType) {
        return { success: true, data: [], message: 'No check found for that ID with the current filters' };
      }
      return { success: true, data: [await enrichOrder(ctx, order)], message: null };
    }

    if (checkId.length !== 6) {
      return { success: true, data: [], message: 'No check found for that ID' };
    }

    const indexed = await ctx.db
      .query('orders')
      .withIndex('by_propertyId_and_checkSuffix', (q) =>
        q.eq('propertyId', args.propertyId).eq('checkSuffix', checkId),
      )
      .take(50);
    let rows = indexed;
    if (args.status) rows = rows.filter((row) => row.status === args.status);
    if (args.orderType) rows = rows.filter((row) => row.orderType === args.orderType);
    rows.sort((a, b) => b.openedAt - a.openedAt);
    const data = await Promise.all(rows.map((order) => enrichOrder(ctx, order)));
    return {
      success: true,
      data,
      message:
        data.length === 0
          ? indexed.length > 0
            ? 'No check found for that ID with the current filters'
            : 'No check found for that ID'
          : null,
    };
  },
});

export const backfillOrderCheckSuffix = mutation({
  args: {
    propertyId: v.id('properties'),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
    const page = await ctx.db
      .query('orders')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .paginate({ numItems: 100, cursor: args.cursor ?? null });
    let patched = 0;
    for (const row of page.page) {
      const checkSuffix = checkSuffixFromId(row._id);
      if (row.checkSuffix !== checkSuffix) {
        await ctx.db.patch(row._id, { checkSuffix });
        patched += 1;
      }
    }
    return { done: page.isDone, continueCursor: page.continueCursor, patched };
  },
});

export async function sumPosGuestRevenue(
  ctx: QueryCtx | MutationCtx,
  args: {
    propertyId: Id<'properties'>;
    startDateKey: string;
    endDateKeyExclusive: string;
  },
): Promise<{ totalRevenue: number; totalQtySold: number; orderCount: number }> {
  const orders = await ctx.db
    .query('orders')
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
      if (line.status === 'active') totalQtySold += line.quantity;
    }
  }

  return { totalRevenue, totalQtySold, orderCount };
}

/** Active check quantities for one server on one property date, keyed by `barId:beverageId`. */
export async function posPouredQtyByBarBeverage(
  ctx: DbCtx,
  args: {
    propertyId: Id<'properties'>;
    userId: Id<'users'>;
    dateKey: string;
  },
): Promise<Map<string, number>> {
  const orders = await ctx.db
    .query('orders')
    .withIndex('by_propertyId_openedAtDateKey', (q) =>
      q.eq('propertyId', args.propertyId).eq('openedAtDateKey', args.dateKey),
    )
    .collect();

  const totals = new Map<string, number>();
  for (const order of orders) {
    if (order.serverUserId !== args.userId || order.status === 'voided' || !order.barId) continue;
    const lines = await linesForOrder(ctx, order._id);
    for (const line of lines) {
      if (line.status !== 'active') continue;
      const key = `${order.barId}:${line.beverageId}`;
      totals.set(key, (totals.get(key) ?? 0) + line.quantity);
    }
  }
  return totals;
}

function nextDateKey(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export const getPosRevenueForDateKey = query({
  args: {
    propertyId: v.id('properties'),
    dateKey: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
    const data = await sumPosGuestRevenue(ctx, {
      propertyId: args.propertyId,
      startDateKey: args.dateKey,
      endDateKeyExclusive: nextDateKey(args.dateKey),
    });
    return { success: true, data };
  },
});

export const createOrder = mutation({
  args: {
    propertyId: v.id('properties'),
    orderType: orderTypeValidator,
    reservationId: v.optional(v.id('reservations')),
    guestLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'fnb.create', args.propertyId);
    if (args.orderType === 'room_service' && !args.reservationId) {
      return { success: false, message: 'Room service requires a reservation' };
    }
    const duty = await requireFnBSaleShift(ctx, {
      userId: auth.user._id,
      propertyId: args.propertyId,
    });
    if (duty.ok === false) return { success: false, message: duty.message };
    if (args.reservationId) {
      const reservation = await ctx.db.get(args.reservationId);
      if (!reservation || reservation.propertyId !== args.propertyId) {
        return { success: false, message: 'Invalid reservation' };
      }
    }

    const now = Date.now();
    const openedAtDateKey = await propertyDateKey(ctx, args.propertyId, now);
    const orderId = await ctx.db.insert('orders', {
      propertyId: args.propertyId,
      barId: duty.barId,
      shiftId: duty.shift._id,
      employeeId: duty.staff._id,
      reservationId: args.reservationId,
      orderType: args.orderType,
      status: 'open',
      serverUserId: duty.shift.userId ?? auth.user._id,
      guestLabel: args.guestLabel?.trim() || undefined,
      subtotal: 0,
      totalAmount: 0,
      amountPaid: 0,
      balanceDue: 0,
      openedAt: now,
      openedAtDateKey,
    });
    await ctx.db.patch(orderId, { checkSuffix: checkSuffixFromId(orderId) });
    return { success: true, data: { orderId }, message: 'Order opened' };
  },
});

export const setRoomContext = mutation({
  args: {
    orderId: v.id('orders'),
    reservationId: v.id('reservations'),
  },
  handler: async (ctx, args) => {
    const order = await loadOrderOrThrow(ctx, args.orderId);
    const auth = await requirePermission(ctx, 'fnb.update', order.propertyId);
    const access = await assertCanWorkOrder(ctx, order, auth.user._id);
    if (access.ok === false) return { success: false, message: access.message };
    if (order.status !== 'open' && order.status !== 'open_tab') {
      return { success: false, message: 'Only open checks can change room context' };
    }
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation || reservation.propertyId !== order.propertyId) {
      return { success: false, message: 'Invalid reservation' };
    }
    if (reservation.status !== 'checked-in' && reservation.status !== 'confirmed') {
      return { success: false, message: 'Reservation must be confirmed or checked in' };
    }
    await ctx.db.patch(args.orderId, {
      reservationId: args.reservationId,
      orderType: 'room_service',
    });
    return { success: true, message: 'Room linked' };
  },
});

export const addLine = mutation({
  args: {
    orderId: v.id('orders'),
    beverageId: v.id('beverages'),
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const order = await loadOrderOrThrow(ctx, args.orderId);
    const auth = await requirePermission(ctx, 'fnb.update', order.propertyId);
    const access = await assertCanWorkOrder(ctx, order, auth.user._id);
    if (access.ok === false) return { success: false, message: access.message };
    if (order.status !== 'open') {
      return { success: false, message: 'Can only add lines to an open check' };
    }
    const qty = args.quantity ?? 1;
    if (!Number.isFinite(qty) || qty <= 0) {
      return { success: false, message: 'Quantity must be greater than 0' };
    }
    const beverage = await ctx.db.get(args.beverageId);
    if (!beverage || beverage.propertyId !== order.propertyId || !beverage.isActive) {
      return { success: false, message: 'Beverage not available' };
    }
    const duty = await requireFnBSaleShift(ctx, {
      userId: auth.user._id,
      propertyId: order.propertyId,
    });
    if (duty.ok === false) return { success: false, message: duty.message };
    const barId = order.barId ?? duty.barId;
    if (order.barId && order.barId !== duty.barId) {
      return { success: false, message: 'This check belongs to another bar.' };
    }
    const logDate = await propertyDateKey(ctx, order.propertyId);
    if (order.openedAtDateKey !== logDate) {
      return {
        success: false,
        message: "This check is from another day. Open a new check to sell from today's stock.",
      };
    }
    const poured = await posPouredQtyByBarBeverage(ctx, {
      propertyId: order.propertyId,
      userId: auth.user._id,
      dateKey: logDate,
    });
    const stock = await availableQtyForUserBarBeverage(ctx, {
      propertyId: order.propertyId,
      userId: auth.user._id,
      barId,
      beverageId: args.beverageId,
      logDate,
      pouredByBarBeverage: poured,
    });
    if (stock.availableQty + 1e-9 < qty) {
      return {
        success: false,
        message: stockRefusalMessage(beverage.name, stock.availableQty, stock.closed),
      };
    }

    const existing = (await linesForOrder(ctx, args.orderId)).find(
      (line) =>
        line.status === 'active' &&
        line.beverageId === args.beverageId &&
        line.unitPriceSnapshot === beverage.unitPrice,
    );
    if (existing) {
      const quantity = existing.quantity + qty;
      const lineTotal = quantity * existing.unitPriceSnapshot;
      await ctx.db.patch(existing._id, { quantity, lineTotal });
    } else {
      await ctx.db.insert('orderLines', {
        propertyId: order.propertyId,
        orderId: args.orderId,
        beverageId: args.beverageId,
        nameSnapshot: beverage.name,
        unitPriceSnapshot: beverage.unitPrice,
        quantity: qty,
        lineTotal: qty * beverage.unitPrice,
        status: 'active',
        createdAt: Date.now(),
      });
    }
    await recomputeOrderTotals(ctx, args.orderId);
    return { success: true, message: 'Line added' };
  },
});

export const voidLine = mutation({
  args: { orderLineId: v.id('orderLines') },
  handler: async (ctx, args) => {
    const line = await ctx.db.get(args.orderLineId);
    if (!line) return { success: false, message: 'Line not found' };
    const order = await loadOrderOrThrow(ctx, line.orderId);
    const auth = await requirePermission(ctx, 'fnb.update', order.propertyId);
    const access = await assertCanWorkOrder(ctx, order, auth.user._id);
    if (access.ok === false) return { success: false, message: access.message };
    if (order.status !== 'open') {
      return { success: false, message: 'Can only void lines on an open check' };
    }
    if (line.status === 'voided') {
      return { success: false, message: 'Line already voided' };
    }
    await ctx.db.patch(args.orderLineId, { status: 'voided' });
    await recomputeOrderTotals(ctx, line.orderId);
    return { success: true, message: 'Line voided' };
  },
});

export const voidOrder = mutation({
  args: { orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const order = await loadOrderOrThrow(ctx, args.orderId);
    const auth = await requirePermission(ctx, 'fnb.update', order.propertyId);
    const access = await assertCanWorkOrder(ctx, order, auth.user._id);
    if (access.ok === false) return { success: false, message: access.message };
    if (order.status !== 'open') {
      return { success: false, message: 'Only unpaid open checks can be voided' };
    }
    if (order.amountPaid > 0) {
      return { success: false, message: 'Cannot void a check with payments; settle or pay down first' };
    }
    const lines = await linesForOrder(ctx, args.orderId);
    for (const line of lines) {
      if (line.status === 'active') {
        await ctx.db.patch(line._id, { status: 'voided' });
      }
    }
    await ctx.db.patch(args.orderId, {
      status: 'voided',
      subtotal: 0,
      totalAmount: 0,
      balanceDue: 0,
    });
    return { success: true, message: 'Order voided' };
  },
});

async function settleWithTenders(
  ctx: MutationCtx,
  args: {
    orderId: Id<'orders'>;
    tenders: Array<{ paymentMethod: string; amount: number }>;
    allowOpenTabOnly?: boolean;
  },
) {
  const order = await loadOrderOrThrow(ctx, args.orderId);
  const auth = await requirePermission(ctx, 'fnb.update', order.propertyId);
  const access = await assertCanWorkOrder(ctx, order, auth.user._id);
  if (access.ok === false) return { success: false as const, message: access.message };
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
        orderId: args.orderId,
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

  await ctx.db.patch(args.orderId, {
    amountPaid,
    balanceDue,
    status,
    ...(status === 'settled' ? { settledAt: now } : {}),
  });

  return {
    success: true as const,
    message: status === 'settled' ? 'Order settled' : 'Partial payment recorded — open tab',
    data: { status, amountPaid, balanceDue },
  };
}

export const settleOrder = mutation({
  args: {
    orderId: v.id('orders'),
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
    orderId: v.id('orders'),
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
  args: { orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const order = await loadOrderOrThrow(ctx, args.orderId);
    const auth = await requirePermission(ctx, 'fnb.update', order.propertyId);
    const access = await assertCanWorkOrder(ctx, order, auth.user._id);
    if (access.ok === false) return { success: false, message: access.message };
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
