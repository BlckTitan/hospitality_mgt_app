import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

export async function assignAdministratorRoleForProperty(
  ctx: MutationCtx,
  userId: Id<"users">,
  propertyId: Id<"properties">,
): Promise<Id<"userRoles">> {
  const existingAssignment = await ctx.db
    .query("userRoles")
    .withIndex("by_userId_propertyId", (q) =>
      q.eq("userId", userId).eq("propertyId", propertyId),
    )
    .first();

  if (existingAssignment) {
    return existingAssignment._id;
  }

  const adminRoleId = await ensureAdministratorRole(ctx);

  return await ctx.db.insert("userRoles", {
    userId,
    roleId: adminRoleId,
    propertyId,
    assignedAt: Date.now(),
    assignedBy: userId,
  });
}

export const ADMINISTRATOR_ROLE_NAME = "Administrator";

export const ADMINISTRATOR_PERMISSIONS: Record<string, boolean> = {
  "users.read": true,
  "users.create": true,
  "users.update": true,
  "users.delete": true,
  "roles.read": true,
  "roles.create": true,
  "roles.update": true,
  "roles.delete": true,
  "properties.read": true,
  "properties.create": true,
  "properties.update": true,
  "properties.delete": true,
  "staff.read": true,
  "staff.create": true,
  "staff.update": true,
  "staff.delete": true,
  "reservations.read": true,
  "reservations.create": true,
  "reservations.update": true,
  "reservations.delete": true,
  "rooms.read": true,
  "rooms.update": true,
  "fnb.read": true,
  "fnb.create": true,
  "fnb.update": true,
  "fnb.delete": true,
  "inventory.read": true,
  "inventory.create": true,
  "inventory.update": true,
  "inventory.delete": true,
  "financial.read": true,
  "financial.create": true,
  "financial.update": true,
  "financial.delete": true,
  "expenses.read": true,
  "expenses.create": true,
  "expenses.approve": true,
  "reports.read": true,
  "reports.create": true,
  "reports.export": true,
  "system.admin": true,
  "system.settings": true,
  "system.audit": true,
};

const LEGACY_ADMIN_ROLE_NAMES = new Set(["admin", "administrator", "admin role", "system admin"]);

function isLegacyAdminRoleName(name: string): boolean {
  return LEGACY_ADMIN_ROLE_NAMES.has(name.trim().toLowerCase());
}

export async function ensureAdministratorRole(ctx: MutationCtx): Promise<Id<"roles">> {
  const now = Date.now();

  const existingAdministrator = await ctx.db
    .query("roles")
    .withIndex("by_name", (q) => q.eq("name", ADMINISTRATOR_ROLE_NAME))
    .first();

  if (existingAdministrator) {
    await ctx.db.patch(existingAdministrator._id, {
      description: existingAdministrator.description ?? "Full system access for property owners and IT administrators",
      permissions: ADMINISTRATOR_PERMISSIONS,
      isSystemRole: true,
      updatedAt: now,
    });
    return existingAdministrator._id;
  }

  const allRoles = await ctx.db.query("roles").collect();
  const legacyAdminRole = allRoles.find((role) => isLegacyAdminRoleName(role.name));

  if (legacyAdminRole) {
    await ctx.db.patch(legacyAdminRole._id, {
      name: ADMINISTRATOR_ROLE_NAME,
      description: legacyAdminRole.description ?? "Full system access for property owners and IT administrators",
      permissions: ADMINISTRATOR_PERMISSIONS,
      isSystemRole: true,
      updatedAt: now,
    });
    return legacyAdminRole._id;
  }

  return await ctx.db.insert("roles", {
    name: ADMINISTRATOR_ROLE_NAME,
    description: "Full system access for property owners and IT administrators",
    permissions: ADMINISTRATOR_PERMISSIONS,
    isSystemRole: true,
    createdAt: now,
    updatedAt: now,
  });
}
