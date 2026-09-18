import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { propertyTimeZone } from "./billingPeriods";
import { clockOnWorkDate, utcDayFromIsoDate } from "./payrollHelpers";

type DbCtx = MutationCtx | QueryCtx;

export const DEFAULT_PUNCTUALITY_GRACE_MINUTES = 5;

export const PUNCTUALITY_STATUSES = ["on_time", "late", "unscheduled"] as const;
export type PunctualityStatus = (typeof PUNCTUALITY_STATUSES)[number];

export type PunctualitySnapshot = {
  expectedStart?: string;
  expectedEnd?: string;
  clockStartLocal: string;
  minutesLate: number;
  punctualityStatus: PunctualityStatus;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string) {
  return ISO_DATE.test(value);
}

export function minutesFromHHmm(value?: string): number | null {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || hours < 0 || hours > 23) return null;
  const mins = Number.isNaN(minutes) ? 0 : minutes;
  if (mins < 0 || mins > 59) return null;
  return hours * 60 + mins;
}

export function hhmmInTimeZone(atMs: number, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timeZone || "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(atMs));
    const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  } catch {
    const date = new Date(atMs);
    return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
  }
}

export function utcHHmmToLocal(shiftDate: string, utcHHmm: string, timeZone: string): string {
  const utcMs = clockOnWorkDate(utcDayFromIsoDate(shiftDate), utcHHmm);
  if (!utcMs) return utcHHmm;
  return hhmmInTimeZone(utcMs, timeZone);
}

export function classifyArrival(
  expectedStart: string | undefined,
  actualLocal: string,
  graceMinutes: number,
): { minutesLate: number; punctualityStatus: PunctualityStatus } {
  const expected = minutesFromHHmm(expectedStart);
  const actual = minutesFromHHmm(actualLocal);
  if (expected == null || actual == null) {
    return { minutesLate: 0, punctualityStatus: "unscheduled" };
  }
  let diff = actual - expected;
  if (diff < -12 * 60) diff += 24 * 60;
  if (diff > 12 * 60) diff -= 24 * 60;
  const minutesLate = Math.max(0, diff);
  const grace = Number.isFinite(graceMinutes) ? Math.max(0, graceMinutes) : DEFAULT_PUNCTUALITY_GRACE_MINUTES;
  return {
    minutesLate,
    punctualityStatus: minutesLate > grace ? "late" : "on_time",
  };
}

export function snapshotPunctuality(args: {
  expectedStart?: string;
  expectedEnd?: string;
  actualLocal: string;
  graceMinutes?: number;
}): PunctualitySnapshot {
  const classified = classifyArrival(
    args.expectedStart,
    args.actualLocal,
    args.graceMinutes ?? DEFAULT_PUNCTUALITY_GRACE_MINUTES,
  );
  return {
    expectedStart: args.expectedStart,
    expectedEnd: args.expectedEnd,
    clockStartLocal: args.actualLocal,
    minutesLate: classified.minutesLate,
    punctualityStatus: classified.punctualityStatus,
  };
}

export function punctualityInsertFields(snapshot: PunctualitySnapshot) {
  return {
    clockStartLocal: snapshot.clockStartLocal,
    minutesLate: snapshot.minutesLate,
    punctualityStatus: snapshot.punctualityStatus,
    ...(snapshot.expectedStart ? { expectedStart: snapshot.expectedStart } : {}),
    ...(snapshot.expectedEnd ? { expectedEnd: snapshot.expectedEnd } : {}),
  };
}

export function graceMinutesFromSettings(settings: Doc<"payrollSettings"> | null | undefined) {
  const value = settings?.punctualityGraceMinutes;
  if (value == null || !Number.isFinite(value) || value < 0) {
    return DEFAULT_PUNCTUALITY_GRACE_MINUTES;
  }
  return value;
}

export async function loadGraceMinutes(ctx: DbCtx, propertyId: Id<"properties">) {
  const settings = await ctx.db
    .query("payrollSettings")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
    .first();
  return graceMinutesFromSettings(settings);
}

export async function loadPropertyTimeZone(ctx: DbCtx, propertyId: Id<"properties">) {
  const property = await ctx.db.get(propertyId);
  return propertyTimeZone(property);
}

export async function punctualityFieldsForClock(ctx: DbCtx, args: {
  propertyId: Id<"properties">;
  expectedStart?: string;
  expectedEnd?: string;
  actualLocal?: string;
  now?: number;
}) {
  const [graceMinutes, timeZone] = await Promise.all([
    loadGraceMinutes(ctx, args.propertyId),
    args.actualLocal ? Promise.resolve("UTC") : loadPropertyTimeZone(ctx, args.propertyId),
  ]);
  const actualLocal = args.actualLocal ?? hhmmInTimeZone(args.now ?? Date.now(), timeZone);
  return snapshotPunctuality({
    expectedStart: args.expectedStart,
    expectedEnd: args.expectedEnd,
    actualLocal,
    graceMinutes,
  });
}

export function resolveShiftPunctuality(
  shift: Doc<"shifts">,
  template: Doc<"shiftTemplates"> | null | undefined,
  graceMinutes: number,
  timeZone: string,
): PunctualitySnapshot & { shiftDate: string } {
  if (shift.punctualityStatus && shift.clockStartLocal) {
    return {
      shiftDate: shift.shiftDate,
      expectedStart: shift.expectedStart,
      expectedEnd: shift.expectedEnd,
      clockStartLocal: shift.clockStartLocal,
      minutesLate: shift.minutesLate ?? 0,
      punctualityStatus: shift.punctualityStatus,
    };
  }
  const expectedStart = shift.expectedStart ?? template?.startTime;
  const expectedEnd = shift.expectedEnd ?? template?.endTime;
  const actualLocal =
    shift.clockStartLocal ?? utcHHmmToLocal(shift.shiftDate, shift.startTime, timeZone);
  const snapshot = snapshotPunctuality({
    expectedStart,
    expectedEnd,
    actualLocal,
    graceMinutes,
  });
  return { shiftDate: shift.shiftDate, ...snapshot };
}

export type PunctualityDay = {
  shiftId: Id<"shifts">;
  shiftDate: string;
  expectedStart?: string;
  expectedEnd?: string;
  clockStartLocal: string;
  minutesLate: number;
  punctualityStatus: PunctualityStatus;
};

export type PunctualitySummary = {
  daysWorked: number;
  daysOnTime: number;
  daysLate: number;
  daysUnscheduled: number;
  onTimePercent: number | null;
  averageMinutesLate: number | null;
};

export function summarizePunctuality(days: Array<{ punctualityStatus: PunctualityStatus; minutesLate: number }>): PunctualitySummary {
  const daysWorked = days.length;
  const daysOnTime = days.filter((day) => day.punctualityStatus === "on_time").length;
  const daysLate = days.filter((day) => day.punctualityStatus === "late").length;
  const daysUnscheduled = days.filter((day) => day.punctualityStatus === "unscheduled").length;
  const scored = daysOnTime + daysLate;
  const scoredDays = days.filter((day) => day.punctualityStatus !== "unscheduled");
  const lateTotal = scoredDays.reduce((sum, day) => sum + day.minutesLate, 0);
  return {
    daysWorked,
    daysOnTime,
    daysLate,
    daysUnscheduled,
    onTimePercent: scored === 0 ? null : Math.round((daysOnTime / scored) * 1000) / 10,
    averageMinutesLate: scoredDays.length === 0 ? null : Math.round((lateTotal / scoredDays.length) * 10) / 10,
  };
}
