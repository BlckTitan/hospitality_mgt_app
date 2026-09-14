import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';
import { requirePermission } from './lib/rbac';
import {
  assignDefaultShiftTemplate,
  departmentFromRole,
  normalizeDepartment,
} from './lib/shiftHelpers';
import { peopleSearchName } from './lib/searchNames';

type DbCtx = MutationCtx | QueryCtx;

async function assertLinkableUser(
  ctx: DbCtx,
  userId: Id<'users'>,
  propertyId: Id<'properties'> | undefined,
  excludeStaffId?: Id<'staffs'>,
): Promise<string | null> {
  const user = await ctx.db.get(userId);
  if (!user) {
    return 'Selected login was not found.';
  }
  if (!user.isActive) {
    return 'Selected login is inactive.';
  }
  if (propertyId) {
    const roleOnProperty = await ctx.db
      .query('userRoles')
      .withIndex('by_userId_propertyId', (q) =>
        q.eq('userId', userId).eq('propertyId', propertyId),
      )
      .first();
    if (!roleOnProperty) {
      return 'Selected login has no role on this property. Invite them first.';
    }
  }
  const linked = await ctx.db
    .query('staffs')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .first();
  if (linked && linked._id !== excludeStaffId) {
    return 'That login is already linked to another staff record.';
  }
  return null;
}

async function unsetStaffUserId(ctx: MutationCtx, staff: Doc<'staffs'>) {
  if (!staff.userId) return;
  const { _id, _creationTime, userId: _userId, ...rest } = staff;
  await ctx.db.replace(_id, rest);
}

export const getStaff = query({
  args: {staff_id: v.id('staffs')},
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'staff.read');
    const staff = await ctx.db.get(args.staff_id)
    if (!staff) return null;
    const template = staff.shiftTemplateId ? await ctx.db.get(staff.shiftTemplateId) : null;
    const linkedUser = staff.userId ? await ctx.db.get(staff.userId) : null;
    return {
      ...staff,
      shiftTemplateName: template?.name ?? null,
      linkedLogin: linkedUser
        ? { name: linkedUser.name, email: linkedUser.email }
        : null,
    };
  }
});

export const listLinkableUsers = query({
  args: {
    excludeStaffId: v.optional(v.id('staffs')),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'staff.read');
    const propertyId = auth.propertyIds[0];
    if (!propertyId) {
      return [];
    }

    const roles = await ctx.db
      .query('userRoles')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', propertyId))
      .collect();
    const userIds = [...new Set(roles.map((role) => role.userId))];

    const currentStaff = args.excludeStaffId
      ? await ctx.db.get(args.excludeStaffId)
      : null;
    const allStaff = await ctx.db.query('staffs').collect();
    const takenUserIds = new Set(
      allStaff
        .filter((staff) => staff.userId && staff._id !== args.excludeStaffId)
        .map((staff) => staff.userId as Id<'users'>),
    );

    const users = [];
    for (const userId of userIds) {
      const user = await ctx.db.get(userId);
      if (!user) continue;
      const isCurrentLink = currentStaff?.userId === user._id;
      if (!user.isActive && !isCurrentLink) continue;
      if (takenUserIds.has(user._id)) continue;
      users.push({ _id: user._id, name: user.name, email: user.email });
    }

    users.sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email));
    return users;
  },
});

export const getAllStaffs = query({
  handler: async (ctx) => {
    await requirePermission(ctx, 'staff.read');
    try {
      const staffs = await ctx.db.query('staffs').collect();
      return staffs;
    } catch (error) {
      console.log(`Failed to fetch staffs: ${error}`);
      return [];
    }
  },
});

export const createStaff = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    DoB: v.string(),
    stateOfOrigin: v.string(),
    salary: v.number(),
    employmentStatus: v.union(v.literal("employed"), v.literal("terminated")),
    LGA: v.string(),
    address: v.string(),
    dateRecruited: v.string(),
    dateTerminated: v.optional(v.string()),
    role: v.string(),
    department: v.optional(v.string()),
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'staff.create');

    try {
      
      const existingStaff = await ctx.db.query('staffs')
      .filter(q => q.eq(q.field('email'), args.email))
      .first()

      if(existingStaff){
        return { success: false, message: "Staff already exists" };
      }

      const propertyId = auth.propertyIds[0];
      if (args.userId) {
        const linkError = await assertLinkableUser(ctx, args.userId, propertyId);
        if (linkError) {
          return { success: false, message: linkError };
        }
      }
      const department = normalizeDepartment(args.department ?? departmentFromRole(args.role));
      let template = null;
      if (propertyId) {
        const rows = await ctx.db
          .query("shiftTemplates")
          .withIndex("by_propertyId_department", (q) =>
            q.eq("propertyId", propertyId).eq("department", department)
          )
          .collect();
        template = rows.find((row) => row.isActive && row.isDefault) ?? rows.find((row) => row.isActive) ?? null;
      }

      await ctx.db.insert('staffs', {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        phone: args.phone,
        DoB: args.DoB,
        stateOfOrigin: args.stateOfOrigin,
        salary: args.salary,
        employmentStatus: args.employmentStatus,
        LGA: args.LGA,
        address: args.address,
        dateRecruited: args.dateRecruited,
        dateTerminated: args.dateTerminated,
        role: args.role,
        propertyId,
        department,
        shiftTemplateId: template?._id,
        payType: 'salary',
        baseSalary: args.salary,
        paymentMethod: 'cash',
        searchName: peopleSearchName(args.firstName, args.lastName),
        ...(args.userId ? { userId: args.userId } : {}),
      });
      const suffix = template
        ? ` Assigned ${template.name} (${department}).`
        : ` No default shift exists yet for ${department} — define one under Shift Management.`;
      return { success: true, message: `Staff added successfully.${suffix}` };

    } catch (error) {
      console.log(`Insert failed ${error}`)
      return { success: false, message: "Failed to create new staff!" };
    }
    
  },
});

export const updateStaff = mutation({
  args: {
    id: v.id('staffs'),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    DoB: v.string(),
    stateOfOrigin: v.string(),
    salary: v.number(),
    employmentStatus: v.union(v.literal("employed"), v.literal("terminated")),
    LGA: v.string(),
    address: v.string(),
    dateRecruited: v.string(),
    dateTerminated: v.optional(v.string()),
    role: v.string(),
    department: v.optional(v.string()),
    userId: v.optional(v.union(v.id('users'), v.null())),
  },

  handler: async (ctx, args) => {
    const existingStaff = await ctx.db.get(args.id);
    if (!existingStaff) {
      return { success: false, message: "Staff does not exist!" };
    }
    await requirePermission(ctx, 'staff.update');
    
    try {
      const propertyId = existingStaff.propertyId;
      if (args.userId) {
        const linkError = await assertLinkableUser(
          ctx,
          args.userId,
          propertyId,
          existingStaff._id,
        );
        if (linkError) {
          return { success: false, message: linkError };
        }
      }

      const department = args.department
        ? normalizeDepartment(args.department)
        : normalizeDepartment(existingStaff.department ?? departmentFromRole(args.role));
      const departmentChanged = department !== existingStaff.department;

      await ctx.db.patch(existingStaff._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        salary: args.salary,
        employmentStatus: args.employmentStatus,
        phone: args.phone,
        DoB: args.DoB,
        stateOfOrigin: args.stateOfOrigin,
        address: args.address,
        LGA: args.LGA,
        dateTerminated: args.dateTerminated,
        department,
        searchName: peopleSearchName(args.firstName, args.lastName),
        ...(args.userId ? { userId: args.userId } : {}),
      });

      if (args.userId === null) {
        const latest = await ctx.db.get(existingStaff._id);
        if (latest) {
          await unsetStaffUserId(ctx, latest);
        }
      }

      if (departmentChanged && existingStaff.propertyId) {
        await assignDefaultShiftTemplate(ctx, existingStaff._id, existingStaff.propertyId, department);
      }

      return { success: true, message: "Staff updated successfully" };

    } catch (error) {
      console.log(`Update failed ${error}`)
      return { success: false, message: "Failed to update existing staff data" };
    }
    
  },
});

export const removeStaff = mutation({

  
  args: {id: v.id('staffs')},

  handler: async (ctx, args) => {
    const existingStaff = await ctx.db.get(args.id);
    if (!existingStaff) {
      return { success: false, message: "Staff does not exist" };
    }
    await requirePermission(ctx, 'staff.delete');

    try {

      await ctx.db.delete(existingStaff._id);
      return { success: true, message: "Staff removed successfully!" };

    } catch (error) {

      console.log(`Failed to delete staff record ${error}`)
      return { success: false, message: "Failed to delete staff record" };
      
    }
    
  },

});
