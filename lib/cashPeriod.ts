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

export function cashPeriodBounds(
  now: number,
  kind: CashPeriodKind,
  timeZone: string,
): { start: number; end: number } {
  const { y, m, d } = ymdInZone(now, timeZone || "UTC");
  if (kind === "day") {
    const start = Date.UTC(y, m - 1, d);
    return { start, end: start + 24 * 60 * 60 * 1000 };
  }
  if (kind === "week") {
    const date = new Date(Date.UTC(y, m - 1, d));
    const daysFromMonday = (date.getUTCDay() + 6) % 7;
    const start = Date.UTC(y, m - 1, d - daysFromMonday);
    return { start, end: start + 7 * 24 * 60 * 60 * 1000 };
  }
  if (kind === "month") {
    return { start: Date.UTC(y, m - 1, 1), end: Date.UTC(y, m, 1) };
  }
  return { start: Date.UTC(y, 0, 1), end: Date.UTC(y + 1, 0, 1) };
}

export function shiftCashPeriodAnchor(
  now: number,
  kind: CashPeriodKind,
  timeZone: string,
  delta: number,
): number {
  const { start, end } = cashPeriodBounds(now, kind, timeZone);
  return delta < 0 ? start - 1 : end;
}

export function cashPeriodLabel(
  now: number,
  kind: CashPeriodKind,
  timeZone: string,
): string {
  const { start, end } = cashPeriodBounds(now, kind, timeZone);
  const startDate = new Date(start);
  const endDate = new Date(end - 1);
  if (kind === "day") {
    return startDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }
  if (kind === "week") {
    return `${startDate.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${endDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
  }
  if (kind === "month") {
    return startDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  return String(startDate.getUTCFullYear());
}
