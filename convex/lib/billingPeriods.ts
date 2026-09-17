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

export function currentPeriodBounds(
  now: number,
  frequency: Frequency,
  timeZone: string,
): { periodStart: number; periodEnd: number; dueDate: number } {
  const { y, m, d } = ymdInZone(now, timeZone || "UTC");
  if (frequency === "weekly") {
    const date = new Date(Date.UTC(y, m - 1, d));
    const daysFromMonday = (date.getUTCDay() + 6) % 7;
    const periodStart = Date.UTC(y, m - 1, d - daysFromMonday);
    const periodEnd = periodStart + 7 * 24 * 60 * 60 * 1000 - 1;
    return { periodStart, periodEnd, dueDate: periodEnd };
  }
  if (frequency === "monthly") {
    const periodStart = Date.UTC(y, m - 1, 1);
    const periodEnd = Date.UTC(y, m, 1) - 1;
    return { periodStart, periodEnd, dueDate: periodEnd };
  }
  const periodStart = Date.UTC(y, 0, 1);
  const periodEnd = Date.UTC(y + 1, 0, 1) - 1;
  return { periodStart, periodEnd, dueDate: periodEnd };
}

export function weekWindow(now: number, timeZone: string) {
  return currentPeriodBounds(now, "weekly", timeZone);
}

export function propertyTimeZone(property: Doc<"properties"> | null): string {
  return property?.timezone?.trim() || "UTC";
}
