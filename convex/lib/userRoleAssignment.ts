import { Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import {
  AuthContext,
  hasGranularPermission,
  isAdministratorAtProperty,
  scopeAuthContextToProperty,
} from "./rbac";
import { ADMINISTRATOR_ROLE_NAME } from "./systemRoles";

type Ctx = QueryCtx | MutationCtx;

export type AssignmentGuardResult = { ok: true } | { ok: false; message: string };

export function isAdministratorRoleName(name: string | undefined | null): boolean {
  return name === ADMINISTRATOR_ROLE_NAME;
}

export function canReadUsersAtProperty(
  authContext: AuthContext,
  propertyId: Id<"properties">,
): boolean {
  if (!authContext.propertyIds.includes(propertyId)) {
    return false;
  }
  return hasGranularPermission(
    scopeAuthContextToProperty(authContext, propertyId),
    "users.read",
  );
}

export async function findUserRoleDuplicate(
  ctx: Ctx,
  args: {
    userId: Id<"users">;
    roleId: Id<"roles">;
    propertyId: Id<"properties">;
    excludeId?: Id<"userRoles">;
  },
) {
  const atProperty = await ctx.db
    .query("userRoles")
    .withIndex("by_userId_propertyId", (q) =>
      q.eq("userId", args.userId).eq("propertyId", args.propertyId),
    )
    .collect();

  return (
    atProperty.find(
      (row) => row.roleId === args.roleId && row._id !== args.excludeId,
    ) ?? null
  );
}

export async function countAdministratorAssignments(
  ctx: Ctx,
  propertyId: Id<"properties">,
  excludeUserRoleId?: Id<"userRoles">,
): Promise<number> {
  const adminRole = await ctx.db
    .query("roles")
    .withIndex("by_name", (q) => q.eq("name", ADMINISTRATOR_ROLE_NAME))
    .first();
  if (!adminRole) {
    return 0;
  }

  const rows = await ctx.db
    .query("userRoles")
    .withIndex("by_roleId_and_propertyId", (q) =>
      q.eq("roleId", adminRole._id).eq("propertyId", propertyId),
    )
    .collect();

  return rows.filter((row) => row._id !== excludeUserRoleId).length;
}

export async function assertAdministratorAssignmentChange(
  ctx: Ctx,
  authContext: AuthContext,
  args: {
    targetUserId?: Id<"users">;
    propertyId: Id<"properties">;
    existingRoleName: string | null;
    newRoleName: string | null;
    excludeUserRoleId?: Id<"userRoles">;
  },
): Promise<AssignmentGuardResult> {
  const existingIsAdmin = isAdministratorRoleName(args.existingRoleName);
  const newIsAdmin = isAdministratorRoleName(args.newRoleName);
  if (!existingIsAdmin && !newIsAdmin) {
    return { ok: true };
  }

  if (!isAdministratorAtProperty(authContext, args.propertyId)) {
    return {
      ok: false,
      message:
        "Only an Administrator at this property can assign or change the Administrator role.",
    };
  }

  const removingAdmin = existingIsAdmin && !newIsAdmin;
  if (
    removingAdmin &&
    args.targetUserId &&
    authContext.user._id === args.targetUserId
  ) {
    return {
      ok: false,
      message:
        "You cannot change or remove your own Administrator role. Another Administrator must do this.",
    };
  }

  if (removingAdmin) {
    const remaining = await countAdministratorAssignments(
      ctx,
      args.propertyId,
      args.excludeUserRoleId,
    );
    if (remaining === 0) {
      return {
        ok: false,
        message:
          "Cannot remove the last Administrator at this property. Assign another Administrator first.",
      };
    }
  }

  return { ok: true };
}

export async function enrichUserRole(ctx: Ctx, userRoleId: Id<"userRoles">) {
  const userRole = await ctx.db.get(userRoleId);
  if (!userRole) {
    return null;
  }

  const [user, role, property, assignedByUser] = await Promise.all([
    ctx.db.get(userRole.userId),
    ctx.db.get(userRole.roleId),
    ctx.db.get(userRole.propertyId),
    ctx.db.get(userRole.assignedBy),
  ]);

  return {
    ...userRole,
    userName: user?.name || "Unknown",
    userEmail: user?.email || "Unknown",
    roleName: role?.name || "Unknown",
    propertyName: property?.name || "Unknown",
    assignedByName: assignedByUser?.name || "Unknown",
    isAdministrator: isAdministratorRoleName(role?.name),
  };
}
