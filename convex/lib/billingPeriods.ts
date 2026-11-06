import { Doc } from "../_generated/dataModel";

export const BILL_TYPES = [
  "electricity",
  "water",
  "gas",
  "internet",
  "cable",
  "waste",
  "local_government",
  "other",
] as const;

export const FREQUENCIES = ["weekly", "monthly", "annually"] as const;

export type BillType = (typeof BILL_TYPES)[number];
export type Frequency = (typeof FREQUENCIES)[number];

export function expenseCategoryForBillType(
  billType: BillType,
): "utilities" | "other" {
  if (billType === "local_government" || billType === "other") {
    return "other";
  }
  return "utilities";
}

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

const DAY_MS = 24 * 60 * 60 * 1000;

function lastUtcDay(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Due date inside the current calendar period, taken from the chosen cycle date. */
export function dueDateForCycle(
  periodStart: number,
  frequency: Frequency,
  cycleDate: number,
): number {
  const cycle = new Date(cycleDate);
  const start = new Date(periodStart);
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth() + 1;
  if (frequency === "weekly") {
    const daysFromMonday = (cycle.getUTCDay() + 6) % 7;
    return periodStart + daysFromMonday * DAY_MS;
  }
  if (frequency === "monthly") {
    const day = Math.min(cycle.getUTCDate(), lastUtcDay(year, month));
    return Date.UTC(year, month - 1, day);
  }
  const cycleMonth = cycle.getUTCMonth() + 1;
  const day = Math.min(cycle.getUTCDate(), lastUtcDay(year, cycleMonth));
  return Date.UTC(year, cycleMonth - 1, day);
}

export function currentPeriodBounds(
  now: number,
  frequency: Frequency,
  timeZone: string,
  cycleDate?: number,
): { periodStart: number; periodEnd: number; dueDate: number } {
  const { y, m, d } = ymdInZone(now, timeZone || "UTC");
  let periodStart: number;
  let periodEnd: number;
  if (frequency === "weekly") {
    const date = new Date(Date.UTC(y, m - 1, d));
    const daysFromMonday = (date.getUTCDay() + 6) % 7;
    periodStart = Date.UTC(y, m - 1, d - daysFromMonday);
    periodEnd = periodStart + 7 * DAY_MS - 1;
  } else if (frequency === "monthly") {
    periodStart = Date.UTC(y, m - 1, 1);
    periodEnd = Date.UTC(y, m, 1) - 1;
  } else {
    periodStart = Date.UTC(y, 0, 1);
    periodEnd = Date.UTC(y + 1, 0, 1) - 1;
  }
  const dueDate =
    cycleDate != null && Number.isFinite(cycleDate)
      ? dueDateForCycle(periodStart, frequency, cycleDate)
      : periodEnd;
  return { periodStart, periodEnd, dueDate };
}

export function weekWindow(now: number, timeZone: string) {
  return currentPeriodBounds(now, "weekly", timeZone);
}

export function propertyTimeZone(property: Doc<"properties"> | null): string {
  return property?.timezone?.trim() || "UTC";
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

export function localDayBounds(
  now: number,
  timeZone: string,
): { start: number; end: number; dateKey: string } {
  const { y, m, d } = ymdInZone(now, timeZone || "UTC");
  const start = Date.UTC(y, m - 1, d);
  const end = Date.UTC(y, m - 1, d + 1) - 1;
  return { start, end, dateKey: `${y}-${pad2(m)}-${pad2(d)}` };
}
