import { MutationCtx, QueryCtx } from '../_generated/server';
import { Doc, Id } from '../_generated/dataModel';

export const SHORT_STAY_HOURS = [1, 2, 3, 4, 5, 6, 7] as const;
export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
export const MAY_EXTEND_LEAD_DAYS = 7;

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

/** Nights a date-only overnight booking holds: check-in inclusive, check-out exclusive. */
export function overnightReservedDateKeys(checkInDate: number, checkOutDate: number): Set<string> {
  const keys = new Set<string>();
  let cursor = Date.UTC(
    new Date(checkInDate).getUTCFullYear(),
    new Date(checkInDate).getUTCMonth(),
    new Date(checkInDate).getUTCDate(),
  );
  let guard = 0;
  while (cursor < checkOutDate && guard < 800) {
    keys.add(utcDateKey(cursor));
    cursor += DAY_MS;
    guard += 1;
  }
  return keys;
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

export function overnightBlocksShortStay(overnight: StayRow, shortStart: number, shortEnd: number): boolean {
  if (stayKindOf(overnight) === 'short') return false;
  if (overnight.status !== 'pending' && overnight.status !== 'confirmed' && overnight.status !== 'checked-in') {
    return false;
  }
  const reserved = overnightReservedDateKeys(overnight.checkInDate, overnight.checkOutDate);
  if (overnight.status === 'checked-in') {
    reserved.add(utcDateKey(overnight.checkOutDate));
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
