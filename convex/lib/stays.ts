import { MutationCtx, QueryCtx } from '../_generated/server';
import { Doc, Id } from '../_generated/dataModel';
import { localDayBounds } from './billingPeriods';
import { zonedWallTimeToUtc } from './rotation';

export const SHORT_STAY_HOURS = [1, 2, 3, 4, 5, 6, 7] as const;
export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
export const MAY_EXTEND_LEAD_DAYS = 7;
/** Overnight departure time in the property timezone. */
export const OVERNIGHT_CHECKOUT_CLOCK = '12:00';

export type StayKind = 'overnight' | 'short';
export type RetainerFollowUp = 'not-contacted' | 'contacted' | 'extending' | 'departing';

type StayRow = {
  stayKind?: StayKind;
  status: string;
  checkInDate: number;
  checkOutDate: number;
};

export function stayKindOf(row: { stayKind?: StayKind | string }): StayKind {
  return row.stayKind === 'short' ? 'short' : 'overnight';
}

export function isShortStay(row: { stayKind?: StayKind | string }): boolean {
  return row.stayKind === 'short';
}

export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function utcDateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function reminderDaysOf(property: { retainerReminderDays?: number } | null): number {
  const days = property?.retainerReminderDays;
  if (days === undefined || days === null || Number.isNaN(days)) return 1;
  return Math.min(7, Math.max(0, Math.floor(days)));
}

/** UTC midnight marks a date-only value. Noon checkout is a real local time and is not midnight. */
export function isUtcMidnight(ms: number): boolean {
  return Number.isFinite(ms) && ms % DAY_MS === 0;
}

/**
 * Calendar date for an overnight endpoint.
 * Date-only values stay on the UTC date the desk picked. A 12:00 checkout uses the property-local date.
 */
export function stayCalendarKey(ms: number, timeZone: string): string {
  if (isUtcMidnight(ms)) return utcDateKey(ms);
  return localDayBounds(ms, timeZone).dateKey;
}

/** 12:00 PM in the property timezone on the checkout calendar date. */
export function overnightCheckoutInstant(ms: number, timeZone: string): number {
  const dateKey = stayCalendarKey(ms, timeZone);
  return zonedWallTimeToUtc(`${dateKey}T${OVERNIGHT_CHECKOUT_CLOCK}`, timeZone) ?? ms;
}

/** Move an overnight checkout forward by whole nights, still at 12:00 PM local. */
export function overnightCheckoutAfterNights(checkOutMs: number, extraNights: number, timeZone: string): number {
  const dateKey = addDateKey(stayCalendarKey(checkOutMs, timeZone), extraNights);
  return zonedWallTimeToUtc(`${dateKey}T${OVERNIGHT_CHECKOUT_CLOCK}`, timeZone) ?? checkOutMs + extraNights * DAY_MS;
}

/** Nights held by an overnight booking: arrival date inclusive, departure date exclusive. */
export function eachOvernightNightKey(checkInMs: number, checkOutMs: number, timeZone: string): string[] {
  const end = stayCalendarKey(checkOutMs, timeZone);
  const keys: string[] = [];
  let cursor = stayCalendarKey(checkInMs, timeZone);
  let guard = 0;
  while (cursor < end && guard < 800) {
    keys.push(cursor);
    cursor = addDateKey(cursor, 1);
    guard += 1;
  }
  return keys;
}

export function overnightNightCount(checkInMs: number, checkOutMs: number, timeZone: string): number {
  return eachOvernightNightKey(checkInMs, checkOutMs, timeZone).length;
}

export function dateKeySpan(startKey: string, endKey: string): number {
  const [y1, m1, d1] = startKey.split('-').map(Number);
  const [y2, m2, d2] = endKey.split('-').map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0;
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DAY_MS);
}

/** Overnight stays share a room when their nights overlap. Departure morning does not block the next night. */
export function overnightNightsOverlap(
  aIn: number,
  aOut: number,
  bIn: number,
  bOut: number,
  timeZone: string,
): boolean {
  const aStart = stayCalendarKey(aIn, timeZone);
  const aEnd = stayCalendarKey(aOut, timeZone);
  const bStart = stayCalendarKey(bIn, timeZone);
  const bEnd = stayCalendarKey(bOut, timeZone);
  return aStart < bEnd && bStart < aEnd;
}

export function overnightReservedDateKeys(checkInDate: number, checkOutDate: number, timeZone = 'UTC'): Set<string> {
  return new Set(eachOvernightNightKey(checkInDate, checkOutDate, timeZone));
}

/** Calendar days a short stay touches, including a visit that crosses midnight. */
export function shortStayDateKeys(checkInDate: number, checkOutDate: number): Set<string> {
  const keys = new Set<string>();
  keys.add(utcDateKey(checkInDate));
  if (checkOutDate > checkInDate) {
    keys.add(utcDateKey(checkOutDate - 1));
  }
  return keys;
}

export function overnightBlocksShortStay(
  overnight: StayRow,
  shortStart: number,
  shortEnd: number,
  timeZone = 'UTC',
): boolean {
  if (stayKindOf(overnight) === 'short') return false;
  if (overnight.status !== 'pending' && overnight.status !== 'confirmed' && overnight.status !== 'checked-in') {
    return false;
  }
  const reserved = overnightReservedDateKeys(overnight.checkInDate, overnight.checkOutDate, timeZone);
  if (overnight.status === 'checked-in') {
    reserved.add(stayCalendarKey(overnight.checkOutDate, timeZone));
  }
  const visiting = shortStayDateKeys(shortStart, shortEnd);
  for (const day of visiting) {
    if (reserved.has(day)) return true;
  }
  return false;
}

export function normalizeShortStayPrices(
  prices: Array<{ hours: number; amount: number }>,
): { hours: number; amount: number }[] | string {
  const seen = new Set<number>();
  const kept: { hours: number; amount: number }[] = [];
  for (const price of prices) {
    if (!Number.isInteger(price.hours) || price.hours < 1 || price.hours > 7) {
      return 'Short stay length must be from 1 to 7 hours';
    }
    if (seen.has(price.hours)) {
      return 'Each short stay length can have only one price';
    }
    seen.add(price.hours);
    if (!Number.isFinite(price.amount) || price.amount < 0) {
      return 'Short stay price cannot be negative';
    }
    if (price.amount > 0) {
      kept.push({ hours: price.hours, amount: price.amount });
    }
  }
  return kept;
}

export async function replaceShortStayRates(
  ctx: MutationCtx,
  args: {
    propertyId: Id<'properties'>;
    roomTypeId: Id<'roomTypes'>;
    prices: Array<{ hours: number; amount: number }>;
  },
): Promise<string | null> {
  const normalized = normalizeShortStayPrices(args.prices);
  if (typeof normalized === 'string') return normalized;

  const existing = await ctx.db
    .query('shortStayRates')
    .withIndex('by_roomTypeId', (q) => q.eq('roomTypeId', args.roomTypeId))
    .collect();
  for (const row of existing) {
    await ctx.db.delete(row._id);
  }

  const now = Date.now();
  for (const price of normalized) {
    await ctx.db.insert('shortStayRates', {
      propertyId: args.propertyId,
      roomTypeId: args.roomTypeId,
      hours: price.hours,
      amount: price.amount,
      createdAt: now,
      updatedAt: now,
    });
  }
  return null;
}

export async function shortStayRateFor(
  ctx: QueryCtx | MutationCtx,
  roomTypeId: Id<'roomTypes'>,
  hours: number,
): Promise<Doc<'shortStayRates'> | null> {
  return await ctx.db
    .query('shortStayRates')
    .withIndex('by_roomTypeId_and_hours', (q) => q.eq('roomTypeId', roomTypeId).eq('hours', hours))
    .unique();
}

export async function roomHasOpenCheckoutClean(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<'rooms'>,
): Promise<boolean> {
  for (const status of ['pending', 'in-progress'] as const) {
    const task = await ctx.db
      .query('housekeepingTasks')
      .withIndex('by_roomId_taskType_status', (q) =>
        q.eq('roomId', roomId).eq('taskType', 'checkout').eq('status', status),
      )
      .first();
    if (task) return true;
  }
  return false;
}
