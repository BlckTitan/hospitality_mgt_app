import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { requirePermission } from './lib/rbac';
import { propertyDateKey } from './lib/barStock';
import { currentUsersStaff } from './lib/staffAccess';

type DbCtx = MutationCtx | QueryCtx;

async function expectedTendersForServerDay(
  ctx: DbCtx,
  args: {
    propertyId: Id<'properties'>;
    serverUserId: Id<'users'>;
    settlementDateKey: string;
  },
) {
  const orders = await ctx.db
    .query('orders')
    .withIndex('by_propertyId_openedAtDateKey', (q) =>
      q.eq('propertyId', args.propertyId).eq('openedAtDateKey', args.settlementDateKey),
    )
    .collect();
  const mine = orders.filter(
    (o) =>
      o.serverUserId === args.serverUserId &&
      (o.status === 'settled' || o.status === 'open_tab'),
  );

  let expectedCash = 0;
  let expectedCard = 0;
  let expectedRoomCharge = 0;
  let other = 0;

  for (const order of mine) {
    const payments = await ctx.db
      .query('payments')
      .withIndex('by_reference', (q) =>
        q.eq('referenceType', 'Order').eq('referenceId', order._id),
      )
      .collect();
    for (const payment of payments) {
      if (payment.status !== 'completed') continue;
      if (payment.paymentMethod === 'cash') expectedCash += payment.amount;
      else if (payment.paymentMethod === 'card') expectedCard += payment.amount;
      else if (payment.paymentMethod === 'room_charge') expectedRoomCharge += payment.amount;
      else other += payment.amount;
    }
  }

  return {
    expectedCash,
    expectedCard,
    expectedRoomCharge,
    other,
    orderCount: mine.length,
  };
}

export const listServersForCashUp = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
    const staffs = await ctx.db
      .query('staffs')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    const data = staffs
      .filter((s) => s.userId && (s.employmentStatus === 'active' || s.employmentStatus === 'employed'))
      .map((s) => ({
        employeeId: s._id,
        userId: s.userId!,
        name: `${s.firstName} ${s.lastName}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, data };
  },
});

export const previewCashSettlement = query({
  args: {
    propertyId: v.id('properties'),
    serverUserId: v.id('users'),
    settlementDateKey: v.optional(v.string()),
    barId: v.optional(v.id('bars')),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
    const dateKey =
      args.settlementDateKey ?? (await propertyDateKey(ctx, args.propertyId));
    const expected = await expectedTendersForServerDay(ctx, {
      propertyId: args.propertyId,
      serverUserId: args.serverUserId,
      settlementDateKey: dateKey,
    });
    const existing = await ctx.db
      .query('cashSettlements')
      .withIndex('by_propertyId_serverUserId_settlementDateKey', (q) =>
        q
          .eq('propertyId', args.propertyId)
          .eq('serverUserId', args.serverUserId)
          .eq('settlementDateKey', dateKey),
      )
      .collect();
    const posted = existing.find((row) => row.status === 'posted');
    return {
      success: true,
      data: {
        settlementDateKey: dateKey,
        ...expected,
        existingPosted: posted ?? null,
      },
    };
  },
});

export const listCashSettlements = query({
  args: {
    propertyId: v.id('properties'),
    settlementDateKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
    let rows = args.settlementDateKey
      ? await ctx.db
          .query('cashSettlements')
          .withIndex('by_propertyId_settlementDateKey', (q) =>
            q
              .eq('propertyId', args.propertyId)
              .eq('settlementDateKey', args.settlementDateKey!),
          )
          .collect()
      : await ctx.db
          .query('cashSettlements')
          .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
          .collect();
    rows = rows.filter((r) => r.status !== 'voided');
    rows.sort((a, b) => b.createdAt - a.createdAt);
    const data = await Promise.all(
      rows.slice(0, 100).map(async (row) => {
        const [user, staff, bar] = await Promise.all([
          ctx.db.get(row.serverUserId),
          row.employeeId ? ctx.db.get(row.employeeId) : null,
          row.barId ? ctx.db.get(row.barId) : null,
        ]);
        return {
          ...row,
          serverName: user?.name ?? user?.email ?? 'Server',
          staffName: staff ? `${staff.firstName} ${staff.lastName}` : null,
          barName: bar?.name ?? null,
        };
      }),
    );
    return { success: true, data };
  },
});

export const postCashSettlement = mutation({
  args: {
    propertyId: v.id('properties'),
    serverUserId: v.id('users'),
    countedCash: v.number(),
    settlementDateKey: v.optional(v.string()),
    barId: v.optional(v.id('bars')),
    notes: v.optional(v.string()),
    createLiabilityIfShortage: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'fnb.update', args.propertyId);
    if (!Number.isFinite(args.countedCash) || args.countedCash < 0) {
      return { success: false, message: 'Counted cash must be zero or greater' };
    }
    const dateKey =
      args.settlementDateKey ?? (await propertyDateKey(ctx, args.propertyId));

    const existing = await ctx.db
      .query('cashSettlements')
      .withIndex('by_propertyId_serverUserId_settlementDateKey', (q) =>
        q
          .eq('propertyId', args.propertyId)
          .eq('serverUserId', args.serverUserId)
          .eq('settlementDateKey', dateKey),
      )
      .collect();
    if (existing.some((row) => row.status === 'posted')) {
      return { success: false, message: 'A posted cash-up already exists for this server and day' };
    }

    const expected = await expectedTendersForServerDay(ctx, {
      propertyId: args.propertyId,
      serverUserId: args.serverUserId,
      settlementDateKey: dateKey,
    });
    const varianceCash = args.countedCash - expected.expectedCash;
    const staff = await currentUsersStaff(ctx, args.serverUserId);
    const employeeId =
      staff && (!staff.propertyId || staff.propertyId === args.propertyId)
        ? staff._id
        : undefined;

    const now = Date.now();
    const settlementId = await ctx.db.insert('cashSettlements', {
      propertyId: args.propertyId,
      barId: args.barId,
      serverUserId: args.serverUserId,
      employeeId,
      settlementDateKey: dateKey,
      expectedCash: expected.expectedCash,
      countedCash: args.countedCash,
      varianceCash,
      expectedCard: expected.expectedCard,
      expectedRoomCharge: expected.expectedRoomCharge,
      notes: args.notes?.trim() || undefined,
      status: 'posted',
      createdBy: auth.user._id,
      postedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    let liabilityId: Id<'staffLiabilities'> | undefined;
    const shouldCreateLiability = args.createLiabilityIfShortage !== false;
    if (shouldCreateLiability && varianceCash < -0.0001) {
      if (!employeeId) {
        return {
          success: true,
          message:
            'Cash-up posted with shortage, but no Staff record is linked to this user — create a liability manually',
          data: { settlementId, varianceCash, liabilityId: null },
        };
      }
      const shortage = Math.round((-varianceCash + Number.EPSILON) * 100) / 100;
      liabilityId = await ctx.db.insert('staffLiabilities', {
        propertyId: args.propertyId,
        employeeId,
        kind: 'cash_shortage',
        amount: shortage,
        remainingAmount: shortage,
        reason: `Cash shortage on ${dateKey} (expected ${expected.expectedCash}, counted ${args.countedCash})`,
        sourceType: 'cash_settlement',
        sourceId: settlementId,
        cashSettlementId: settlementId,
        status: 'pending',
        createdBy: auth.user._id,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(settlementId, { liabilityId, updatedAt: now });
    }

    return {
      success: true,
      message:
        varianceCash < 0
          ? liabilityId
            ? 'Cash-up posted; shortage liability created (pending approval)'
            : 'Cash-up posted with shortage'
          : varianceCash > 0
            ? 'Cash-up posted with overage (no staff liability)'
            : 'Cash-up posted — cash balanced',
      data: { settlementId, varianceCash, liabilityId: liabilityId ?? null },
    };
  },
});
