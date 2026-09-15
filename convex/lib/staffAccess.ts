import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { AuthContext, hasGranularPermission } from "./rbac";
import { peopleSearchName } from "./searchNames";

type DbCtx = MutationCtx | QueryCtx;

export const COMPENSATION_ROLES = [
  "Administrator",
  "Director",
  "General Manager",
  "HR Manager",
  "Finance Manager",
] as const;

export const COMPENSATION_FIELDS = [
  "salary",
  "baseSalary",
  "hourlyRate",
  "payType",
  "paymentMethod",
  "payCycleId",
  "taxId",
  "bankName",
  "accountName",
  "accountNumber",
  "routingCode",
] as const;

export type EmploymentType = "full-time" | "part-time" | "casual" | "contractor";

export const ONBOARDING_TEMPLATE: Array<{
  code: string;
  label: string;
  requiredFor?: EmploymentType[];
}> = [
  { code: "personal_details", label: "Personal details complete" },
  { code: "emergency_contact", label: "Emergency contact" },
  { code: "id_document", label: "ID uploaded" },
  { code: "contract", label: "Contract uploaded" },
  { code: "payment_method", label: "Payment method on file" },
  { code: "tax_id", label: "Tax identifier" },
  { code: "login_linked", label: "User login linked", requiredFor: ["full-time", "part-time"] },
  { code: "department_shift", label: "Department shift assigned" },
];

export function isActiveStatus(status: string | undefined) {
  return status === "active" || status === "employed" || status === "on-leave";
}

export function normalizeEmploymentStatus(status: string | undefined): "active" | "terminated" {
  return status === "terminated" ? "terminated" : "active";
}

export function canReadCompensation(auth: AuthContext): boolean {
  if (hasGranularPermission(auth, "staff.compensation.read")) return true;
  if (hasGranularPermission(auth, "staff.compensation.update")) return true;
  return auth.roles.some((role) => (COMPENSATION_ROLES as readonly string[]).includes(role));
}

export function canUpdateCompensation(auth: AuthContext): boolean {
  if (hasGranularPermission(auth, "staff.compensation.update")) return true;
  return auth.roles.some((role) => (COMPENSATION_ROLES as readonly string[]).includes(role));
}

export function canSeeAllTeamRecords(auth: AuthContext): boolean {
  return canReadCompensation(auth);
}

export function stripCompensation<T extends Record<string, unknown>>(row: T, canSee: boolean): T {
  if (canSee) return row;
  const next = { ...row };
  for (const field of COMPENSATION_FIELDS) {
    delete next[field];
  }
  return next;
}

export function maskAccountNumber(value: string | undefined) {
  if (!value) return undefined;
  if (value.length <= 4) return "****";
  return `****${value.slice(-4)}`;
}

export function staffNumberPrefix(propertyName: string | undefined) {
  const letters = (propertyName ?? "").replace(/[^A-Za-z]/g, "").toUpperCase();
  if (letters.length >= 2) return letters.slice(0, 4);
  return "ST";
}

export async function nextEmployeeNumber(
  ctx: DbCtx,
  propertyId: Id<"properties">,
  propertyName?: string,
) {
  const prefix = staffNumberPrefix(propertyName);
  const rows = await ctx.db
    .query("staffs")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
    .collect();
  let max = 0;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}-(\\d+)$`);
  for (const row of rows) {
    const match = row.employeeNumber?.match(pattern);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

export async function seedOnboardingItems(
  ctx: MutationCtx,
  args: {
    propertyId: Id<"properties">;
    employeeId: Id<"staffs">;
    employmentType: EmploymentType;
    userId?: Id<"users">;
    shiftTemplateId?: Id<"shiftTemplates">;
  },
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("staffOnboardingItems")
    .withIndex("by_employeeId", (q) => q.eq("employeeId", args.employeeId))
    .collect();
  if (existing.length > 0) return;

  for (const item of ONBOARDING_TEMPLATE) {
    const required = item.requiredFor
      ? item.requiredFor.includes(args.employmentType)
      : true;
    const autoComplete =
      (item.code === "personal_details") ||
      (item.code === "login_linked" && Boolean(args.userId)) ||
      (item.code === "department_shift" && Boolean(args.shiftTemplateId)) ||
      (item.code === "payment_method");
    await ctx.db.insert("staffOnboardingItems", {
      propertyId: args.propertyId,
      employeeId: args.employeeId,
      code: item.code,
      label: item.label,
      required,
      completedAt: autoComplete ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function writeOpeningPayHistory(
  ctx: MutationCtx,
  args: {
    employeeId: Id<"staffs">;
    payType: "hourly" | "salary" | "mixed";
    baseSalary?: number;
    hourlyRate?: number;
    payCycleId?: Id<"payCycles">;
    changedBy: Id<"users">;
    effectiveFrom: number;
  },
) {
  const now = Date.now();
  return await ctx.db.insert("payHistory", {
    employeeId: args.employeeId,
    payType: args.payType,
    baseSalary: args.baseSalary,
    hourlyRate: args.hourlyRate,
    payCycleId: args.payCycleId,
    effectiveFrom: args.effectiveFrom,
    changedBy: args.changedBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function closeAndInsertPayHistory(
  ctx: MutationCtx,
  args: {
    employeeId: Id<"staffs">;
    payType: "hourly" | "salary" | "mixed";
    baseSalary?: number;
    hourlyRate?: number;
    payCycleId?: Id<"payCycles">;
    changedBy: Id<"users">;
    effectiveFrom: number;
  },
) {
  const open = await ctx.db
    .query("payHistory")
    .withIndex("by_employeeId", (q) => q.eq("employeeId", args.employeeId))
    .collect();
  const current = open.find((row) => row.effectiveTo === undefined);
  if (current) {
    await ctx.db.patch(current._id, {
      effectiveTo: args.effectiveFrom,
      updatedAt: Date.now(),
    });
  }
  return await writeOpeningPayHistory(ctx, args);
}

export function searchNameFor(staff: Pick<Doc<"staffs">, "firstName" | "lastName">) {
  return peopleSearchName(staff.firstName, staff.lastName);
}

export async function approvedTimeOffOverlapsToday(
  ctx: DbCtx,
  employeeId: Id<"staffs">,
  now = Date.now(),
) {
  const rows = await ctx.db
    .query("timeOff")
    .withIndex("by_employeeId", (q) => q.eq("employeeId", employeeId))
    .collect();
  return rows.some(
    (row) => row.status === "approved" && row.startDate <= now && row.endDate >= now,
  );
}

export async function currentUsersStaff(ctx: DbCtx, userId: Id<"users">) {
  return await ctx.db
    .query("staffs")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
}

export async function restrictToDirectReports<T extends { employeeId: Id<"staffs"> }>(
  ctx: DbCtx,
  auth: AuthContext,
  rows: T[],
): Promise<T[]> {
  if (canSeeAllTeamRecords(auth)) return rows;
  const me = await currentUsersStaff(ctx, auth.user._id);
  if (!me) return [];
  const allowed = new Set<Id<"staffs">>([me._id]);
  const reports = await ctx.db
    .query("staffs")
    .withIndex("by_managerId", (q) => q.eq("managerId", me._id))
    .collect();
  for (const row of reports) allowed.add(row._id);
  return rows.filter((row) => allowed.has(row.employeeId));
}

export async function assertCanApproveStaff(
  ctx: DbCtx,
  auth: AuthContext,
  employeeId: Id<"staffs">,
): Promise<string | null> {
  if (canSeeAllTeamRecords(auth)) return null;
  const me = await currentUsersStaff(ctx, auth.user._id);
  if (!me) return "You have no staff record to identify your team.";
  const staff = await ctx.db.get(employeeId);
  if (!staff) return "Staff not found";
  if (staff.managerId !== me._id) {
    return "You can only approve Hours and Time off for your direct reports.";
  }
  return null;
}
