export const CASH_PERIOD_KINDS = ["day", "week", "month", "year"] as const;
export type CashPeriodKind = (typeof CASH_PERIOD_KINDS)[number];

function ymdInZone(now: number, timeZone: string): { y: number; m: number; d: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(new Date(now));
    const y = Number(parts.find((part) => part.type === "year")?.value);
    const m = Number(parts.find((part) => part.type === "month")?.value);
    const d = Number(parts.find((part) => part.type === "day")?.value);
    if (y && m && d) {
      return { y, m, d };
    }
  } catch {
    // Invalid IANA timezone — fall through to UTC.
  }
  const date = new Date(now);
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

/** Milliseconds to add to UTC to get this timezone's wall clock. */
function timeZoneOffsetMs(instant: number, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hourCycle: "h23",
    }).formatToParts(new Date(instant));
    const pick = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value);
    const asUtc = Date.UTC(
      pick("year"),
      pick("month") - 1,
      pick("day"),
      pick("hour"),
      pick("minute"),
      pick("second"),
    );
    if ([pick("year"), pick("month"), pick("day")].every((value) => Number.isFinite(value) && value)) {
      return asUtc - instant;
    }
  } catch {
    // Invalid IANA timezone.
  }
  return 0;
}

/** UTC instant of local midnight on this calendar date. */
function zonedMidnightUtc(y: number, m: number, d: number, timeZone: string): number {
  const utcMidnight = Date.UTC(y, m - 1, d);
  const offset = timeZoneOffsetMs(utcMidnight, timeZone);
  const midnight = utcMidnight - offset;
  const offsetAtMidnight = timeZoneOffsetMs(midnight, timeZone);
  return offsetAtMidnight === offset ? midnight : utcMidnight - offsetAtMidnight;
}

function shiftCalendarDate(
  y: number,
  m: number,
  d: number,
  kind: CashPeriodKind,
  delta: number,
): { y: number; m: number; d: number } {
  if (kind === "month") {
    const date = new Date(Date.UTC(y, m - 1 + delta, 1));
    return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: 1 };
  }
  if (kind === "year") {
    return { y: y + delta, m: 1, d: 1 };
  }
  const days = kind === "week" ? delta * 7 : delta;
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

function periodStartDate(y: number, m: number, d: number, kind: CashPeriodKind) {
  if (kind === "week") {
    const date = new Date(Date.UTC(y, m - 1, d));
    const daysFromMonday = (date.getUTCDay() + 6) % 7;
    return shiftCalendarDate(y, m, d, "day", -daysFromMonday);
  }
  if (kind === "month") return { y, m, d: 1 };
  if (kind === "year") return { y, m: 1, d: 1 };
  return { y, m, d };
}

export function cashPeriodBounds(
  now: number,
  kind: CashPeriodKind,
  timeZone: string,
): { start: number; end: number } {
  const zone = timeZone || "UTC";
  const { y, m, d } = ymdInZone(now, zone);
  const startDate = periodStartDate(y, m, d, kind);
  const endDate = shiftCalendarDate(startDate.y, startDate.m, startDate.d, kind, 1);
  return {
    start: zonedMidnightUtc(startDate.y, startDate.m, startDate.d, zone),
    end: zonedMidnightUtc(endDate.y, endDate.m, endDate.d, zone),
  };
}

export function shiftCashPeriodAnchor(
  now: number,
  kind: CashPeriodKind,
  timeZone: string,
  delta: number,
): number {
  const zone = timeZone || "UTC";
  const { y, m, d } = ymdInZone(now, zone);
  const startDate = periodStartDate(y, m, d, kind);
  const shifted = shiftCalendarDate(startDate.y, startDate.m, startDate.d, kind, delta);
  // Midday stays inside the target calendar day across timezone offsets.
  return zonedMidnightUtc(shifted.y, shifted.m, shifted.d, zone) + 12 * 60 * 60 * 1000;
}

export function cashPeriodLabel(
  now: number,
  kind: CashPeriodKind,
  timeZone: string,
): string {
  const zone = timeZone || "UTC";
  const { start, end } = cashPeriodBounds(now, kind, zone);
  const dateOptions = { timeZone: zone } as const;
  const startDate = new Date(start);
  const endDate = new Date(end - 1);
  if (kind === "day") {
    return startDate.toLocaleDateString(undefined, { ...dateOptions, day: "numeric", month: "short", year: "numeric" });
  }
  if (kind === "week") {
    return `${startDate.toLocaleDateString(undefined, { ...dateOptions, day: "numeric", month: "short" })} – ${endDate.toLocaleDateString(undefined, { ...dateOptions, day: "numeric", month: "short", year: "numeric" })}`;
  }
  if (kind === "month") {
    return startDate.toLocaleDateString(undefined, { ...dateOptions, month: "long", year: "numeric" });
  }
  return String(ymdInZone(start, zone).y);
}
