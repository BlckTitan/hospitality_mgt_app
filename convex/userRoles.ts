import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { requireAuthContext, requirePermission } from './lib/rbac';
import {
  assertAdministratorAssignmentChange,
  canReadUsersAtProperty,
  enrichUserRole,
  findUserRoleDuplicate,
} from './lib/userRoleAssignment';

export const getAllUserRoles = query({
  args: {},
  handler: async (ctx) => {
    const authContext = await requirePermission(ctx, 'users.read');
    try {
      const populatedUserRoles = [];
      for (const propertyId of authContext.propertyIds) {
        if (!canReadUsersAtProperty(authContext, propertyId)) {
          continue;
        }

        const userRoles = await ctx.db
          .query('userRoles')
          .withIndex('by_propertyId', (q) => q.eq('propertyId', propertyId))
          .collect();

        for (const userRole of userRoles) {
          const enriched = await enrichUserRole(ctx, userRole._id);
          if (enriched) {
            populatedUserRoles.push(enriched);
          }
        }
      }

      return { success: true, data: populatedUserRoles };
    } catch (error) {
      console.log(`Failed to fetch user roles: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch user roles' };
    }
  },
});

export const getUserRole = query({
  args: { userRole_id: v.id('userRoles') },
  handler: async (ctx, args) => {
    await requireAuthContext(ctx);
    const userRole = await ctx.db.get(args.userRole_id);
    if (!userRole) {
      return { success: false, data: null, message: 'User role not found' };
    }

    await requirePermission(ctx, 'users.read', userRole.propertyId);

    try {
      const data = await enrichUserRole(ctx, userRole._id);
      return { success: true, data };
    } catch (error) {
      console.log(`Failed to fetch user role: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch user role' };
    }
  },
});

export const createUserRole = mutation({
  args: {
    userId: v.id('users'),
    roleId: v.id('roles'),
    propertyId: v.id('properties'),
  },
  handler: async (ctx, args) => {
    const authContext = await requirePermission(ctx, 'users.create', args.propertyId);
    try {
      const existingUserRole = await findUserRoleDuplicate(ctx, args);
      if (existingUserRole) {
        return { success: false, message: 'This user already has this role at this property' };
      }

      const user = await ctx.db.get(args.userId);
      const role = await ctx.db.get(args.roleId);
      const property = await ctx.db.get(args.propertyId);

      if (!user) {
        return { success: false, message: 'User does not exist' };
      }
      if (!role) {
        return { success: false, message: 'Role does not exist' };
      }
      if (!property) {
        return { success: false, message: 'Property does not exist' };
      }

      const adminGuard = await assertAdministratorAssignmentChange(ctx, authContext, {
        targetUserId: args.userId,
        propertyId: args.propertyId,
        existingRoleName: null,
        newRoleName: role.name,
      });
      if (!adminGuard.ok) {
        return { success: false, message: adminGuard.message };
      }

      const userRole_id = await ctx.db.insert('userRoles', {
        userId: args.userId,
        roleId: args.roleId,
        propertyId: args.propertyId,
        assignedAt: Date.now(),
        assignedBy: authContext.user._id,
      });

      return { success: true, message: 'User role assigned successfully', id: userRole_id };
    } catch (error) {
      console.log(`Failed to create user role: ${error}`);
      return { success: false, message: 'Failed to assign user role' };
    }
  },
});

export const updateUserRole = mutation({
  args: {
    userRole_id: v.id('userRoles'),
    roleId: v.id('roles'),
    propertyId: v.id('properties'),
  },
  handler: async (ctx, args) => {
    await requireAuthContext(ctx);
    const existingUserRole = await ctx.db.get(args.userRole_id);

    if (!existingUserRole) {
      return { success: false, message: 'User role does not exist' };
    }

    const authContext = await requirePermission(ctx, 'users.update', existingUserRole.propertyId);
    if (args.propertyId !== existingUserRole.propertyId) {
      await requirePermission(ctx, 'users.update', args.propertyId);
    }

    try {
      const duplicateUserRole = await findUserRoleDuplicate(ctx, {
        userId: existingUserRole.userId,
        roleId: args.roleId,
        propertyId: args.propertyId,
        excludeId: args.userRole_id,
      });

      if (duplicateUserRole) {
        return { success: false, message: 'This user already has this role at this property' };
      }

      const existingRole = await ctx.db.get(existingUserRole.roleId);
      const role = await ctx.db.get(args.roleId);
      const property = await ctx.db.get(args.propertyId);

      if (!role) {
        return { success: false, message: 'Role does not exist' };
      }
      if (!property) {
        return { success: false, message: 'Property does not exist' };
      }

      const oldPropertyGuard = await assertAdministratorAssignmentChange(ctx, authContext, {
        targetUserId: existingUserRole.userId,
        propertyId: existingUserRole.propertyId,
        existingRoleName: existingRole?.name ?? null,
        newRoleName:
          args.propertyId === existingUserRole.propertyId ? role.name : null,
        excludeUserRoleId: args.userRole_id,
      });
      if (!oldPropertyGuard.ok) {
        return { success: false, message: oldPropertyGuard.message };
      }

      if (args.propertyId !== existingUserRole.propertyId) {
        const newPropertyGuard = await assertAdministratorAssignmentChange(ctx, authContext, {
          targetUserId: existingUserRole.userId,
          propertyId: args.propertyId,
          existingRoleName: null,
          newRoleName: role.name,
        });
        if (!newPropertyGuard.ok) {
          return { success: false, message: newPropertyGuard.message };
        }
      }

      await ctx.db.patch(args.userRole_id, {
        roleId: args.roleId,
        propertyId: args.propertyId,
      });

      return { success: true, message: 'User role updated successfully' };
    } catch (error) {
      console.log(`Failed to update user role: ${error}`);
      return { success: false, message: 'Failed to update user role' };
    }
  },
});

export const deleteUserRole = mutation({
  args: { userRole_id: v.id('userRoles') },
  handler: async (ctx, args) => {
    await requireAuthContext(ctx);
    const userRole = await ctx.db.get(args.userRole_id);

    if (!userRole) {
      return { success: false, message: 'User role does not exist' };
    }

    const authContext = await requirePermission(ctx, 'users.update', userRole.propertyId);

    try {
      const role = await ctx.db.get(userRole.roleId);
      const adminGuard = await assertAdministratorAssignmentChange(ctx, authContext, {
        targetUserId: userRole.userId,
        propertyId: userRole.propertyId,
        existingRoleName: role?.name ?? null,
        newRoleName: null,
        excludeUserRoleId: args.userRole_id,
      });
      if (!adminGuard.ok) {
        return { success: false, message: adminGuard.message };
      }

      await ctx.db.delete(args.userRole_id);
      return { success: true, message: 'User role removed successfully' };
    } catch (error) {
      console.log(`Failed to delete user role: ${error}`);
      return { success: false, message: 'Failed to remove user role' };
    }
  },
});

export const getUserRolesByUserId = query({
  args: { userId: v.union(v.id('users'), v.string()) },
  handler: async (ctx, args) => {
    const authContext = await requirePermission(ctx, 'users.read');

    try {
      let resolvedUserId: Id<'users'>;
      if (typeof args.userId === 'string' && args.userId.startsWith('user_')) {
        const user = await ctx.db
          .query('users')
          .withIndex('byExternalId', (q) => q.eq('externalId', args.userId as string))
          .unique();
        if (!user) {
          return { success: false, data: [], message: 'User not found' };
        }
        resolvedUserId = user._id;
      } else {
        resolvedUserId = args.userId as Id<'users'>;
      }

      const userRoles = await ctx.db
        .query('userRoles')
        .withIndex('by_userId', (q) => q.eq('userId', resolvedUserId))
        .collect();

      const populatedUserRoles = [];
      for (const userRole of userRoles) {
        if (!canReadUsersAtProperty(authContext, userRole.propertyId)) {
          continue;
        }
        const enriched = await enrichUserRole(ctx, userRole._id);
        if (enriched) {
          populatedUserRoles.push(enriched);
        }
      }

      return { success: true, data: populatedUserRoles };
    } catch (error) {
      console.log(`Failed to fetch user roles by userId: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch user roles' };
    }
  },
});
