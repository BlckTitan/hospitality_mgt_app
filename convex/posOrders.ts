import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';
import { requirePermission } from './lib/rbac';
import { propertyDateKey } from './lib/barStock';

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
  const [lines, bar, reservation] = await Promise.all([
    linesForOrder(ctx, order._id),
    order.barId ? ctx.db.get(order.barId) : null,
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
    bar,
    reservation,
    roomLabel,
    guestName,
  };
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

export const listSellableBeverages = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
    const beverages = await ctx.db
      .query('beverages')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    return {
      success: true,
      data: beverages
        .filter((b) => b.isActive)
        .map((b) => ({
          _id: b._id,
          name: b.name,
          category: b.category,
          unitPrice: b.unitPrice,
          unitOfMeasure: b.unitOfMeasure,
          imageUrl: b.imageUrl,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
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

export const listOrders = query({
  args: {
    propertyId: v.id('properties'),
    status: v.optional(orderStatusValidator),
    orderType: v.optional(orderTypeValidator),
    dateKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
    let rows: Doc<'orders'>[];
    if (args.status && args.dateKey) {
      rows = await ctx.db
        .query('orders')
        .withIndex('by_propertyId_status_openedAtDateKey', (q) =>
          q
            .eq('propertyId', args.propertyId)
            .eq('status', args.status!)
            .eq('openedAtDateKey', args.dateKey!),
        )
        .collect();
    } else if (args.status) {
      rows = await ctx.db
        .query('orders')
        .withIndex('by_propertyId_status', (q) =>
          q.eq('propertyId', args.propertyId).eq('status', args.status!),
        )
        .collect();
    } else if (args.dateKey) {
      rows = await ctx.db
        .query('orders')
        .withIndex('by_propertyId_openedAtDateKey', (q) =>
          q.eq('propertyId', args.propertyId).eq('openedAtDateKey', args.dateKey!),
        )
        .collect();
    } else {
      rows = await ctx.db
        .query('orders')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();
    }
    if (args.orderType) {
      rows = rows.filter((row) => row.orderType === args.orderType);
    }
    rows.sort((a, b) => b.openedAt - a.openedAt);
    const data = await Promise.all(rows.slice(0, 200).map((order) => enrichOrder(ctx, order)));
    return { success: true, data };
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
    const payments = await ctx.db
      .query('payments')
      .withIndex('by_reference', (q) =>
        q.eq('referenceType', 'Order').eq('referenceId', args.orderId),
      )
      .collect();
    return { success: true, data: { ...data, payments } };
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
    barId: v.optional(v.id('bars')),
    reservationId: v.optional(v.id('reservations')),
    guestLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'fnb.create', args.propertyId);
    if (args.orderType === 'room_service' && !args.reservationId) {
      return { success: false, message: 'Room service requires a reservation' };
    }
    if (args.barId) {
      const bar = await ctx.db.get(args.barId);
      if (!bar || bar.propertyId !== args.propertyId || !bar.isActive) {
        return { success: false, message: 'Invalid bar' };
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
    const orderId = await ctx.db.insert('orders', {
      propertyId: args.propertyId,
      barId: args.barId,
      reservationId: args.reservationId,
      orderType: args.orderType,
      status: 'open',
      serverUserId: auth.user._id,
      guestLabel: args.guestLabel?.trim() || undefined,
      subtotal: 0,
      totalAmount: 0,
      amountPaid: 0,
      balanceDue: 0,
      openedAt: now,
      openedAtDateKey,
    });
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
    await requirePermission(ctx, 'fnb.update', order.propertyId);
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
    await requirePermission(ctx, 'fnb.update', order.propertyId);
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
    await requirePermission(ctx, 'fnb.update', order.propertyId);
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
    await requirePermission(ctx, 'fnb.update', order.propertyId);
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
    await requirePermission(ctx, 'fnb.update', order.propertyId);
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
