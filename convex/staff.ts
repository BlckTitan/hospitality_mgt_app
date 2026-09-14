import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/rbac';
import {
  assignDefaultShiftTemplate,
  departmentFromRole,
  normalizeDepartment,
} from './lib/shiftHelpers';

export const getStaff = query({
  args: {staff_id: v.id('staffs')},
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'staff.read');
    const staff = await ctx.db.get(args.staff_id)
    if (!staff) return null;
    const template = staff.shiftTemplateId ? await ctx.db.get(staff.shiftTemplateId) : null;
    return { ...staff, shiftTemplateName: template?.name ?? null };
  }
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
  },

  handler: async (ctx, args) => {
    const existingStaff = await ctx.db.get(args.id);
    if (!existingStaff) {
      return { success: false, message: "Staff does not exist!" };
    }
    await requirePermission(ctx, 'staff.update');
    
    try {
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
      });

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
