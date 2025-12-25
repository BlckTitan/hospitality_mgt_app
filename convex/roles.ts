import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getAllRoles = query({
  handler: async (ctx) => {
    try {
      const roles = await ctx.db.query('roles').collect();
      return { success: true, data: roles };
    } catch (error) {
      console.log(`Failed to fetch roles: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch roles' };
    }
  },
});

export const getRole = query({
  args: { role_id: v.id('roles') },
  handler: async (ctx, args) => {
    try {
      const role = await ctx.db.get(args.role_id);
      if (!role) {
        return { success: false, data: null, message: 'Role not found' };
      }
      return { success: true, data: role };
    } catch (error) {
      console.log(`Failed to fetch role: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch role' };
    }
  },
});

export const createRole = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    permissions: v.any(), // JSON object
    isSystemRole: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      // Check if role with same name already exists
      const existingRole = await ctx.db
        .query('roles')
        .filter((q: any) => q.eq(q.field('name'), args.name))
        .first();

      if (existingRole) {
        return { success: false, message: 'Role with this name already exists' };
      }

      const now = Date.now();
      const role_id = await ctx.db.insert('roles', {
        name: args.name,
        description: args.description,
        permissions: args.permissions || {},
        isSystemRole: args.isSystemRole,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, message: 'Role created successfully', id: role_id };
    } catch (error) {
      console.log(`Failed to create role: ${error}`);
      return { success: false, message: 'Failed to create role' };
    }
  },
});

export const updateRole = mutation({
  args: {
    role_id: v.id('roles'),
    name: v.string(),
    description: v.optional(v.string()),
    permissions: v.any(), // JSON object
    isSystemRole: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      const existingRole = await ctx.db.get(args.role_id);

      if (!existingRole) {
        return { success: false, message: 'Role does not exist' };
      }

      // Prevent modification of system roles (optional safety check)
      if (existingRole.isSystemRole && !args.isSystemRole) {
        return { success: false, message: 'Cannot change system role status' };
      }

      // Check if name is being changed and if new name already exists
      if (args.name !== existingRole.name) {
        const duplicateName = await ctx.db
          .query('roles')
          .filter((q: any) => q.eq(q.field('name'), args.name))
          .first();

        if (duplicateName) {
          return { success: false, message: 'Role with this name already exists' };
        }
      }

      await ctx.db.patch(args.role_id, {
        name: args.name,
        description: args.description,
        permissions: args.permissions || {},
        isSystemRole: args.isSystemRole,
        updatedAt: Date.now(),
      });

      return { success: true, message: 'Role updated successfully' };
    } catch (error) {
      console.log(`Failed to update role: ${error}`);
      return { success: false, message: 'Failed to update role' };
    }
  },
});

export const deleteRole = mutation({
  args: { role_id: v.id('roles') },
  handler: async (ctx, args) => {
    try {
      const role = await ctx.db.get(args.role_id);

      if (!role) {
        return { success: false, message: 'Role does not exist' };
      }

      // Prevent deletion of system roles
      if (role.isSystemRole) {
        return { success: false, message: 'Cannot delete system roles' };
      }

      // TODO: Check if role is assigned to any users before deletion
      // This would require checking the userRoles table

      await ctx.db.delete(args.role_id);
      return { success: true, message: 'Role deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete role: ${error}`);
      return { success: false, message: 'Failed to delete role' };
    }
  },
});

