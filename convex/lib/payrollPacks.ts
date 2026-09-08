/**
 * Country jurisdiction packs. Catalog lives in code, not a Convex table.
 * Launch packs: NG + generic. Unknown ISO codes fall back to generic.
 */

export type PackComponent = {
  code: string;
  name: string;
  kind: "earning" | "allowance" | "deduction";
  calculation: "flat" | "percent_of_gross" | "pack_formula";
  formulaKey?: string;
  params?: Record<string, unknown>;
  defaultAmount?: number;
  defaultRate?: number;
};

export type PackHoliday = { month: number; day: number; name: string; isPaid: boolean };

export type PayFrequency = "weekly" | "bi-weekly" | "monthly" | "annually";

export type JurisdictionPack = {
  id: string;
  country: string;
  regularHoursLimitDaily: number;
  overtimeMultiplier: number;
  defaultScheduleName: string;
  defaultFrequency: PayFrequency;
  cutoffDaysBeforePayDate: number;
  components: PackComponent[];
  timeOffTypes: Array<{ code: string; name: string; paid: boolean; countsTowardOvertime: boolean }>;
  holidays: PackHoliday[];
  extraPayRules: Array<{
    kind: "daily_overtime" | "weekly_overtime" | "night" | "weekend" | "public_holiday";
    multiplier: number;
    startTime?: string;
    endTime?: string;
  }>;
};

const GENERIC_PACK: JurisdictionPack = {
  id: "generic",
  country: "generic",
  regularHoursLimitDaily: 8,
  overtimeMultiplier: 1.5,
  defaultScheduleName: "Monthly",
  defaultFrequency: "monthly",
  cutoffDaysBeforePayDate: 2,
  components: [],
  timeOffTypes: [
    { code: "110001", name: "Annual leave", paid: true, countsTowardOvertime: false },
    { code: "110002", name: "Sick leave", paid: true, countsTowardOvertime: false },
    { code: "110003", name: "Unpaid leave", paid: false, countsTowardOvertime: false },
  ],
  holidays: [
    { month: 1, day: 1, name: "New Year's Day", isPaid: true },
    { month: 12, day: 25, name: "Christmas Day", isPaid: true },
  ],
  extraPayRules: [
    { kind: "daily_overtime", multiplier: 1.5 },
    { kind: "weekend", multiplier: 1.5 },
    { kind: "public_holiday", multiplier: 2 },
  ],
};

const NG_PACK: JurisdictionPack = {
  id: "NG",
  country: "NG",
  regularHoursLimitDaily: 8,
  overtimeMultiplier: 1.5,
  defaultScheduleName: "Monthly",
  defaultFrequency: "monthly",
  cutoffDaysBeforePayDate: 3,
  components: [
    {
      code: "210001",
      name: "PAYE",
      kind: "deduction",
      calculation: "pack_formula",
      formulaKey: "ng_paye",
      params: {
        bands: [
          { upTo: 300000, rate: 0.07 },
          { upTo: 600000, rate: 0.11 },
          { upTo: 1100000, rate: 0.15 },
          { upTo: 1600000, rate: 0.19 },
          { upTo: 3200000, rate: 0.21 },
          { upTo: null, rate: 0.24 },
        ],
        reliefRate: 0.01,
        reliefMin: 200000,
      },
    },
    {
      code: "210002",
      name: "Employee pension",
      kind: "deduction",
      calculation: "percent_of_gross",
      defaultRate: 0.08,
    },
  ],
  timeOffTypes: [
    { code: "110001", name: "Annual leave", paid: true, countsTowardOvertime: false },
    { code: "110002", name: "Sick leave", paid: true, countsTowardOvertime: false },
    { code: "110003", name: "Unpaid leave", paid: false, countsTowardOvertime: false },
  ],
  holidays: [
    { month: 1, day: 1, name: "New Year's Day", isPaid: true },
    { month: 5, day: 1, name: "Workers' Day", isPaid: true },
    { month: 6, day: 12, name: "Democracy Day", isPaid: true },
    { month: 10, day: 1, name: "Independence Day", isPaid: true },
    { month: 12, day: 25, name: "Christmas Day", isPaid: true },
    { month: 12, day: 26, name: "Boxing Day", isPaid: true },
  ],
  extraPayRules: [
    { kind: "daily_overtime", multiplier: 1.5 },
    { kind: "weekend", multiplier: 1.5 },
    { kind: "public_holiday", multiplier: 2 },
  ],
};

const PACKS: Record<string, JurisdictionPack> = {
  NG: NG_PACK,
  generic: GENERIC_PACK,
};

export function resolveJurisdictionPack(country?: string | null): JurisdictionPack {
  const code = (country ?? "").trim().toUpperCase();
  if (code && PACKS[code]) return PACKS[code];
  return GENERIC_PACK;
}

/** Annual PAYE from Nigerian bands, then convert to a period amount. */
export function calculateNgPaye(
  periodGross: number,
  periodsPerYear: number,
  params?: Record<string, unknown>
): number {
  const annual = periodGross * periodsPerYear;
  const bands = (params?.bands as Array<{ upTo: number | null; rate: number }>) ?? [];
  const reliefRate = typeof params?.reliefRate === "number" ? params.reliefRate : 0.01;
  const reliefMin = typeof params?.reliefMin === "number" ? params.reliefMin : 200000;
  const relief = Math.max(annual * reliefRate, reliefMin);
  let taxable = Math.max(0, annual - relief);
  let tax = 0;
  let previous = 0;
  for (const band of bands) {
    const cap = band.upTo ?? Number.POSITIVE_INFINITY;
    const slice = Math.min(taxable, Math.max(0, cap - previous));
    tax += slice * band.rate;
    taxable -= slice;
    previous = cap;
    if (taxable <= 0) break;
  }
  return roundMoney(tax / periodsPerYear);
}

export function periodsPerYear(frequency: PayFrequency): number {
  if (frequency === "weekly") return 52;
  if (frequency === "bi-weekly") return 26;
  if (frequency === "annually") return 1;
  return 12;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
