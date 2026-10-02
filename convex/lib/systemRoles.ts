import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";
import {
  ADMINISTRATOR_PERMISSIONS,
  SYSTEM_ROLE_DEFINITIONS,
  buildRolePermissions,
} from "./rolePermissionCatalog";

export { ADMINISTRATOR_PERMISSIONS };

export const ADMINISTRATOR_ROLE_NAME = "Administrator";

const LEGACY_ADMIN_ROLE_NAMES = new Set([
  "admin",
  "administrator",
  "admin role",
  "system admin",
]);

function isLegacyAdminRoleName(name: string): boolean {
  return LEGACY_ADMIN_ROLE_NAMES.has(name.trim().toLowerCase());
}

export async function assignAdministratorRoleForProperty(
  ctx: MutationCtx,
  userId: Id<"users">,
  propertyId: Id<"properties">,
): Promise<Id<"userRoles">> {
  // Always keep RBAC system role templates current when assigning admin
  const seeded = await ensureAllSystemRoles(ctx);

  const existingAssignment = await ctx.db
    .query("userRoles")
    .withIndex("by_userId_propertyId", (q) =>
      q.eq("userId", userId).eq("propertyId", propertyId),
    )
    .first();

  if (existingAssignment) {
    return existingAssignment._id;
  }

  const adminRoleId =
    seeded.find((role) => role.name === ADMINISTRATOR_ROLE_NAME)?.roleId ??
    (await ensureAdministratorRole(ctx));

  return await ctx.db.insert("userRoles", {
    userId,
    roleId: adminRoleId,
    propertyId,
    assignedAt: Date.now(),
    assignedBy: userId,
  });
}

async function upsertSystemRole(
  ctx: MutationCtx,
  name: string,
  description: string,
  permissions: Record<string, boolean>,
): Promise<Id<"roles">> {
  const now = Date.now();

  const existing = await ctx.db
    .query("roles")
    .withIndex("by_name", (q) => q.eq("name", name))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      description: existing.description ?? description,
      permissions,
      isSystemRole: true,
      updatedAt: now,
    });
    return existing._id;
  }

  if (name === ADMINISTRATOR_ROLE_NAME) {
    const allRoles = await ctx.db.query("roles").collect();
    const legacyAdminRole = allRoles.find((role) => isLegacyAdminRoleName(role.name));
    if (legacyAdminRole) {
      await ctx.db.patch(legacyAdminRole._id, {
        name: ADMINISTRATOR_ROLE_NAME,
        description: legacyAdminRole.description ?? description,
        permissions,
        isSystemRole: true,
        updatedAt: now,
      });
      return legacyAdminRole._id;
    }
  }

  return await ctx.db.insert("roles", {
    name,
    description,
    permissions,
    isSystemRole: true,
    createdAt: now,
    updatedAt: now,
  });
}

export async function ensureAdministratorRole(ctx: MutationCtx): Promise<Id<"roles">> {
  return await upsertSystemRole(
    ctx,
    ADMINISTRATOR_ROLE_NAME,
    "Full system access for property owners and IT administrators",
    ADMINISTRATOR_PERMISSIONS,
  );
}

/**
 * Upserts every RBAC system role with the permission map from ai/RBAC.md.
 * Safe to re-run; refreshes permissions on existing system roles.
 */
export async function ensureAllSystemRoles(
  ctx: MutationCtx,
): Promise<{ name: string; roleId: Id<"roles"> }[]> {
  const results: { name: string; roleId: Id<"roles"> }[] = [];

  for (const def of SYSTEM_ROLE_DEFINITIONS) {
    const permissions = buildRolePermissions(def.name);
    const roleId = await upsertSystemRole(ctx, def.name, def.description, permissions);
    results.push({ name: def.name, roleId });
  }

  return results;
}
