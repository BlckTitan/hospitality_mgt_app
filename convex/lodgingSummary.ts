import { query, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';
import { tryRequirePermission } from './lib/rbac';
import { localDayBounds, propertyTimeZone } from './lib/billingPeriods';
import { addDateKey, DAY_MS, isShortStay, utcDateKey } from './lib/stays';
import { staffDisplayName } from './lib/shiftHelpers';

const ROW_CAP = 4000;
const SHIFT_LINK_CAP = 300;
const TZ_PAD_MS = 14 * 60 * 60 * 1000;
const COUNTED = new Set(['confirmed', 'checked-in', 'checked-out']);
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const grainValidator = v.union(
  v.literal('day'),
  v.literal('week'),
  v.literal('month'),
  v.literal('year'),
);

type Grain = 'day' | 'week' | 'month' | 'year';

type DayStat = {
  roomRevenue: number;
  shortStayRevenue: number;
  soldNights: number;
  collected: number;
};

type RoomStat = {
  stays: number;
  nights: number;
  shortStays: number;
  revenue: number;
};

function emptyDay(): DayStat {
  return { roomRevenue: 0, shortStayRevenue: 0, soldNights: 0, collected: 0 };
}

function emptyRoom(): RoomStat {
  return { stays: 0, nights: 0, shortStays: 0, revenue: 0 };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function utcStart(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  return utcDateKey(utcStart(value)) === value && year >= 2000 && year <= 2100;
}

function shiftYears(dateKey: string, years: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const last = new Date(Date.UTC(year + years, month, 0)).getUTCDate();
  return utcDateKey(Date.UTC(year + years, month - 1, Math.min(day, last)));
}

function mondayKey(dateKey: string): string {
  const weekday = (new Date(utcStart(dateKey)).getUTCDay() + 6) % 7;
  return addDateKey(dateKey, -weekday);
}

function diffDays(startKey: string, endKey: string): number {
  return Math.round((utcStart(endKey) - utcStart(startKey)) / DAY_MS);
}

function eachDateKey(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  let cursor = startKey;
  while (cursor < endKey && keys.length < 400) {
    keys.push(cursor);
    cursor = addDateKey(cursor, 1);
  }
  return keys;
}

function naturalBounds(grain: Grain, anchor: string): { startKey: string; endKey: string } {
  if (grain === 'day') {
    return { startKey: anchor, endKey: addDateKey(anchor, 1) };
  }
  if (grain === 'week') {
    const startKey = mondayKey(anchor);
    return { startKey, endKey: addDateKey(startKey, 7) };
  }
  if (grain === 'month') {
    const startKey = `${anchor.slice(0, 7)}-01`;
    const [year, month] = startKey.split('-').map(Number);
    return { startKey, endKey: utcDateKey(Date.UTC(year, month, 1)) };
  }
  const year = Number(anchor.slice(0, 4));
  return { startKey: `${year}-01-01`, endKey: `${year + 1}-01-01` };
}

function reportedWindow(grain: Grain, anchor: string, today: string) {
  const natural = naturalBounds(grain, anchor);
  const tomorrow = addDateKey(today, 1);
  let endKey = natural.endKey;
  if (natural.startKey <= today && natural.endKey > tomorrow) {
    endKey = tomorrow;
  }
  const elapsed = Math.max(0, diffDays(natural.startKey, endKey));
  const priorNatural = naturalBounds(grain, shiftYears(anchor, -1));
  let priorEnd = addDateKey(priorNatural.startKey, elapsed);
  if (priorEnd > priorNatural.endKey) priorEnd = priorNatural.endKey;
  return {
    startKey: natural.startKey,
    endKey,
    priorStartKey: priorNatural.startKey,
    priorEndKey: priorEnd,
    capped: endKey !== natural.endKey,
  };
}

function yoyPercent(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

function lodgingOf(day: DayStat): number {
  return day.roomRevenue + day.shortStayRevenue;
}

function bucketLabel(grain: Grain, key: string): string {
  if (grain === 'year') {
    const month = Number(key.slice(5, 7));
    return MONTHS[month - 1] ?? key;
  }
  const weekday = WEEKDAYS[(new Date(utcStart(key)).getUTCDay() + 6) % 7];
  if (grain === 'day') return `${weekday} ${key}`;
  return `${weekday} ${key.slice(8)}`;
}

function periodLabel(startKey: string, endKey: string): string {
  const last = addDateKey(endKey, -1);
  if (last < startKey) return startKey;
  if (last === startKey) return startKey;
  return `${startKey} – ${last}`;
}

async function loadTouchingReservations(
  ctx: QueryCtx,
  propertyId: Id<'properties'>,
  startKey: string,
  endKey: string,
) {
  const start = utcStart(startKey);
  const end = utcStart(endKey);
  const lookback = start - 400 * DAY_MS;
  const arriving = await ctx.db
    .query('reservations')
    .withIndex('by_propertyId_checkInDate', (q) =>
      q.eq('propertyId', propertyId).gte('checkInDate', lookback).lt('checkInDate', end),
    )
    .take(ROW_CAP);
  const departing = await ctx.db
    .query('reservations')
    .withIndex('by_propertyId_checkOutDate', (q) =>
      q.eq('propertyId', propertyId).gte('checkOutDate', start).lt('checkOutDate', end + 400 * DAY_MS),
    )
    .take(ROW_CAP);
  const inHouse = await ctx.db
    .query('reservations')
    .withIndex('by_propertyId_status', (q) =>
      q.eq('propertyId', propertyId).eq('status', 'checked-in'),
    )
    .take(ROW_CAP);
  const byId = new Map<Id<'reservations'>, Doc<'reservations'>>();
  for (const row of [...arriving, ...departing, ...inHouse]) {
    if (row.checkInDate < end && row.checkOutDate > start) byId.set(row._id, row);
  }
  return {
    rows: [...byId.values()],
    truncated:
      arriving.length >= ROW_CAP || departing.length >= ROW_CAP || inHouse.length >= ROW_CAP,
  };
}

async function loadPayments(
  ctx: QueryCtx,
  propertyId: Id<'properties'>,
  startKey: string,
  endKey: string,
  timeZone: string,
) {
  const rows = await ctx.db
    .query('payments')
    .withIndex('by_propertyId_and_paidAt', (q) =>
      q
        .eq('propertyId', propertyId)
        .gte('paidAt', utcStart(startKey) - TZ_PAD_MS)
        .lt('paidAt', utcStart(endKey) + TZ_PAD_MS),
    )
    .take(ROW_CAP);
  const kept = rows.filter((row) => {
    if (row.paymentType !== 'reservation' || row.status !== 'completed' || row.paidAt == null) {
      return false;
    }
    const key = localDayBounds(row.paidAt, timeZone).dateKey;
    return key >= startKey && key < endKey;
  });
  return { rows: kept, truncated: rows.length >= ROW_CAP };
}

function addNightRevenue(
  reservation: Doc<'reservations'>,
  startKey: string,
  endKey: string,
  days: Map<string, DayStat>,
  onNight?: (dateKey: string, nightly: number) => void,
) {
  const start = utcStart(startKey);
  const end = utcStart(endKey);
  if (isShortStay(reservation)) {
    if (reservation.checkOutDate <= start || reservation.checkInDate >= end) return;
    const key = utcDateKey(reservation.checkInDate);
    if (key < startKey || key >= endKey) return;
    const day = days.get(key);
    if (!day) return;
    day.shortStayRevenue += reservation.totalAmount;
    onNight?.(key, reservation.totalAmount);
    return;
  }
  const stayNights = Math.max(1, Math.round((reservation.checkOutDate - reservation.checkInDate) / DAY_MS));
  const nightly = reservation.rate > 0 ? reservation.rate : reservation.totalAmount / stayNights;
  let nightStart = Math.max(reservation.checkInDate, start);
  nightStart = Date.UTC(
    new Date(nightStart).getUTCFullYear(),
    new Date(nightStart).getUTCMonth(),
    new Date(nightStart).getUTCDate(),
  );
  const stayEnd = Math.min(reservation.checkOutDate, end);
  while (nightStart < stayEnd) {
    const key = utcDateKey(nightStart);
    const day = days.get(key);
    if (day) {
      day.roomRevenue += nightly;
      day.soldNights += 1;
      onNight?.(key, nightly);
    }
    nightStart += DAY_MS;
  }
}

function dateKeyInRange(ms: number | undefined, timeZone: string, startKey: string, endKey: string) {
  if (ms == null) return false;
  const key = localDayBounds(ms, timeZone).dateKey;
  return key >= startKey && key < endKey;
}

export const getLodgingSummary = query({
  args: {
    propertyId: v.id('properties'),
    date: v.optional(v.string()),
    grain: grainValidator,
  },
  handler: async (ctx, args) => {
    const canRead = await tryRequirePermission(ctx, 'reservations.read', args.propertyId);
    if (!canRead) {
      return { success: false as const, message: 'You do not have access to lodging summaries.', data: null };
    }

    const property = await ctx.db.get(args.propertyId);
    if (!property) {
      return { success: false as const, message: 'Property not found.', data: null };
    }
    const timeZone = propertyTimeZone(property);
    const today = localDayBounds(Date.now(), timeZone).dateKey;
    const anchor = args.date?.trim() || today;
    if (!isDateKey(anchor)) {
      return { success: false as const, message: 'Pick a valid date.', data: null };
    }

    const window = reportedWindow(args.grain, anchor, today);
    const dates = eachDateKey(window.startKey, window.endKey);
    const priorDates = eachDateKey(window.priorStartKey, window.priorEndKey);
    const days = new Map(dates.map((key) => [key, emptyDay()]));
    const priorDays = new Map(priorDates.map((key) => [key, emptyDay()]));

    const rooms = await ctx.db
      .query('rooms')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
      .take(2000);
    const roomById = new Map(rooms.map((room) => [room._id, room]));
    let sellableRooms = 0;
    for (const room of rooms) {
      if (room.isActive && room.status !== 'out-of-order' && room.status !== 'maintenance') {
        sellableRooms += 1;
      }
    }
    const roomTypeIds = [...new Set(rooms.map((room) => room.roomTypeId))];
    const roomTypeDocs = await Promise.all(roomTypeIds.map((id) => ctx.db.get(id)));
    const roomTypeName = new Map(
      roomTypeDocs.filter((row) => row !== null).map((row) => [row._id, row.name]),
    );

    const currentStays = await loadTouchingReservations(ctx, args.propertyId, window.startKey, window.endKey);
    const priorStays = await loadTouchingReservations(
      ctx,
      args.propertyId,
      window.priorStartKey,
      window.priorEndKey,
    );
    const currentPayments = await loadPayments(
      ctx,
      args.propertyId,
      window.startKey,
      window.endKey,
      timeZone,
    );
    const priorPayments = await loadPayments(
      ctx,
      args.propertyId,
      window.priorStartKey,
      window.priorEndKey,
      timeZone,
    );

    const roomStats = new Map<Id<'rooms'>, RoomStat>();
    const typeStats = new Map<string, RoomStat>();
    let stays = 0;
    let shortStays = 0;

    const bumpRoom = (reservation: Doc<'reservations'>, nights: number, revenue: number, short: boolean) => {
      const room = roomById.get(reservation.roomId);
      const stat = roomStats.get(reservation.roomId) ?? emptyRoom();
      stat.stays += 1;
      stat.revenue += revenue;
      if (short) stat.shortStays += 1;
      else stat.nights += nights;
      roomStats.set(reservation.roomId, stat);
      const typeKey = room ? room.roomTypeId : 'unknown';
      const typeStat = typeStats.get(typeKey) ?? emptyRoom();
      typeStat.stays += 1;
      typeStat.revenue += revenue;
      if (short) typeStat.shortStays += 1;
      else typeStat.nights += nights;
      typeStats.set(typeKey, typeStat);
    };

    for (const reservation of currentStays.rows) {
      if (!COUNTED.has(reservation.status)) continue;
      if (isShortStay(reservation)) {
        const key = utcDateKey(reservation.checkInDate);
        if (key < window.startKey || key >= window.endKey) continue;
        stays += 1;
        shortStays += 1;
        bumpRoom(reservation, 0, reservation.totalAmount, true);
      } else if (reservation.checkInDate < utcStart(window.endKey) && reservation.checkOutDate > utcStart(window.startKey)) {
        const sold = Math.max(
          0,
          Math.round(
            (Math.min(reservation.checkOutDate, utcStart(window.endKey)) -
              Math.max(reservation.checkInDate, utcStart(window.startKey))) /
              DAY_MS,
          ),
        );
        if (sold === 0) continue;
        const stayNights = Math.max(1, Math.round((reservation.checkOutDate - reservation.checkInDate) / DAY_MS));
        const nightly = reservation.rate > 0 ? reservation.rate : reservation.totalAmount / stayNights;
        stays += 1;
        bumpRoom(reservation, sold, nightly * sold, false);
      }
      addNightRevenue(reservation, window.startKey, window.endKey, days);
    }
    for (const reservation of priorStays.rows) {
      if (!COUNTED.has(reservation.status)) continue;
      addNightRevenue(reservation, window.priorStartKey, window.priorEndKey, priorDays);
    }

    const staffCollected = new Map<string, number>();
    const staffMeta = new Map<string, { name: string; userId?: Id<'users'>; employeeId?: Id<'staffs'> }>();
    const rememberStaff = (key: string, name: string, employeeId?: Id<'staffs'>, userId?: Id<'users'>) => {
      if (!staffMeta.has(key)) staffMeta.set(key, { name, employeeId, userId });
    };

    for (const payment of currentPayments.rows) {
      const key = localDayBounds(payment.paidAt!, timeZone).dateKey;
      const day = days.get(key);
      if (day) day.collected += payment.amount;
      const bucket = payment.createdBy;
      staffCollected.set(bucket, (staffCollected.get(bucket) ?? 0) + payment.amount);
      rememberStaff(bucket, 'Not linked to staff', undefined, payment.createdBy);
    }
    for (const payment of priorPayments.rows) {
      const key = localDayBounds(payment.paidAt!, timeZone).dateKey;
      const day = priorDays.get(key);
      if (day) day.collected += payment.amount;
    }

    const createdRows = await ctx.db
      .query('reservations')
      .withIndex('by_propertyId_and_createdAt', (q) =>
        q
          .eq('propertyId', args.propertyId)
          .gte('createdAt', utcStart(window.startKey) - TZ_PAD_MS)
          .lt('createdAt', utcStart(window.endKey) + TZ_PAD_MS),
      )
      .take(ROW_CAP);
    const staffBooked = new Map<string, { bookings: number; bookingRevenue: number }>();
    const staffMoves = new Map<string, { checkIns: number; checkOuts: number }>();
    const touchMove = (key: string, field: 'checkIns' | 'checkOuts') => {
      const row = staffMoves.get(key) ?? { checkIns: 0, checkOuts: 0 };
      row[field] += 1;
      staffMoves.set(key, row);
    };

    for (const reservation of createdRows) {
      if (!COUNTED.has(reservation.status)) continue;
      if (!dateKeyInRange(reservation.createdAt, timeZone, window.startKey, window.endKey)) continue;
      const key = reservation.bookedByEmployeeId ?? reservation.bookedByUserId ?? 'unassigned';
      const row = staffBooked.get(key) ?? { bookings: 0, bookingRevenue: 0 };
      row.bookings += 1;
      row.bookingRevenue += reservation.totalAmount;
      staffBooked.set(key, row);
      if (reservation.bookedByEmployeeId) {
        rememberStaff(reservation.bookedByEmployeeId, 'Staff', reservation.bookedByEmployeeId);
      } else if (reservation.bookedByUserId) {
        rememberStaff(reservation.bookedByUserId, 'Not linked to staff', undefined, reservation.bookedByUserId);
      } else {
        rememberStaff('unassigned', 'Not linked to staff');
      }
    }

    for (const reservation of currentStays.rows) {
      if (!COUNTED.has(reservation.status)) continue;
      if (dateKeyInRange(reservation.checkedInAt, timeZone, window.startKey, window.endKey)) {
        const key = reservation.checkedInByEmployeeId ?? reservation.checkedInByUserId ?? 'unassigned';
        touchMove(String(key), 'checkIns');
        if (reservation.checkedInByEmployeeId) {
          rememberStaff(reservation.checkedInByEmployeeId, 'Staff', reservation.checkedInByEmployeeId);
        } else if (reservation.checkedInByUserId) {
          rememberStaff(reservation.checkedInByUserId, 'Not linked to staff', undefined, reservation.checkedInByUserId);
        } else rememberStaff('unassigned', 'Not linked to staff');
      }
      if (dateKeyInRange(reservation.checkedOutAt, timeZone, window.startKey, window.endKey)) {
        const key = reservation.checkedOutByEmployeeId ?? reservation.checkedOutByUserId ?? 'unassigned';
        touchMove(String(key), 'checkOuts');
        if (reservation.checkedOutByEmployeeId) {
          rememberStaff(reservation.checkedOutByEmployeeId, 'Staff', reservation.checkedOutByEmployeeId);
        } else if (reservation.checkedOutByUserId) {
          rememberStaff(reservation.checkedOutByUserId, 'Not linked to staff', undefined, reservation.checkedOutByUserId);
        } else rememberStaff('unassigned', 'Not linked to staff');
      }
    }

    const userIds = [...staffMeta.values()].flatMap((row) => (row.userId ? [row.userId] : []));
    const employeeIds = [...staffMeta.values()].flatMap((row) => (row.employeeId ? [row.employeeId] : []));
    const usersStaff = await Promise.all(
      [...new Set(userIds)].map((userId) =>
        ctx.db.query('staffs').withIndex('by_userId', (q) => q.eq('userId', userId)).first(),
      ),
    );
    const employees = await Promise.all([...new Set(employeeIds)].map((id) => ctx.db.get(id)));
    const linkedStaff = usersStaff.filter((row): row is NonNullable<typeof row> => row !== null);
    const employeeIdByUser = new Map(
      linkedStaff.flatMap((row) => (row.userId ? [[row.userId, row._id] as const] : [])),
    );
    const nameByEmployee = new Map(
      employees.filter((row) => row !== null).map((row) => [row._id as string, staffDisplayName(row)]),
    );
    for (const row of linkedStaff) {
      nameByEmployee.set(row._id, staffDisplayName(row));
    }
    const nameByUser = new Map(
      linkedStaff.flatMap((row) => (row.userId ? [[row.userId as string, staffDisplayName(row)] as const] : [])),
    );
    const resolveStaffKey = (key: string) => employeeIdByUser.get(key as Id<'users'>) ?? key;

    const mergedStaff = new Map<string, {
      bookings: number;
      bookingRevenue: number;
      checkIns: number;
      checkOuts: number;
      collected: number;
    }>();
    const addStaff = (
      key: string,
      patch: { bookings?: number; bookingRevenue?: number; checkIns?: number; checkOuts?: number; collected?: number },
    ) => {
      const resolved = String(resolveStaffKey(key));
      const row = mergedStaff.get(resolved) ?? {
        bookings: 0,
        bookingRevenue: 0,
        checkIns: 0,
        checkOuts: 0,
        collected: 0,
      };
      row.bookings += patch.bookings ?? 0;
      row.bookingRevenue += patch.bookingRevenue ?? 0;
      row.checkIns += patch.checkIns ?? 0;
      row.checkOuts += patch.checkOuts ?? 0;
      row.collected += patch.collected ?? 0;
      mergedStaff.set(resolved, row);
    };
    for (const [key, value] of staffBooked) addStaff(key, value);
    for (const [key, value] of staffMoves) addStaff(key, value);
    for (const [key, value] of staffCollected) addStaff(key, { collected: value });

    const staff = [...mergedStaff.entries()]
      .map(([key, value]) => ({
        name: nameByEmployee.get(key) ?? nameByUser.get(key) ?? 'Not linked to staff',
        bookings: value.bookings,
        bookingRevenue: round2(value.bookingRevenue),
        checkIns: value.checkIns,
        checkOuts: value.checkOuts,
        collected: round2(value.collected),
      }))
      .filter((row) => row.bookings > 0 || row.checkIns > 0 || row.checkOuts > 0 || row.collected > 0)
      .sort((a, b) => b.bookingRevenue - a.bookingRevenue || b.collected - a.collected)
      .slice(0, 15);

    const sumDays = (source: Map<string, DayStat>) => {
      let roomRevenue = 0;
      let shortStayRevenue = 0;
      let soldNights = 0;
      let collected = 0;
      for (const day of source.values()) {
        roomRevenue += day.roomRevenue;
        shortStayRevenue += day.shortStayRevenue;
        soldNights += day.soldNights;
        collected += day.collected;
      }
      return { roomRevenue, shortStayRevenue, soldNights, collected };
    };
    const currentTotals = sumDays(days);
    const priorTotals = sumDays(priorDays);
    const nightCount = dates.length;
    const priorNightCount = priorDates.length;
    const available = sellableRooms * nightCount;
    const priorAvailable = sellableRooms * priorNightCount;
    const occupancyRate = available === 0 ? 0 : (currentTotals.soldNights / available) * 100;
    const priorOccupancy = priorAvailable === 0 ? 0 : (priorTotals.soldNights / priorAvailable) * 100;
    const lodgingRevenue = currentTotals.roomRevenue + currentTotals.shortStayRevenue;
    const priorLodging = priorTotals.roomRevenue + priorTotals.shortStayRevenue;

    const bucketKeys =
      args.grain === 'year'
        ? monthKeys(window.startKey, window.endKey)
        : dates;
    const priorBucketKeys =
      args.grain === 'year'
        ? monthKeys(window.priorStartKey, window.priorEndKey)
        : priorDates;

    const roll = (source: Map<string, DayStat>, key: string) => {
      if (args.grain !== 'year') return source.get(key) ?? emptyDay();
      const rolled = emptyDay();
      for (const [dateKey, day] of source) {
        if (!dateKey.startsWith(key)) continue;
        rolled.roomRevenue += day.roomRevenue;
        rolled.shortStayRevenue += day.shortStayRevenue;
        rolled.soldNights += day.soldNights;
        rolled.collected += day.collected;
      }
      return rolled;
    };
    const nightsInBucket = (key: string, sourceDates: string[]) => {
      if (args.grain !== 'year') return 1;
      return sourceDates.filter((dateKey) => dateKey.startsWith(key)).length;
    };

    const maxRevenue = Math.max(
      0,
      ...bucketKeys.map((key) => lodgingOf(roll(days, key))),
    );
    const buckets = bucketKeys.map((key, index) => {
      const current = roll(days, key);
      const priorKey = priorBucketKeys[index];
      const prior = priorKey ? roll(priorDays, priorKey) : emptyDay();
      const bucketNights = nightsInBucket(key, dates);
      const priorBucketNights = priorKey ? nightsInBucket(priorKey, priorDates) : 0;
      const bucketAvailable = sellableRooms * bucketNights;
      const priorBucketAvailable = sellableRooms * priorBucketNights;
      const bucketOccupancy = bucketAvailable === 0 ? 0 : (current.soldNights / bucketAvailable) * 100;
      const priorBucketOccupancy =
        priorBucketAvailable === 0 ? 0 : (prior.soldNights / priorBucketAvailable) * 100;
      const revenue = lodgingOf(current);
      return {
        label: bucketLabel(args.grain, key),
        roomRevenue: round2(current.roomRevenue),
        shortStayRevenue: round2(current.shortStayRevenue),
        lodgingRevenue: round2(revenue),
        collected: round2(current.collected),
        soldNights: current.soldNights,
        occupancyRate: bucketOccupancy,
        adr: current.soldNights === 0 ? 0 : current.roomRevenue / current.soldNights,
        revpar: bucketAvailable === 0 ? 0 : current.roomRevenue / bucketAvailable,
        priorLodgingRevenue: round2(lodgingOf(prior)),
        priorOccupancyRate: priorBucketOccupancy,
        revenueYoy: yoyPercent(revenue, lodgingOf(prior)),
        share: maxRevenue === 0 ? 0 : revenue / maxRevenue,
      };
    });

    const rankedRooms = [...roomStats.entries()]
      .map(([roomId, stat]) => {
        const room = roomById.get(roomId);
        return {
          roomNumber: room?.roomNumber ?? 'Unknown',
          roomType: room ? roomTypeName.get(room.roomTypeId) ?? 'Room type' : 'Room type',
          stays: stat.stays,
          nights: stat.nights,
          shortStays: stat.shortStays,
          revenue: round2(stat.revenue),
        };
      })
      .sort((a, b) => b.revenue - a.revenue || b.stays - a.stays)
      .slice(0, 10);

    const rankedTypes = [...typeStats.entries()]
      .map(([typeId, stat]) => ({
        name: typeId === 'unknown' ? 'Room type' : roomTypeName.get(typeId as Id<'roomTypes'>) ?? 'Room type',
        stays: stat.stays,
        nights: stat.nights,
        shortStays: stat.shortStays,
        revenue: round2(stat.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue || b.stays - a.stays);

    const bestDays = [...days.entries()]
      .map(([dateKey, day]) => ({
        dateKey,
        label: `${WEEKDAYS[(new Date(utcStart(dateKey)).getUTCDay() + 6) % 7]} ${dateKey}`,
        lodgingRevenue: round2(lodgingOf(day)),
        occupancyRate: sellableRooms === 0 ? 0 : (day.soldNights / sellableRooms) * 100,
        soldNights: day.soldNights,
        collected: round2(day.collected),
      }))
      .filter((row) => row.lodgingRevenue > 0 || row.collected > 0 || row.soldNights > 0)
      .sort((a, b) => b.lodgingRevenue - a.lodgingRevenue || b.soldNights - a.soldNights)
      .slice(0, 10);

    const weekdayRows = WEEKDAYS.map((day, index) => {
      let lodgingRevenue = 0;
      let soldNights = 0;
      let occurrences = 0;
      for (const dateKey of dates) {
        if ((new Date(utcStart(dateKey)).getUTCDay() + 6) % 7 !== index) continue;
        occurrences += 1;
        const stat = days.get(dateKey) ?? emptyDay();
        lodgingRevenue += lodgingOf(stat);
        soldNights += stat.soldNights;
      }
      const availableNights = sellableRooms * occurrences;
      return {
        day,
        occurrences,
        lodgingRevenue: round2(lodgingRevenue),
        averageRevenue: occurrences === 0 ? 0 : lodgingRevenue / occurrences,
        occupancyRate: availableNights === 0 ? 0 : (soldNights / availableNights) * 100,
        soldNights,
      };
    }).filter((row) => row.occurrences > 0);

    const bestWeekday = weekdayRows.reduce<(typeof weekdayRows)[number] | null>((best, row) => {
      if (!best || row.averageRevenue > best.averageRevenue) return row;
      return best;
    }, null);

    const nearDates = [0, -1, -2, -3].map((offset) => addDateKey(anchor, offset));
    const nearShifts: Doc<'shifts'>[] = [];
    for (const shiftDate of nearDates) {
      const batch = await ctx.db
        .query('shifts')
        .withIndex('by_propertyId_date', (q) =>
          q.eq('propertyId', args.propertyId).eq('shiftDate', shiftDate),
        )
        .take(100);
      for (const shift of batch) {
        if (shift.department === 'front-office') nearShifts.push(shift);
      }
    }
    const closedShifts = nearShifts.filter(
      (shift) => shift.isFinalized && closeDateKey(shift, timeZone) === anchor,
    );
    const openCount = nearShifts.filter((shift) => !shift.isFinalized).length;

    const closed = [];
    let shiftTruncated = false;
    for (const shift of closedShifts) {
      const linked = await reservationsOnShift(ctx, shift._id);
      if (linked.truncated) shiftTruncated = true;
      const counted = linked.rows.filter((row) => COUNTED.has(row.status));
      const booked = counted.filter((row) => row.bookedShiftId === shift._id);
      let bookingRevenue = 0;
      let overnightBookings = 0;
      let shortStayBookings = 0;
      for (const row of booked) {
        bookingRevenue += row.totalAmount;
        if (isShortStay(row)) shortStayBookings += 1;
        else overnightBookings += 1;
      }
      const collected = await collectionsForShift(ctx, shift, timeZone);
      const staffDoc = shift.employeeId ? await ctx.db.get(shift.employeeId) : null;
      const byUser = !staffDoc && shift.userId
        ? await ctx.db.query('staffs').withIndex('by_userId', (q) => q.eq('userId', shift.userId)).first()
        : null;
      closed.push({
        shiftId: shift._id,
        staffName: staffDisplayName(staffDoc ?? byUser),
        shiftDate: shift.shiftDate,
        startTime: shift.startTime,
        endTime: shift.endTime ?? null,
        bookings: booked.length,
        overnightBookings,
        shortStayBookings,
        bookingRevenue: round2(bookingRevenue),
        checkIns: counted.filter((row) => row.checkedInShiftId === shift._id).length,
        checkOuts: counted.filter((row) => row.checkedOutShiftId === shift._id).length,
        collected: round2(collected.total),
        cash: round2(collected.cash),
        card: round2(collected.card),
        transfer: round2(collected.transfer),
        other: round2(collected.other),
      });
    }
    closed.sort((a, b) => a.staffName.localeCompare(b.staffName));

    const truncated =
      currentStays.truncated ||
      priorStays.truncated ||
      currentPayments.truncated ||
      priorPayments.truncated ||
      createdRows.length >= ROW_CAP ||
      rooms.length >= 2000 ||
      shiftTruncated;

    return {
      success: true as const,
      data: {
        today,
        timeZone,
        currency: property.currency ?? 'USD',
        anchor,
        grain: args.grain,
        periodLabel: periodLabel(window.startKey, window.endKey),
        priorPeriodLabel: periodLabel(window.priorStartKey, window.priorEndKey),
        capped: window.capped,
        truncated,
        sellableRooms,
        totals: {
          roomRevenue: round2(currentTotals.roomRevenue),
          shortStayRevenue: round2(currentTotals.shortStayRevenue),
          lodgingRevenue: round2(lodgingRevenue),
          collected: round2(currentTotals.collected),
          soldNights: currentTotals.soldNights,
          stays,
          shortStays,
          occupancyRate,
          adr: currentTotals.soldNights === 0 ? 0 : currentTotals.roomRevenue / currentTotals.soldNights,
          revpar: available === 0 ? 0 : currentTotals.roomRevenue / available,
          priorLodgingRevenue: round2(priorLodging),
          priorCollected: round2(priorTotals.collected),
          priorOccupancyRate: priorOccupancy,
          revenueYoy: yoyPercent(lodgingRevenue, priorLodging),
          collectedYoy: yoyPercent(currentTotals.collected, priorTotals.collected),
          occupancyYoyPoints: occupancyRate - priorOccupancy,
        },
        buckets,
        rooms: rankedRooms,
        roomTypes: rankedTypes,
        days: bestDays,
        weekdays: weekdayRows.map((row) => ({
          day: row.day,
          occurrences: row.occurrences,
          averageRevenue: round2(row.averageRevenue),
          lodgingRevenue: row.lodgingRevenue,
          occupancyRate: row.occupancyRate,
          soldNights: row.soldNights,
        })),
        bestWeekday: bestWeekday && bestWeekday.averageRevenue > 0 ? bestWeekday.day : null,
        staff,
        shifts: {
          openCount,
          closed,
          collected: round2(closed.reduce((sum, row) => sum + row.collected, 0)),
          bookingRevenue: round2(closed.reduce((sum, row) => sum + row.bookingRevenue, 0)),
        },
      },
    };
  },
});

function monthKeys(startKey: string, endKey: string): string[] {
  const last = addDateKey(endKey, -1);
  if (last < startKey) return [];
  const keys: string[] = [];
  let year = Number(startKey.slice(0, 4));
  let month = Number(startKey.slice(5, 7));
  const endMonth = last.slice(0, 7);
  while (keys.length < 24) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    keys.push(key);
    if (key >= endMonth) break;
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return keys;
}

function closeDateKey(shift: Doc<'shifts'>, timeZone: string): string {
  if (shift.clockOutAt) return localDayBounds(shift.clockOutAt, timeZone).dateKey;
  return shift.shiftDate;
}

async function reservationsOnShift(ctx: QueryCtx, shiftId: Id<'shifts'>) {
  const [booked, checkedIn, checkedOut] = await Promise.all([
    ctx.db
      .query('reservations')
      .withIndex('by_bookedShiftId', (q) => q.eq('bookedShiftId', shiftId))
      .take(SHIFT_LINK_CAP),
    ctx.db
      .query('reservations')
      .withIndex('by_checkedInShiftId', (q) => q.eq('checkedInShiftId', shiftId))
      .take(SHIFT_LINK_CAP),
    ctx.db
      .query('reservations')
      .withIndex('by_checkedOutShiftId', (q) => q.eq('checkedOutShiftId', shiftId))
      .take(SHIFT_LINK_CAP),
  ]);
  const byId = new Map<Id<'reservations'>, Doc<'reservations'>>();
  for (const row of [...booked, ...checkedIn, ...checkedOut]) byId.set(row._id, row);
  return {
    rows: [...byId.values()],
    truncated:
      booked.length >= SHIFT_LINK_CAP ||
      checkedIn.length >= SHIFT_LINK_CAP ||
      checkedOut.length >= SHIFT_LINK_CAP,
  };
}

async function collectionsForShift(ctx: QueryCtx, shift: Doc<'shifts'>, timeZone: string) {
  const empty = { total: 0, cash: 0, card: 0, transfer: 0, other: 0 };
  if (!shift.userId) return empty;
  const bounds = shift.clockInAt != null && shift.clockOutAt != null
    ? { start: shift.clockInAt, end: shift.clockOutAt + 1, dateKey: null as string | null }
    : {
        start: utcStart(shift.shiftDate) - TZ_PAD_MS,
        end: utcStart(addDateKey(shift.shiftDate, 1)) + TZ_PAD_MS,
        dateKey: shift.shiftDate,
      };
  const rows = await ctx.db
    .query('payments')
    .withIndex('by_propertyId_and_paidAt', (q) =>
      q.eq('propertyId', shift.propertyId).gte('paidAt', bounds.start).lt('paidAt', bounds.end),
    )
    .take(ROW_CAP);
  const totals = { ...empty };
  for (const row of rows) {
    if (row.paymentType !== 'reservation' || row.status !== 'completed' || row.createdBy !== shift.userId) {
      continue;
    }
    if (row.paidAt == null) continue;
    if (bounds.dateKey && localDayBounds(row.paidAt, timeZone).dateKey !== bounds.dateKey) continue;
    if (bounds.dateKey == null && (row.paidAt < shift.clockInAt! || row.paidAt > shift.clockOutAt!)) continue;
    totals.total += row.amount;
    if (row.paymentMethod === 'cash') totals.cash += row.amount;
    else if (row.paymentMethod === 'card') totals.card += row.amount;
    else if (row.paymentMethod === 'bank_transfer') totals.transfer += row.amount;
    else totals.other += row.amount;
  }
  return totals;
}
