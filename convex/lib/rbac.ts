import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { ensureUserFromIdentity } from "./userIdentity";
import {
  Action,
  GRANULAR_PERMISSIONS,
  Module,
  ROLE_PERMISSION_MATRIX,
  levelToActions,
} from "./permissionsData";

export type AuthContext = {
  user: Doc<"users">;
  roles: string[];
  propertyIds: Id<"properties">[];
  permissions: Record<string, boolean>;
};

type Ctx = QueryCtx | MutationCtx;

function isModule(value: string): value is Module {
  return [
    "users", "roles", "properties", "staff", "reservations", "rooms", "fnb",
    "inventory", "financial", "finance", "reports", "system", "maintenance",
    "security", "expenses",
  ].includes(value);
}

function isAction(value: string): value is Action {
  return [
    "create", "read", "update", "delete", "approve", "export", "admin", "settings", "audit",
  ].includes(value);
}

function parseGranularPermission(granularPerm: string): { module: Module; action: Action } | null {
  const [modulePart, actionPart] = granularPerm.split(".");
  if (!modulePart || !actionPart) return null;
  if (isModule(modulePart) && isAction(actionPart)) {
    return { module: modulePart, action: actionPart };
  }
  return null;
}

function hasRoleMatrixPermission(roles: string[], module: Module, action: Action): boolean {
  for (const role of roles) {
    const rolePermissions = ROLE_PERMISSION_MATRIX[role];
    if (!rolePermissions) continue;

    const permissionLevel = rolePermissions[module];
    if (permissionLevel && levelToActions[permissionLevel].includes(action)) {
      return true;
    }

    if ((rolePermissions as Record<string, boolean>)[`${module}.${action}`]) {
      return true;
    }
  }

  return false;
}

function hasCustomModulePermission(
  permissions: Record<string, boolean>,
  module: Module,
  action: Action,
): boolean {
  return Boolean(permissions[`${module}.${action}`]);
}

export function hasGranularPermission(authContext: AuthContext, granularPerm: string): boolean {
  if (authContext.permissions[granularPerm]) {
    return true;
  }

  const parsed = parseGranularPermission(granularPerm);
  if (parsed && hasCustomModulePermission(authContext.permissions, parsed.module, parsed.action)) {
    return true;
  }
  if (parsed && hasRoleMatrixPermission(authContext.roles, parsed.module, parsed.action)) {
    return true;
  }

  for (const permissions of Object.values(GRANULAR_PERMISSIONS)) {
    const mapped = permissions[granularPerm];
    if (mapped) {
      const nested = parseGranularPermission(mapped);
      if (nested && hasCustomModulePermission(authContext.permissions, nested.module, nested.action)) {
        return true;
      }
      if (nested && hasRoleMatrixPermission(authContext.roles, nested.module, nested.action)) {
        return true;
      }
    }
  }

  return false;
}

export async function getAuthContext(ctx: Ctx): Promise<AuthContext | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
    .unique();

  if (!user) {
    return null;
  }

  const userRoles = await ctx.db
    .query("userRoles")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .collect();

  const roles: string[] = [];
  const propertyIds: Id<"properties">[] = [];
  const permissions: Record<string, boolean> = {};

  for (const userRole of userRoles) {
    propertyIds.push(userRole.propertyId);
    const role = await ctx.db.get(userRole.roleId);
    if (!role) continue;

    roles.push(role.name);

    const rolePermissions = role.permissions as Record<string, unknown> | undefined;
    if (!rolePermissions) continue;

    for (const [key, value] of Object.entries(rolePermissions)) {
      if (value) {
        permissions[key] = true;
      }
    }
  }

  return {
    user,
    roles,
    propertyIds: [...new Set(propertyIds)],
    permissions,
  };
}

export async function requireAuthContext(ctx: Ctx): Promise<AuthContext> {
  const authContext = await getAuthContext(ctx);
  if (!authContext) {
    throw new Error("Not authenticated");
  }
  return authContext;
}

export async function requirePermission(
  ctx: Ctx,
  granularPermission: string,
  propertyId?: Id<"properties">,
): Promise<AuthContext> {
  const authContext = await requireAuthContext(ctx);

  if (propertyId && !authContext.propertyIds.includes(propertyId)) {
    throw new Error("Unauthorized: no access to this property");
  }

  if (!hasGranularPermission(authContext, granularPermission)) {
    throw new Error("Unauthorized");
  }

  return authContext;
}

export async function requireAuthenticated(ctx: Ctx): Promise<AuthContext> {
  return await requireAuthContext(ctx);
}

export async function userHasAnyRoles(ctx: Ctx, userId: Id<"users">): Promise<boolean> {
  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
  return userRole !== null;
}

export async function requirePermissionOrInitialSetup(
  ctx: MutationCtx,
  granularPermission: string,
): Promise<AuthContext> {
  await ensureUserFromIdentity(ctx);
  const authContext = await requireAuthContext(ctx);
  const hasRoles = await userHasAnyRoles(ctx, authContext.user._id);

  if (!hasRoles) {
    return authContext;
  }

  if (!hasGranularPermission(authContext, granularPermission)) {
    throw new Error("Unauthorized");
  }

  return authContext;
}
