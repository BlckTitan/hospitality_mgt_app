import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db.get(args.userId);
      if (!user) {
        return { success: false, data: null, message: 'User not found' };
      }
      return { success: true, data: user };
    } catch (error) {
      console.log(`Failed to fetch user: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch user' };
    }
  },
});

export const getAllUsers = query({
  handler: async (ctx) => {
    try {
      const users = await ctx.db.query('users').collect();
      return { success: true, data: users };
    } catch (error) {
      console.log(`Failed to fetch users: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch users' };
    }
  },
});

export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      // Check if user with same email already exists
      const existingUser = await ctx.db
        .query('users')
        .filter((q: any) => q.eq(q.field('email'), args.email))
        .first();

      if (existingUser) {
        return { success: false, message: 'User with this email already exists' };
      }

      const now = Date.now();
      const userId = await ctx.db.insert('users', {
        externalId: '', // Will be set automatically when user signs in with SSO
        email: args.email,
        name: args.name,
        phone: args.phone,
        isActive: args.isActive,
        lastLoginAt: undefined,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, message: 'User created successfully', id: userId };
    } catch (error) {
      console.log(`Failed to create user: ${error}`);
      return { success: false, message: 'Failed to create user' };
    }
  },
});

export const updateUser = mutation({
  args: {
    userId: v.id('users'),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    lastLoginAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const existingUser = await ctx.db.get(args.userId);

      if (!existingUser) {
        return { success: false, message: 'User does not exist' };
      }

      // Check if email is being changed and if new email already exists
      if (args.email && args.email !== existingUser.email) {
        const duplicateEmail = await ctx.db
          .query('users')
          .filter((q: any) => q.eq(q.field('email'), args.email))
          .first();

        if (duplicateEmail) {
          return { success: false, message: 'Email is already in use' };
        }
      }

      // Note: externalId is not updated here - it should only be set by SSO authentication

      const updateData: any = {
        updatedAt: Date.now(),
      };

      if (args.email !== undefined) updateData.email = args.email;
      if (args.name !== undefined) updateData.name = args.name;
      if (args.phone !== undefined) updateData.phone = args.phone;
      if (args.isActive !== undefined) updateData.isActive = args.isActive;
      if (args.lastLoginAt !== undefined) updateData.lastLoginAt = args.lastLoginAt;

      await ctx.db.patch(args.userId, updateData);

      return { success: true, message: 'User updated successfully' };
    } catch (error) {
      console.log(`Failed to update user: ${error}`);
      return { success: false, message: 'Failed to update user' };
    }
  },
});

export const deleteUser = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db.get(args.userId);

      if (!user) {
        return { success: false, message: 'User does not exist' };
      }

      await ctx.db.delete(args.userId);
      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete user: ${error}`);
      return { success: false, message: 'Failed to delete user' };
    }
  },
});

