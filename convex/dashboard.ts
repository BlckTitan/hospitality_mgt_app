import { query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission, tryRequirePermission } from './lib/rbac';
import { localDayBounds, propertyTimeZone } from './lib/billingPeriods';
import { isOpenStatus, MODULE_PERMS } from './lib/taskAssignment';
import { EXPENSE_CATEGORIES } from './lib/postCashOutflow';

const DAY_MS = 86_400_000;
const COUNTED_RESERVATION_STATUSES = new Set(['confirmed', 'checked-in', 'checked-out']);

function periodNights(start: number, end: number): number {
  return Math.max(0, Math.round((end - start) / DAY_MS));
}

function overlapNights(
  stayStart: number,
  stayEnd: number,
  periodStart: number,
  periodEnd: number,
): number {
  const start = Math.max(stayStart, periodStart);
  const end = Math.min(stayEnd, periodEnd);
  if (end <= start) return 0;
  return Math.max(0, Math.round((end - start) / DAY_MS));
}

export const getRoomsSnapshot = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    const canRooms = await tryRequirePermission(ctx, 'rooms.read', args.propertyId);
    const canReservations = await tryRequirePermission(ctx, 'reservations.read', args.propertyId);
    if (!canRooms && !canReservations) {
      throw new Error('Unauthorized');
    }

    const property = await ctx.db.get(args.propertyId);
    const now = Date.now();
    const day = localDayBounds(now, propertyTimeZone(property));

    const roomCounts = {
      available: 0,
      occupied: 0,
      outOfOrder: 0,
      maintenance: 0,
      total: 0,
    };

    if (canRooms) {
      const rooms = await ctx.db
        .query('rooms')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();
      for (const room of rooms) {
        if (!room.isActive) continue;
        roomCounts.total += 1;
        if (room.status === 'available') roomCounts.available += 1;
        else if (room.status === 'occupied') roomCounts.occupied += 1;
        else if (room.status === 'out-of-order') roomCounts.outOfOrder += 1;
        else if (room.status === 'maintenance') roomCounts.maintenance += 1;
      }
    }

    const arrivals: Array<{
      _id: string;
      confirmationNumber: string;
      guestLastName: string;
      roomNumber: string;
      at: number;
    }> = [];
    const departures: Array<{
      _id: string;
      confirmationNumber: string;
      guestLastName: string;
      roomNumber: string;
      at: number;
    }> = [];
    let inHouse = 0;

    if (canReservations) {
      const arriving = await ctx.db
        .query('reservations')
        .withIndex('by_propertyId_checkInDate', (q) =>
          q.eq('propertyId', args.propertyId).gte('checkInDate', day.start).lte('checkInDate', day.end),
        )
        .collect();
      const departing = await ctx.db
        .query('reservations')
        .withIndex('by_propertyId_checkOutDate', (q) =>
          q.eq('propertyId', args.propertyId).gte('checkOutDate', day.start).lte('checkOutDate', day.end),
        )
        .collect();
      const checkedIn = await ctx.db
        .query('reservations')
        .withIndex('by_propertyId_status', (q) =>
          q.eq('propertyId', args.propertyId).eq('status', 'checked-in'),
        )
        .collect();

      inHouse = checkedIn.length;

      const decorate = async (
        reservation: (typeof arriving)[number],
        at: number,
      ) => {
        const guest = await ctx.db.get(reservation.guestId);
        const room = await ctx.db.get(reservation.roomId);
        return {
          _id: reservation._id,
          confirmationNumber: reservation.confirmationNumber,
          guestLastName: guest?.lastName ?? 'Guest',
          roomNumber: room?.roomNumber ?? '—',
          at,
        };
      };

      const arrivalCandidates = arriving
        .filter((row) => row.status === 'pending' || row.status === 'confirmed' || row.status === 'checked-in')
        .sort((a, b) => a.checkInDate - b.checkInDate);
      const departureCandidates = departing
        .filter((row) => row.status === 'confirmed' || row.status === 'checked-in' || row.status === 'checked-out')
        .sort((a, b) => a.checkOutDate - b.checkOutDate);

      for (const row of arrivalCandidates.slice(0, 5)) {
        arrivals.push(await decorate(row, row.checkInDate));
      }
      for (const row of departureCandidates.slice(0, 5)) {
        departures.push(await decorate(row, row.checkOutDate));
      }

      return {
        success: true,
        data: {
          roomCounts,
          inHouse,
          arrivalCount: arrivalCandidates.length,
          departureCount: departureCandidates.length,
          arrivals,
          departures,
        },
      };
    }

    return {
      success: true,
      data: {
        roomCounts,
        inHouse,
        arrivalCount: 0,
        departureCount: 0,
        arrivals,
        departures,
      },
    };
  },
});

export const getHousekeepingSnapshot = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    const auth = await tryRequirePermission(ctx, MODULE_PERMS.housekeeping.read, args.propertyId);
    if (!auth) {
      throw new Error('Unauthorized');
    }

    const pending = await ctx.db
      .query('housekeepingTasks')
      .withIndex('by_propertyId_status', (q) =>
        q.eq('propertyId', args.propertyId).eq('status', 'pending'),
      )
      .collect();
    const inProgress = await ctx.db
      .query('housekeepingTasks')
      .withIndex('by_propertyId_status', (q) =>
        q.eq('propertyId', args.propertyId).eq('status', 'in-progress'),
      )
      .collect();
    const tasks = [...pending, ...inProgress];

    const assignments = await ctx.db
      .query('taskAssignments')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    const assignedTaskIds = new Set(
      assignments
        .filter((row) => row.housekeepingTaskId && row.role === 'lead')
        .map((row) => row.housekeepingTaskId),
    );

    const now = Date.now();
    let open = 0;
    let overdue = 0;
    let unassigned = 0;
    const overdueRows: typeof tasks = [];

    for (const task of tasks) {
      if (!isOpenStatus(task.status)) continue;
      open += 1;
      if (!assignedTaskIds.has(task._id) && !task.assignedTo) unassigned += 1;
      if (task.dueAt && task.dueAt < now) {
        overdue += 1;
        overdueRows.push(task);
      }
    }

    overdueRows.sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0));
    const overdueTitles = await Promise.all(
      overdueRows.slice(0, 5).map(async (task) => {
        const room = await ctx.db.get(task.roomId);
        return {
          _id: task._id,
          taskType: task.taskType,
          roomNumber: room?.roomNumber ?? '—',
          dueAt: task.dueAt,
        };
      }),
    );

    return {
      success: true,
      data: {
        open,
        overdue,
        unassigned,
        overdueTitles,
      },
    };
  },
});

export const getFnBTodaySnapshot = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    const auth = await tryRequirePermission(ctx, 'fnb.read', args.propertyId);
    if (!auth) {
      throw new Error('Unauthorized');
    }

    const property = await ctx.db.get(args.propertyId);
    const { dateKey } = localDayBounds(Date.now(), propertyTimeZone(property));

    const logs = await ctx.db
      .query('userStockLogs')
      .withIndex('by_propertyId_logDate', (q) =>
        q.eq('propertyId', args.propertyId).eq('logDate', dateKey),
      )
      .collect();

    let totalQtySold = 0;
    let totalRevenue = 0;
    let totalCogs = 0;
    let openLogCount = 0;
    let finalizedLogCount = 0;

    for (const log of logs) {
      totalQtySold += log.salesQuantity;
      totalRevenue += log.salesValue;
      totalCogs += log.cogsValue ?? 0;
      if (log.isFinalized) finalizedLogCount += 1;
      else openLogCount += 1;
    }

    return {
      success: true,
      data: {
        dateKey,
        totalQtySold,
        totalRevenue,
        totalCogs,
        grossProfit: totalRevenue - totalCogs,
        openLogCount,
        finalizedLogCount,
      },
    };
  },
});

export const getFinancialReport = query({
  args: {
    propertyId: v.id('properties'),
    start: v.number(),
    end: v.number(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'reports.read', args.propertyId);
    const nights = periodNights(args.start, args.end);
    const startKey = new Date(args.start).toISOString().slice(0, 10);
    const endKey = new Date(args.end).toISOString().slice(0, 10);

    const rooms = await ctx.db
      .query('rooms')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    const activeRooms = rooms.filter((room) => room.isActive);
    const sellableRooms = activeRooms.filter(
      (room) => room.status !== 'out-of-order' && room.status !== 'maintenance',
    ).length;
    const availableRoomNights = sellableRooms * nights;

    const lookbackStart = args.start - 90 * DAY_MS;
    const arrivingInWindow = await ctx.db
      .query('reservations')
      .withIndex('by_propertyId_checkInDate', (q) =>
        q
          .eq('propertyId', args.propertyId)
          .gte('checkInDate', lookbackStart)
          .lt('checkInDate', args.end),
      )
      .collect();
    const departingInWindow = await ctx.db
      .query('reservations')
      .withIndex('by_propertyId_checkOutDate', (q) =>
        q
          .eq('propertyId', args.propertyId)
          .gte('checkOutDate', args.start)
          .lt('checkOutDate', args.end),
      )
      .collect();
    const currentlyInHouse = await ctx.db
      .query('reservations')
      .withIndex('by_propertyId_status', (q) =>
        q.eq('propertyId', args.propertyId).eq('status', 'checked-in'),
      )
      .collect();
    const reservationById = new Map(
      [...arrivingInWindow, ...departingInWindow, ...currentlyInHouse].map((row) => [row._id, row]),
    );

    let roomsSoldNights = 0;
    let roomRevenue = 0;
    for (const reservation of reservationById.values()) {
      if (!COUNTED_RESERVATION_STATUSES.has(reservation.status)) continue;
      const sold = overlapNights(
        reservation.checkInDate,
        reservation.checkOutDate,
        args.start,
        args.end,
      );
      if (sold === 0) continue;
      roomsSoldNights += sold;
      const stayNights = Math.max(
        1,
        periodNights(reservation.checkInDate, reservation.checkOutDate),
      );
      roomRevenue += reservation.rate > 0
        ? reservation.rate * sold
        : (reservation.totalAmount * sold) / stayNights;
    }

    const stockLogs = await ctx.db
      .query('userStockLogs')
      .withIndex('by_propertyId_logDate', (q) =>
        q
          .eq('propertyId', args.propertyId)
          .gte('logDate', startKey)
          .lt('logDate', endKey),
      )
      .collect();
    let fnbRevenue = 0;
    let fnbQtySold = 0;
    for (const log of stockLogs) {
      if (log.logDate < startKey || log.logDate >= endKey) continue;
      fnbRevenue += log.salesValue;
      fnbQtySold += log.salesQuantity;
    }

    const expenses = await ctx.db
      .query('expenses')
      .withIndex('by_propertyId_expenseDate', (q) =>
        q.eq('propertyId', args.propertyId).gte('expenseDate', args.start).lt('expenseDate', args.end),
      )
      .collect();
    const expenseByCategory: Record<(typeof EXPENSE_CATEGORIES)[number], number> = {
      utilities: 0,
      supplies: 0,
      staff: 0,
      maintenance: 0,
      other: 0,
    };
    for (const row of expenses) {
      if (row.category in expenseByCategory) {
        expenseByCategory[row.category] += row.amount;
      } else {
        expenseByCategory.other += row.amount;
      }
    }
    const totalExpenses = EXPENSE_CATEGORIES.reduce(
      (sum, key) => sum + expenseByCategory[key],
      0,
    );

    const LABOR_STATUSES = ['approved', 'processed', 'paid'] as const;
    let laborCost = 0;
    for (const status of LABOR_STATUSES) {
      const runs = await ctx.db
        .query('payrolls')
        .withIndex('by_propertyId_status', (q) =>
          q.eq('propertyId', args.propertyId).eq('status', status),
        )
        .collect();
      for (const run of runs) {
        if (run.payDate >= args.start && run.payDate < args.end) {
          laborCost += run.totalNetPay;
        }
      }
    }

    const totalRevenue = roomRevenue + fnbRevenue;
    const gop = totalRevenue - totalExpenses;
    const occupancyRate = availableRoomNights === 0 ? 0 : (roomsSoldNights / availableRoomNights) * 100;
    const adr = roomsSoldNights === 0 ? 0 : roomRevenue / roomsSoldNights;
    const revpar = availableRoomNights === 0 ? 0 : roomRevenue / availableRoomNights;
    const trevpar = availableRoomNights === 0 ? 0 : totalRevenue / availableRoomNights;
    const goppar = availableRoomNights === 0 ? 0 : gop / availableRoomNights;
    const gopMargin = totalRevenue === 0 ? 0 : (gop / totalRevenue) * 100;
    const laborCostPct = totalRevenue === 0 ? 0 : (laborCost / totalRevenue) * 100;

    return {
      success: true,
      data: {
        nights,
        sellableRooms,
        availableRoomNights,
        roomsSoldNights,
        occupancyRate,
        adr,
        revpar,
        trevpar,
        goppar,
        gopMargin,
        laborCostPct,
        roomRevenue,
        fnbRevenue,
        fnbQtySold,
        totalRevenue,
        expenses: expenseByCategory,
        totalExpenses,
        gop,
      },
    };
  },
});
