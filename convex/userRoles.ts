import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';

export const getAllUserRoles = query({
  handler: async (ctx) => {
    try {
      const userRoles = await ctx.db.query('userRoles').collect();
      
      // Populate related data for display
      const populatedUserRoles = await Promise.all(
        userRoles.map(async (userRole) => {
          const user = await ctx.db.get(userRole.userId);
          const role = await ctx.db.get(userRole.roleId);
          const property = await ctx.db.get(userRole.propertyId);
          
          // Try to get assignedBy user (assignedBy is a string that should be a user ID)
          let assignedByUser = null;
          try {
            // Try to get as ID first
            assignedByUser = await ctx.db.get(userRole.assignedBy as Id<'users'>);
          } catch {
            // If not a valid ID, leave as null and use the string value
            assignedByUser = null;
          }

          return {
            ...userRole,
            userName: user?.name || 'Unknown',
            userEmail: user?.email || 'Unknown',
            roleName: role?.name || 'Unknown',
            propertyName: property?.name || 'Unknown',
            assignedByName: assignedByUser?.name || userRole.assignedBy,
          };
        })
      );

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
    try {
      const userRole = await ctx.db.get(args.userRole_id);
      if (!userRole) {
        return { success: false, data: null, message: 'User role not found' };
      }

      // Populate related data
      const user = await ctx.db.get(userRole.userId);
      const role = await ctx.db.get(userRole.roleId);
      const property = await ctx.db.get(userRole.propertyId);
      
      // Try to get assignedBy user (assignedBy is a string that should be a user ID)
      let assignedByUser = null;
      try {
        // Try to get as ID first
        assignedByUser = await ctx.db.get(userRole.assignedBy as Id<'users'>);
      } catch {
        // If not a valid ID, leave as null and use the string value
        assignedByUser = null;
      }

      return {
        success: true,
        data: {
          ...userRole,
          userName: user?.name || 'Unknown',
          userEmail: user?.email || 'Unknown',
          roleName: role?.name || 'Unknown',
          propertyName: property?.name || 'Unknown',
          assignedByName: assignedByUser?.name || userRole.assignedBy,
        },
      };
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
    assignedBy: v.string(), // User ID who assigned the role
  },
  handler: async (ctx, args) => {
    try {
      // Check if this exact combination already exists
      const existingUserRole = await ctx.db
        .query('userRoles')
        .filter((q: any) => 
          q.and(
            q.eq(q.field('userId'), args.userId),
            q.eq(q.field('roleId'), args.roleId),
            q.eq(q.field('propertyId'), args.propertyId)
          )
        )
        .first();

      if (existingUserRole) {
        return { success: false, message: 'This user already has this role at this property' };
      }

      // Verify that user, role, and property exist
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

      const userRole_id = await ctx.db.insert('userRoles', {
        userId: args.userId,
        roleId: args.roleId,
        propertyId: args.propertyId,
        assignedAt: Date.now(),
        assignedBy: args.assignedBy,
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
    userId: v.id('users'),
    roleId: v.id('roles'),
    propertyId: v.id('properties'),
    assignedBy: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const existingUserRole = await ctx.db.get(args.userRole_id);

      if (!existingUserRole) {
        return { success: false, message: 'User role does not exist' };
      }

      // Check if the new combination already exists (excluding current record)
      const duplicateUserRole = await ctx.db
        .query('userRoles')
        .filter((q: any) => 
          q.and(
            q.eq(q.field('userId'), args.userId),
            q.eq(q.field('roleId'), args.roleId),
            q.eq(q.field('propertyId'), args.propertyId),
            q.neq(q.field('_id'), args.userRole_id)
          )
        )
        .first();

      if (duplicateUserRole) {
        return { success: false, message: 'This user already has this role at this property' };
      }

      // Verify that user, role, and property exist
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

      await ctx.db.patch(args.userRole_id, {
        userId: args.userId,
        roleId: args.roleId,
        propertyId: args.propertyId,
        assignedBy: args.assignedBy,
        // Note: assignedAt is not updated - it should remain the original assignment date
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
    try {
      const userRole = await ctx.db.get(args.userRole_id);

      if (!userRole) {
        return { success: false, message: 'User role does not exist' };
      }

      await ctx.db.delete(args.userRole_id);
      return { success: true, message: 'User role removed successfully' };
    } catch (error) {
      console.log(`Failed to delete user role: ${error}`);
      return { success: false, message: 'Failed to remove user role' };
    }
  },
});

