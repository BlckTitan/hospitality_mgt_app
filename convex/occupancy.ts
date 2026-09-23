import { query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission, tryRequirePermission } from './lib/rbac';
import { localDayBounds, propertyTimeZone } from './lib/billingPeriods';

const BLOCKING_STATUSES = new Set(['pending', 'confirmed', 'checked-in']);
const SOLD_STATUSES = new Set(['confirmed', 'checked-in', 'checked-out']);
const OPEN_HK = new Set(['pending', 'in-progress']);
const OPEN_MAINTENANCE = new Set(['pending', 'in-progress']);

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function nightBounds(year: number, month: number, day: number) {
  const start = Date.UTC(year, month - 1, day);
  const end = Date.UTC(year, month - 1, day + 1);
  return { start, end };
}

function coversNight(checkInDate: number, checkOutDate: number, nightStart: number, nightEnd: number) {
  return checkInDate < nightEnd && checkOutDate > nightStart;
}

function dateKeyFromTimestamp(timestamp: number, timeZone: string): string {
  return localDayBounds(timestamp, timeZone).dateKey;
}

export const getOccupancyCalendar = query({
  args: {
    propertyId: v.id('properties'),
    year: v.optional(v.number()),
    month: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'reservations.read', args.propertyId);

    const property = await ctx.db.get(args.propertyId);
    const timeZone = propertyTimeZone(property);
    const today = localDayBounds(Date.now(), timeZone);
    const todayKey = today.dateKey;
    const year = args.year ?? Number(todayKey.slice(0, 4));
    const month = args.month ?? Number(todayKey.slice(5, 7));

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return { success: false as const, message: 'Invalid year', data: null };
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return { success: false as const, message: 'Invalid month', data: null };
    }
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const monthStart = Date.UTC(year, month - 1, 1);
    const monthEnd = Date.UTC(year, month, 1);

    const days = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const { start, end } = nightBounds(year, month, day);
      const key = dateKey(year, month, day);
      return {
        dateKey: key,
        day,
        weekday: new Date(start).getUTCDay(),
        isToday: key === todayKey,
        start,
        end,
      };
    });

    const rooms = await ctx.db
      .query('rooms')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();

    const roomTypeIds = [...new Set(rooms.map((room) => room.roomTypeId))];
    const roomTypes = await Promise.all(roomTypeIds.map((id) => ctx.db.get(id)));
    const roomTypeById = new Map(roomTypes.filter(Boolean).map((row) => [row!._id, row!]));

    const reservations = await ctx.db
      .query('reservations')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .collect();

    const overlapping = reservations.filter((row) => {
      if (!BLOCKING_STATUSES.has(row.status) && !SOLD_STATUSES.has(row.status)) {
        return false;
      }
      return row.checkInDate < monthEnd && row.checkOutDate > monthStart;
    });

    const guestIds = [...new Set(overlapping.map((row) => row.guestId))];
    const guests = await Promise.all(guestIds.map((id) => ctx.db.get(id)));
    const guestById = new Map(guests.filter(Boolean).map((row) => [row!._id, row!]));

    const canHousekeeping = await tryRequirePermission(ctx, 'housekeeping.task.read', args.propertyId);
    const openHousekeeping = canHousekeeping
      ? (
          await Promise.all(
            (['pending', 'in-progress'] as const).map((status) =>
              ctx.db
                .query('housekeepingTasks')
                .withIndex('by_propertyId_status', (q) =>
                  q.eq('propertyId', args.propertyId).eq('status', status),
                )
                .collect(),
            ),
          )
        ).flat()
      : [];

    const hkByRoom = new Map<string, Array<{ taskType: string; dateKey: string }>>();
    for (const task of openHousekeeping) {
      if (!OPEN_HK.has(task.status)) continue;
      const key =
        task.taskType === 'stayover'
          ? dateKeyFromTimestamp(task.scheduledAt ?? task.createdAt, timeZone)
          : todayKey;
      const list = hkByRoom.get(task.roomId) ?? [];
      list.push({ taskType: task.taskType, dateKey: key });
      hkByRoom.set(task.roomId, list);
    }

    const canMaintenance = await tryRequirePermission(ctx, 'maintenance.order.read', args.propertyId);
    const openMaintenance = canMaintenance
      ? (
          await Promise.all(
            (['pending', 'in-progress'] as const).map((status) =>
              ctx.db
                .query('maintenanceOrders')
                .withIndex('by_propertyId_status', (q) =>
                  q.eq('propertyId', args.propertyId).eq('status', status),
                )
                .collect(),
            ),
          )
        ).flat()
      : [];

    const maintenanceDaysByRoom = new Map<string, Set<string>>();
    for (const order of openMaintenance) {
      if (!order.roomId || !OPEN_MAINTENANCE.has(order.status)) continue;
      const stamp = order.scheduledDate ?? order.dueAt;
      const key = dateKeyFromTimestamp(stamp, timeZone);
      const set = maintenanceDaysByRoom.get(order.roomId) ?? new Set<string>();
      set.add(key);
      maintenanceDaysByRoom.set(order.roomId, set);
    }

    const staysByRoom = new Map<string, typeof overlapping>();
    for (const stay of overlapping) {
      const list = staysByRoom.get(stay.roomId) ?? [];
      list.push(stay);
      staysByRoom.set(stay.roomId, list);
    }

    let soldNights = 0;
    let availableNights = 0;
    let occupiedToday = 0;
    let notReadyToday = 0;

    const roomRows = rooms
      .slice()
      .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }))
      .map((room) => {
        const roomType = roomTypeById.get(room.roomTypeId) ?? null;
        const stays = staysByRoom.get(room._id) ?? [];
        const hk = hkByRoom.get(room._id) ?? [];
        const maintenanceDays = maintenanceDaysByRoom.get(room._id);
        const structurallyBlocked = room.status === 'out-of-order' || room.status === 'maintenance';
        const hasOpenCheckout = hk.some((task) => task.taskType === 'checkout');

        if (room.isActive && !structurallyBlocked) {
          availableNights += daysInMonth;
        }

        const cells = days.map((day) => {
          const stay = stays.find((row) =>
            coversNight(row.checkInDate, row.checkOutDate, day.start, day.end),
          );
          const guest = stay ? guestById.get(stay.guestId) : null;
          const guestName = guest ? `${guest.firstName} ${guest.lastName}`.trim() : null;
          const hkOnDay = hk.find((task) => task.dateKey === day.dateKey);
          const blockedByOrder = maintenanceDays?.has(day.dateKey) ?? false;

          let kind: 'occupied' | 'confirmed' | 'pending' | 'blocked' | 'vacant' = 'vacant';
          if (stay?.status === 'checked-in') kind = 'occupied';
          else if (stay?.status === 'confirmed' || stay?.status === 'checked-out') kind = 'confirmed';
          else if (stay?.status === 'pending') kind = 'pending';
          else if (structurallyBlocked || blockedByOrder) kind = 'blocked';

          if (stay && SOLD_STATUSES.has(stay.status) && room.isActive && !structurallyBlocked) {
            soldNights += 1;
          }

          if (day.isToday && kind === 'occupied') occupiedToday += 1;
          if (day.isToday && hasOpenCheckout) notReadyToday += 1;

          return {
            dateKey: day.dateKey,
            kind,
            reservationId: stay?._id ?? null,
            confirmationNumber: stay?.confirmationNumber ?? null,
            guestName,
            status: stay?.status ?? null,
            housekeeping: hkOnDay?.taskType ?? (hasOpenCheckout && day.isToday ? 'checkout' : null),
          };
        });

        return {
          _id: room._id,
          roomNumber: room.roomNumber,
          floor: room.floor,
          status: room.status,
          isActive: room.isActive,
          isReady: !hasOpenCheckout,
          roomType: roomType
            ? { _id: roomType._id, name: roomType.name }
            : null,
          cells,
        };
      });

    return {
      success: true as const,
      data: {
        timeZone,
        year,
        month,
        todayKey,
        days: days.map(({ dateKey: key, day, weekday, isToday }) => ({
          dateKey: key,
          day,
          weekday,
          isToday,
        })),
        rooms: roomRows,
        summary: {
          soldNights,
          availableNights,
          occupancyRate: availableNights === 0 ? 0 : (soldNights / availableNights) * 100,
          occupiedToday,
          notReadyToday,
        },
      },
    };
  },
});
