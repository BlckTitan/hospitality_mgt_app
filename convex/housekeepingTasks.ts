import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getAllHousekeepingTasks = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      const tasks = await ctx.db
        .query('housekeepingTasks')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();
      
      // Fetch related data for each task
      const tasksWithDetails = await Promise.all(
        tasks.map(async (task) => {
          const room = await ctx.db.get(task.roomId);
          const roomType = room ? await ctx.db.get(room.roomTypeId) : null;
          const assignedTo = task.assignedTo ? await ctx.db.get(task.assignedTo) : null;
          
          return {
            ...task,
            room: room ? { ...room, roomType } : null,
            assignedToStaff: assignedTo,
          };
        })
      );
      
      return { success: true, data: tasksWithDetails };
    } catch (error) {
      console.log(`Failed to fetch housekeeping tasks: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch housekeeping tasks' };
    }
  },
});

export const getHousekeepingTask = query({
  args: { taskId: v.id('housekeepingTasks') },
  handler: async (ctx, args) => {
    try {
      const task = await ctx.db.get(args.taskId);
      if (!task) {
        return { success: false, data: null, message: 'Housekeeping task not found' };
      }
      
      // Fetch related data
      const room = await ctx.db.get(task.roomId);
      const roomType = room ? await ctx.db.get(room.roomTypeId) : null;
      const assignedTo = task.assignedTo ? await ctx.db.get(task.assignedTo) : null;
      
      return { 
        success: true, 
        data: {
          ...task,
          room: room ? { ...room, roomType } : null,
          assignedToStaff: assignedTo,
        }
      };
    } catch (error) {
      console.log(`Failed to fetch housekeeping task: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch housekeeping task' };
    }
  },
});

export const createHousekeepingTask = mutation({
  args: {
    propertyId: v.id('properties'),
    roomId: v.id('rooms'),
    assignedTo: v.optional(v.id('staffs')),
    taskType: v.union(v.literal("checkout"), v.literal("stayover"), v.literal("deep-clean"), v.literal("inspection")),
    status: v.union(v.literal("pending"), v.literal("in-progress"), v.literal("completed"), v.literal("skipped")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    scheduledAt: v.optional(v.number()),
    estimatedDuration: v.optional(v.number()),
    notes: v.optional(v.string()),
    checklist: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    try {
      // Verify room exists and belongs to property
      const room = await ctx.db.get(args.roomId);
      if (!room) {
        return { success: false, message: 'Room does not exist' };
      }

      if (room.propertyId !== args.propertyId) {
        return { success: false, message: 'Room does not belong to this property' };
      }

      // Verify staff exists if assigned
      if (args.assignedTo) {
        const staff = await ctx.db.get(args.assignedTo);
        if (!staff) {
          return { success: false, message: 'Assigned staff does not exist' };
        }
      }

      const now = Date.now();
      const taskId = await ctx.db.insert('housekeepingTasks', {
        propertyId: args.propertyId,
        roomId: args.roomId,
        assignedTo: args.assignedTo,
        taskType: args.taskType,
        status: args.status,
        priority: args.priority,
        scheduledAt: args.scheduledAt,
        estimatedDuration: args.estimatedDuration,
        notes: args.notes,
        checklist: args.checklist,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, message: 'Housekeeping task created successfully', id: taskId };
    } catch (error) {
      console.log(`Failed to create housekeeping task: ${error}`);
      return { success: false, message: 'Failed to create housekeeping task' };
    }
  },
});

export const updateHousekeepingTask = mutation({
  args: {
    taskId: v.id('housekeepingTasks'),
    roomId: v.id('rooms'),
    assignedTo: v.optional(v.id('staffs')),
    taskType: v.union(v.literal("checkout"), v.literal("stayover"), v.literal("deep-clean"), v.literal("inspection")),
    status: v.union(v.literal("pending"), v.literal("in-progress"), v.literal("completed"), v.literal("skipped")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    scheduledAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    estimatedDuration: v.optional(v.number()),
    actualDuration: v.optional(v.number()),
    notes: v.optional(v.string()),
    checklist: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    try {
      const existingTask = await ctx.db.get(args.taskId);
      if (!existingTask) {
        return { success: false, message: 'Housekeeping task not found' };
      }

      // Verify room exists
      const room = await ctx.db.get(args.roomId);
      if (!room) {
        return { success: false, message: 'Room does not exist' };
      }

      if (room.propertyId !== existingTask.propertyId) {
        return { success: false, message: 'Room does not belong to this property' };
      }

      // Verify staff exists if assigned
      if (args.assignedTo) {
        const staff = await ctx.db.get(args.assignedTo);
        if (!staff) {
          return { success: false, message: 'Assigned staff does not exist' };
        }
      }

      const now = Date.now();
      const updateData: any = {
        roomId: args.roomId,
        assignedTo: args.assignedTo,
        taskType: args.taskType,
        status: args.status,
        priority: args.priority,
        scheduledAt: args.scheduledAt,
        estimatedDuration: args.estimatedDuration,
        notes: args.notes,
        checklist: args.checklist,
        updatedAt: now,
      };

      // Handle status changes and timestamps
      if (args.status === 'in-progress' && existingTask.status !== 'in-progress' && !args.startedAt) {
        updateData.startedAt = now;
      } else if (args.startedAt !== undefined) {
        updateData.startedAt = args.startedAt;
      }

      if (args.status === 'completed' && existingTask.status !== 'completed') {
        updateData.completedAt = now;
        // Calculate actual duration if startedAt exists
        if (existingTask.startedAt || args.startedAt) {
          const startTime = args.startedAt || existingTask.startedAt || now;
          const endTime = now;
          updateData.actualDuration = Math.round((endTime - startTime) / (1000 * 60)); // Convert to minutes
        }
      } else if (args.completedAt !== undefined) {
        updateData.completedAt = args.completedAt;
      }

      if (args.actualDuration !== undefined) {
        updateData.actualDuration = args.actualDuration;
      }

      await ctx.db.patch(args.taskId, updateData);

      return { success: true, message: 'Housekeeping task updated successfully' };
    } catch (error) {
      console.log(`Failed to update housekeeping task: ${error}`);
      return { success: false, message: 'Failed to update housekeeping task' };
    }
  },
});

export const deleteHousekeepingTask = mutation({
  args: { taskId: v.id('housekeepingTasks') },
  handler: async (ctx, args) => {
    try {
      const existingTask = await ctx.db.get(args.taskId);
      if (!existingTask) {
        return { success: false, message: 'Housekeeping task not found' };
      }

      // Prevent deletion of in-progress or completed tasks
      if (existingTask.status === 'in-progress' || existingTask.status === 'completed') {
        return { success: false, message: 'Cannot delete in-progress or completed tasks' };
      }

      await ctx.db.delete(args.taskId);
      return { success: true, message: 'Housekeeping task deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete housekeeping task: ${error}`);
      return { success: false, message: 'Failed to delete housekeeping task' };
    }
  },
});
