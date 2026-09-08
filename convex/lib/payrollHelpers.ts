import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";
import {
  calculateNgPaye,
  periodsPerYear,
  resolveJurisdictionPack,
  roundMoney,
  type PayFrequency,
} from "./payrollPacks";

export function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function addUtcDays(ms: number, days: number): number {
  return ms + days * 24 * 60 * 60 * 1000;
}

export function workingDaysInclusive(startMs: number, endMs: number): number {
  let count = 0;
  for (let t = startOfUtcDay(startMs); t <= startOfUtcDay(endMs); t = addUtcDays(t, 1)) {
    const day = new Date(t).getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return Math.max(count, 1);
}

export function overlapWorkingDays(
  periodStart: number,
  periodEnd: number,
  leaveStart: number,
  leaveEnd: number
): number {
  const start = Math.max(startOfUtcDay(periodStart), startOfUtcDay(leaveStart));
  const end = Math.min(startOfUtcDay(periodEnd), startOfUtcDay(leaveEnd));
  if (end < start) return 0;
  return workingDaysInclusive(start, end);
}

/** Next pay period from a Pay cycle anchor. */
export function periodFromSchedule(
  frequency: PayFrequency,
  anchorDate: number,
  asOf = Date.now()
): { payPeriodStart: number; payPeriodEnd: number; payDate: number } {
  const anchor = startOfUtcDay(anchorDate);
  const today = startOfUtcDay(asOf);
  if (frequency === "monthly") {
    const a = new Date(anchor);
    const t = new Date(today);
    let year = t.getUTCFullYear();
    let month = t.getUTCMonth();
    const payDay = Math.min(a.getUTCDate(), 28);
    let payDate = Date.UTC(year, month, payDay);
    if (payDate < today) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      payDate = Date.UTC(year, month, payDay);
    }
    const payPeriodStart = Date.UTC(year, month, 1);
    const payPeriodEnd = Date.UTC(year, month + 1, 0);
    return { payPeriodStart, payPeriodEnd, payDate };
  }
  if (frequency === "annually") {
    const a = new Date(anchor);
    const t = new Date(today);
    let year = t.getUTCFullYear();
    const payMonth = a.getUTCMonth();
    const payDay = Math.min(a.getUTCDate(), 28);
    let payDate = Date.UTC(year, payMonth, payDay);
    if (payDate < today) {
      year += 1;
      payDate = Date.UTC(year, payMonth, payDay);
    }
    return {
      payPeriodStart: Date.UTC(year, 0, 1),
      payPeriodEnd: Date.UTC(year, 11, 31),
      payDate,
    };
  }
  const lengthDays = frequency === "weekly" ? 7 : 14;
  const lengthMs = lengthDays * 24 * 60 * 60 * 1000;
  if (today < anchor) {
    return {
      payPeriodStart: anchor,
      payPeriodEnd: addUtcDays(anchor, lengthDays - 1),
      payDate: addUtcDays(anchor, lengthDays - 1),
    };
  }
  const elapsed = today - anchor;
  const cycles = Math.floor(elapsed / lengthMs);
  const payPeriodStart = anchor + cycles * lengthMs;
  const payPeriodEnd = addUtcDays(payPeriodStart, lengthDays - 1);
  return { payPeriodStart, payPeriodEnd, payDate: payPeriodEnd };
}

export function classifyHours(
  totalHours: number,
  dailyLimit: number,
  overtimeMultiplier: number
): { regularHours: number; overtimeHours: number; regularPay: number; overtimePay: number; rate: number } {
  const regularHours = Math.min(totalHours, dailyLimit);
  const overtimeHours = Math.max(0, totalHours - dailyLimit);
  return {
    regularHours,
    overtimeHours,
    regularPay: 0,
    overtimePay: 0,
    rate: overtimeMultiplier,
  };
}

export function hoursFromClock(
  clockIn?: number,
  clockOut?: number,
  breakDuration = 0
): number {
  if (!clockIn || !clockOut || clockOut <= clockIn) return 0;
  const raw = (clockOut - clockIn) / (1000 * 60 * 60);
  return Math.max(0, roundMoney(raw - breakDuration / 60));
}

export async function seedPayrollForProperty(
  ctx: MutationCtx,
  propertyId: Id<"properties">,
  country: string
) {
  const pack = resolveJurisdictionPack(country);
  const now = Date.now();

  const existing = await ctx.db
    .query("payrollSettings")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
    .first();
  if (existing) {
    return existing._id;
  }

  const settingsId = await ctx.db.insert("payrollSettings", {
    propertyId,
    country: pack.country === "generic" ? (country || "generic") : pack.country,
    jurisdictionPack: pack.id,
    regularHoursLimitDaily: pack.regularHoursLimitDaily,
    overtimeMultiplier: pack.overtimeMultiplier,
    bankExportFormat: "generic_csv",
    createdAt: now,
    updatedAt: now,
  });

  const scheduleId = await ctx.db.insert("payCycles", {
    propertyId,
    name: pack.defaultScheduleName,
    frequency: pack.defaultFrequency,
    anchorDate: startOfUtcDay(now),
    cutoffDaysBeforePayDate: pack.cutoffDaysBeforePayDate,
    isDefault: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.patch(settingsId, { defaultPayCycleId: scheduleId, updatedAt: now });

  const calendarId = await ctx.db.insert("holidayCalendars", {
    propertyId,
    name: `${pack.id} holidays`,
    createdAt: now,
    updatedAt: now,
  });

  const year = new Date(now).getUTCFullYear();
  for (const holiday of pack.holidays) {
    await ctx.db.insert("holidays", {
      holidayCalendarId: calendarId,
      date: Date.UTC(year, holiday.month - 1, holiday.day),
      name: holiday.name,
      isPaid: holiday.isPaid,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const rule of pack.extraPayRules) {
    await ctx.db.insert("extraPayRules", {
      propertyId,
      kind: rule.kind,
      multiplier: rule.multiplier,
      startTime: rule.startTime,
      endTime: rule.endTime,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const type of pack.timeOffTypes) {
    await ctx.db.insert("timeOffTypes", {
      propertyId,
      code: type.code,
      name: type.name,
      paid: type.paid,
      countsTowardOvertime: type.countsTowardOvertime,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const component of pack.components) {
    await ctx.db.insert("payItemTypes", {
      propertyId,
      code: component.code,
      name: component.name,
      kind: component.kind,
      source: "statutory",
      calculation: component.calculation,
      formulaKey: component.formulaKey,
      params: component.params,
      defaultAmount: component.defaultAmount,
      defaultRate: component.defaultRate,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  return settingsId;
}

export function applyPayItemType(args: {
  calculation: "flat" | "percent_of_gross" | "pack_formula";
  formulaKey?: string;
  params?: Record<string, unknown>;
  amount?: number;
  rate?: number;
  defaultAmount?: number;
  defaultRate?: number;
  gross: number;
  frequency: PayFrequency;
}): number {
  if (args.calculation === "flat") {
    return roundMoney(args.amount ?? args.defaultAmount ?? 0);
  }
  if (args.calculation === "percent_of_gross") {
    const rate = args.rate ?? args.defaultRate ?? 0;
    return roundMoney(args.gross * rate);
  }
  if (args.formulaKey === "ng_paye") {
    return calculateNgPaye(args.gross, periodsPerYear(args.frequency), args.params);
  }
  return 0;
}

export { roundMoney };
