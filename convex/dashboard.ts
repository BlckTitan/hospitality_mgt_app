import { query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission, tryRequirePermission } from './lib/rbac';
import { localDayBounds, propertyTimeZone } from './lib/billingPeriods';
import { isOpenStatus, MODULE_PERMS } from './lib/taskAssignment';
import { EXPENSE_CATEGORIES } from './lib/postCashOutflow';
import { sumPosGuestRevenue } from './posOrders';
import { sumRestaurantGuestRevenue } from './restaurantOrders';

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
    const nextKey = (() => {
      const d = new Date(`${dateKey}T12:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().slice(0, 10);
    })();

    // Guest F&B revenue: settled POS (+ paid portion of open tabs). Stock logs stay control-only.
    const pos = await sumPosGuestRevenue(ctx, {
      propertyId: args.propertyId,
      startDateKey: dateKey,
      endDateKeyExclusive: nextKey,
    });

    const logs = await ctx.db
      .query('userStockLogs')
      .withIndex('by_propertyId_logDate', (q) =>
        q.eq('propertyId', args.propertyId).eq('logDate', dateKey),
      )
      .collect();

    let totalCogs = 0;
    let totalWasteQty = 0;
    let totalCompQty = 0;
    let openLogCount = 0;
    let finalizedLogCount = 0;
    let stockImpliedRevenue = 0;
    let stockImpliedQty = 0;

    for (const log of logs) {
      stockImpliedQty += log.salesQuantity;
      stockImpliedRevenue += log.salesValue;
      totalCogs += log.cogsValue ?? 0;
      totalWasteQty += log.wasteQuantity ?? 0;
      totalCompQty += log.compQuantity ?? 0;
      if (log.isFinalized) finalizedLogCount += 1;
      else openLogCount += 1;
    }

    return {
      success: true,
      data: {
        dateKey,
        totalQtySold: pos.totalQtySold,
        totalRevenue: pos.totalRevenue,
        totalCogs,
        totalWasteQty,
        totalCompQty,
        grossProfit: pos.totalRevenue - totalCogs,
        openLogCount,
        finalizedLogCount,
        orderCount: pos.orderCount,
        stockImpliedQty,
        stockImpliedRevenue,
        revenueSource: 'pos' as const,
      },
    };
  },
});

export const getRestaurantTodaySnapshot = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'restaurant.read', args.propertyId);

    const property = await ctx.db.get(args.propertyId);
    const { dateKey } = localDayBounds(Date.now(), propertyTimeZone(property));
    const nextKey = (() => {
      const d = new Date(`${dateKey}T12:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().slice(0, 10);
    })();

    const revenueBundle = await sumRestaurantGuestRevenue(ctx, {
      propertyId: args.propertyId,
      startDateKey: dateKey,
      endDateKeyExclusive: nextKey,
    });

    // Food cost from completed (settled) orders' recipe/menu costs when available.
    const settledToday = await ctx.db
      .query('restaurantOrders')
      .withIndex('by_propertyId_status_openedAtDateKey', (q) =>
        q
          .eq('propertyId', args.propertyId)
          .eq('status', 'settled')
          .eq('openedAtDateKey', dateKey),
      )
      .collect();

    let foodCost = 0;
    for (const order of settledToday) {
      if (!order.completedAt) continue;
      const lines = await ctx.db
        .query('restaurantOrderLines')
        .withIndex('by_orderId', (q) => q.eq('orderId', order._id))
        .collect();
      for (const line of lines) {
        if (line.lineStatus !== 'active') continue;
        const menuItem = await ctx.db.get(line.menuItemId);
        if (menuItem?.cost !== undefined) {
          foodCost += menuItem.cost * line.quantity;
        } else {
          const recipe = await ctx.db
            .query('recipes')
            .withIndex('by_menuItemId', (q) => q.eq('menuItemId', line.menuItemId))
            .first();
          if (recipe?.totalCost !== undefined) {
            const servings = recipe.servings > 0 ? recipe.servings : 1;
            foodCost += (recipe.totalCost / servings) * line.quantity;
          }
        }
      }
    }

    const revenue = revenueBundle.totalRevenue;
    const foodCostPercent = revenue > 0 ? (foodCost / revenue) * 100 : 0;

    const openOrders = await ctx.db
      .query('restaurantOrders')
      .withIndex('by_propertyId_status', (q) =>
        q.eq('propertyId', args.propertyId).eq('status', 'open'),
      )
      .collect();
    const openTabs = await ctx.db
      .query('restaurantOrders')
      .withIndex('by_propertyId_status', (q) =>
        q.eq('propertyId', args.propertyId).eq('status', 'open_tab'),
      )
      .collect();

    const occupiedTables = await ctx.db
      .query('restaurantTables')
      .withIndex('by_propertyId_status', (q) =>
        q.eq('propertyId', args.propertyId).eq('status', 'occupied'),
      )
      .collect();

    return {
      success: true,
      data: {
        dateKey,
        revenue,
        foodCost,
        foodCostPercent,
        openOrders: openOrders.length + openTabs.length,
        occupiedTables: occupiedTables.filter((t) => t.isActive).length,
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
    let stockImpliedRevenue = 0;
    let stockImpliedQty = 0;
    for (const log of stockLogs) {
      if (log.logDate < startKey || log.logDate >= endKey) continue;
      stockImpliedRevenue += log.salesValue;
      stockImpliedQty += log.salesQuantity;
    }

    const pos = await sumPosGuestRevenue(ctx, {
      propertyId: args.propertyId,
      startDateKey: startKey,
      endDateKeyExclusive: endKey,
    });
    const fnbRevenue = pos.totalRevenue;
    const fnbQtySold = pos.totalQtySold;

    const restaurantPos = await sumRestaurantGuestRevenue(ctx, {
      propertyId: args.propertyId,
      startDateKey: startKey,
      endDateKeyExclusive: endKey,
    });
    const restaurantRevenue = restaurantPos.totalRevenue;

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

    const totalRevenue = roomRevenue + fnbRevenue + restaurantRevenue;
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
        fnbRevenueSource: 'pos' as const,
        restaurantRevenue,
        stockImpliedRevenue,
        stockImpliedQty,
        totalRevenue,
        expenses: expenseByCategory,
        totalExpenses,
        gop,
      },
    };
  },
});

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function dateKeyFromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function mondayIndexFromDateKey(dateKey: string): number {
  // ISO date at noon UTC → Sun=0…Sat=6, then shift so Mon=0…Sun=6
  return (new Date(`${dateKey}T12:00:00.000Z`).getUTCDay() + 6) % 7;
}

function emptyWeekBuckets() {
  return WEEKDAY_LABELS.map((day) => ({
    day,
    rooms: 0,
    bar: 0,
    food: 0,
    total: 0,
    roomsSoldNights: 0,
    weekdayOccurrences: 0,
    occupancyRate: 0,
    barQty: 0,
    foodSales: 0,
  }));
}

function peakBy(
  buckets: ReturnType<typeof emptyWeekBuckets>,
  valueOf: (b: (typeof buckets)[number]) => number,
): { day: (typeof WEEKDAY_LABELS)[number] | null; value: number } {
  let day: (typeof WEEKDAY_LABELS)[number] | null = null;
  let value = 0;
  for (const bucket of buckets) {
    const next = valueOf(bucket);
    if (next > value) {
      value = next;
      day = bucket.day;
    }
  }
  return { day: value > 0 ? day : null, value };
}

/** Day-of-week performance: room occupancy %, bar qty sold, food sales. */
export const getSalesByDayOfWeek = query({
  args: {
    propertyId: v.id('properties'),
    start: v.number(),
    end: v.number(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'reports.read', args.propertyId);

    const startKey = dateKeyFromUtcMs(args.start);
    const endKey = dateKeyFromUtcMs(args.end);
    const buckets = emptyWeekBuckets();

    const rooms = await ctx.db
      .query('rooms')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();
    const sellableRooms = rooms.filter(
      (room) =>
        room.isActive && room.status !== 'out-of-order' && room.status !== 'maintenance',
    ).length;

    // Count how many times each weekday falls in the selected period.
    let cursor = Date.UTC(
      new Date(args.start).getUTCFullYear(),
      new Date(args.start).getUTCMonth(),
      new Date(args.start).getUTCDate(),
    );
    const periodEnd = Date.UTC(
      new Date(args.end).getUTCFullYear(),
      new Date(args.end).getUTCMonth(),
      new Date(args.end).getUTCDate(),
    );
    while (cursor < periodEnd) {
      const key = dateKeyFromUtcMs(cursor);
      if (key >= startKey && key < endKey) {
        buckets[mondayIndexFromDateKey(key)].weekdayOccurrences += 1;
      }
      cursor += DAY_MS;
    }

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
      [...arrivingInWindow, ...departingInWindow, ...currentlyInHouse].map((row) => [
        row._id,
        row,
      ]),
    );

    for (const reservation of reservationById.values()) {
      if (!COUNTED_RESERVATION_STATUSES.has(reservation.status)) continue;
      const stayNights = Math.max(
        1,
        periodNights(reservation.checkInDate, reservation.checkOutDate),
      );
      const nightly =
        reservation.rate > 0 ? reservation.rate : reservation.totalAmount / stayNights;

      // Attribute each sold night to the weekday of that night (check-in morning through night before checkout).
      let nightStart = Math.max(reservation.checkInDate, args.start);
      // Align to UTC midnight of the night's calendar date for stable day keys.
      nightStart = Date.UTC(
        new Date(nightStart).getUTCFullYear(),
        new Date(nightStart).getUTCMonth(),
        new Date(nightStart).getUTCDate(),
      );
      const stayEnd = Math.min(reservation.checkOutDate, args.end);
      while (nightStart < stayEnd) {
        const key = dateKeyFromUtcMs(nightStart);
        if (key >= startKey && key < endKey) {
          const bucket = buckets[mondayIndexFromDateKey(key)];
          bucket.rooms += nightly;
          bucket.roomsSoldNights += 1;
        }
        nightStart += DAY_MS;
      }
    }

    for (const bucket of buckets) {
      const available = sellableRooms * bucket.weekdayOccurrences;
      bucket.occupancyRate = available === 0 ? 0 : (bucket.roomsSoldNights / available) * 100;
    }

    const orders = await ctx.db
      .query('orders')
      .withIndex('by_propertyId_openedAtDateKey', (q) =>
        q
          .eq('propertyId', args.propertyId)
          .gte('openedAtDateKey', startKey)
          .lt('openedAtDateKey', endKey),
      )
      .collect();

    for (const order of orders) {
      let amount = 0;
      if (order.status === 'settled') amount = order.totalAmount;
      else if (order.status === 'open_tab') amount = order.amountPaid;
      else continue;

      const idx = mondayIndexFromDateKey(order.openedAtDateKey);
      const bucket = buckets[idx];

      if (order.orderType === 'bar') {
        if (amount > 0) bucket.bar += amount;
        const lines = await ctx.db
          .query('orderLines')
          .withIndex('by_orderId', (q) => q.eq('orderId', order._id))
          .collect();
        for (const line of lines) {
          if (line.status === 'active') bucket.barQty += line.quantity;
        }
      } else if (amount > 0) {
        // room_service, dine_in, takeout — guest food / F&B outside the bar terminal
        bucket.food += amount;
        bucket.foodSales += amount;
      }
    }

    for (const bucket of buckets) {
      bucket.total = bucket.rooms + bucket.bar + bucket.food;
    }

    const revenuePeak = peakBy(buckets, (b) => b.total);
    const occupancyPeak = peakBy(buckets, (b) => b.occupancyRate);
    const barQtyPeak = peakBy(buckets, (b) => b.barQty);
    const foodSalesPeak = peakBy(buckets, (b) => b.foodSales);

    return {
      success: true,
      data: {
        startKey,
        endKey,
        sellableRooms,
        days: buckets,
        peakDay: revenuePeak.day,
        peakTotal: revenuePeak.value,
        peakOccupancyDay: occupancyPeak.day,
        peakOccupancyRate: occupancyPeak.value,
        peakBarQtyDay: barQtyPeak.day,
        peakBarQty: barQtyPeak.value,
        peakFoodSalesDay: foodSalesPeak.day,
        peakFoodSales: foodSalesPeak.value,
      },
    };
  },
});
