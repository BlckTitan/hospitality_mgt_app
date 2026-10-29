import { QueryCtx } from "../_generated/server";
import { ROLE_JOB_DESCRIPTIONS } from "./roleJobDescriptions";
import { roleDescriptionParts, roleSummaryText } from "./roleText";

/** Staff job titles that do not use the same name as the roles table. */
const STAFF_ROLE_ALIASES: Record<string, string> = {
  housekeeper: "Housekeeping",
  "house keeper": "Housekeeping",
  security: "Security Officer",
  "security personnel": "Security Officer",
  cook: "Cook / Chef",
  chef: "Cook / Chef",
  "kitchen assistant": "Kitchen Assistant",
  "hotel assistant cook": "Kitchen Assistant",
  waiter: "Waiter",
  waitress: "Waiter",
  "hotel waiter/waitress": "Waiter",
  "laundry attendant": "Laundry Attendant",
};

export type RoleBrief = {
  roleName: string;
  reportsTo?: string;
  summary?: string;
  responsibilities?: string;
  qualifications?: string;
};

export async function loadRoleBrief(
  ctx: QueryCtx,
  staffRole: string | undefined,
): Promise<RoleBrief | null> {
  const title = staffRole?.trim();
  if (!title) return null;

  const mapped = STAFF_ROLE_ALIASES[title.toLowerCase()] ?? title;
  const named = await ctx.db
    .query("roles")
    .withIndex("by_name", (q) => q.eq("name", mapped))
    .first();
  const role =
    named ??
    (await ctx.db.query("roles").collect()).find(
      (row) => row.name.toLowerCase() === title.toLowerCase(),
    );
  if (!role) return null;

  const parts = roleDescriptionParts(role);
  const savedDescription = role.description && typeof role.description === "object";
  const catalog = savedDescription ? undefined : ROLE_JOB_DESCRIPTIONS[role.name];
  const reportsTo = parts.reportsTo || catalog?.reportsTo;
  const summary = parts.summary || catalog?.summary || roleSummaryText(role);
  const responsibilities = parts.responsibilities || catalog?.responsibilities;
  const qualifications = parts.qualifications || catalog?.qualifications;
  if (!reportsTo && !summary && !responsibilities && !qualifications) {
    return null;
  }
  return {
    roleName: role.name,
    ...(reportsTo ? { reportsTo } : {}),
    ...(summary ? { summary } : {}),
    ...(responsibilities ? { responsibilities } : {}),
    ...(qualifications ? { qualifications } : {}),
  };
}
