import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';
import { requireAuthenticated, requirePermission } from './lib/rbac';
import { unassignStaffFromOpenWork } from './lib/taskAssignment';
import {
  assignDefaultShiftTemplate,
  departmentFromRole,
  normalizeDepartment,
} from './lib/shiftHelpers';
import { peopleSearchName } from './lib/searchNames';
import { startOfUtcDay, workingDaysInclusive } from './lib/payrollHelpers';
import {
  approvedTimeOffOverlapsToday,
  canReadCompensation,
  canUpdateCompensation,
  closeAndInsertPayHistory,
  EmploymentType,
  isActiveStatus,
  maskAccountNumber,
  nextEmployeeNumber,
  normalizeEmploymentStatus,
  seedOnboardingItems,
  stripCompensation,
  writeOpeningPayHistory,
} from './lib/staffAccess';
import {
  defaultClockMethodForStaff,
  resolveStaffClockMethod,
  staffClockMethodValidator,
} from './lib/clockMethod';

type DbCtx = MutationCtx | QueryCtx;

const employmentTypeValidator = v.union(
  v.literal('full-time'),
  v.literal('part-time'),
  v.literal('casual'),
  v.literal('contractor'),
);

const paymentMethodValidator = v.union(
  v.literal('bank'),
  v.literal('cash'),
  v.literal('mobile_money'),
  v.literal('check'),
);

const payTypeValidator = v.union(v.literal('hourly'), v.literal('salary'), v.literal('mixed'));

const documentKindValidator = v.union(
  v.literal('contract'),
  v.literal('id'),
  v.literal('tax_form'),
  v.literal('bank_letter'),
  v.literal('policy'),
  v.literal('other'),
);

const idTypeValidator = v.union(
  v.literal('nin'),
  v.literal('passport'),
  v.literal('drivers_license'),
  v.literal('other'),
);

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

async function unsetStaffManagerId(ctx: MutationCtx, staff: Doc<'staffs'>) {
  if (!staff.managerId) return;
  const { _id, _creationTime, managerId: _managerId, ...rest } = staff;
  await ctx.db.replace(_id, rest);
}

async function emailTaken(
  ctx: DbCtx,
  email: string,
  propertyId: Id<'properties'> | undefined,
  excludeStaffId?: Id<'staffs'>,
) {
  const rows = await ctx.db
    .query('staffs')
    .withIndex('email', (q) => q.eq('email', email))
    .collect();
  return rows.some(
    (row) =>
      row._id !== excludeStaffId &&
      (row.propertyId === propertyId || (!row.propertyId && !propertyId)),
  );
}

async function assertManager(
  ctx: DbCtx,
  managerId: Id<'staffs'>,
  propertyId: Id<'properties'> | undefined,
  selfId?: Id<'staffs'>,
) {
  if (selfId && managerId === selfId) {
    return 'A staff member cannot manage themselves.';
  }
  const manager = await ctx.db.get(managerId);
  if (!manager) return 'Selected manager was not found.';
  if (propertyId && manager.propertyId && manager.propertyId !== propertyId) {
    return 'Manager must belong to the same property.';
  }
  if (!isActiveStatus(manager.employmentStatus)) {
    return 'Manager must be an active staff member.';
  }
  return null;
}

function publicStaffFields(staff: Doc<'staffs'>, canSeePay: boolean) {
  return stripCompensation({ ...staff }, canSeePay);
}

async function enrichStaff(ctx: DbCtx, staff: Doc<'staffs'>, canSeePay: boolean) {
  const template = staff.shiftTemplateId ? await ctx.db.get(staff.shiftTemplateId) : null;
  const linkedUser = staff.userId ? await ctx.db.get(staff.userId) : null;
  const manager = staff.managerId ? await ctx.db.get(staff.managerId) : null;
  const pendingRequests = await ctx.db
    .query('staffChangeRequests')
    .withIndex('by_employeeId', (q) => q.eq('employeeId', staff._id))
    .collect();
  const onLeave = await approvedTimeOffOverlapsToday(ctx, staff._id);
  return {
    ...publicStaffFields(staff, canSeePay),
    employmentStatus: normalizeEmploymentStatus(staff.employmentStatus),
    onLeave,
    shiftTemplateName: template?.name ?? null,
    clockMethod: resolveStaffClockMethod(staff),
    managerName: manager ? `${manager.firstName} ${manager.lastName}` : null,
    linkedLogin: linkedUser
      ? { name: linkedUser.name, email: linkedUser.email }
      : null,
    pendingChangeRequests: pendingRequests.filter((row) => row.status === 'pending').length,
  };
}

async function terminateStaffRecord(ctx: MutationCtx, staffId: Id<'staffs'>) {
  const existingStaff = await ctx.db.get(staffId);
  if (!existingStaff) {
    return { success: false, message: 'Staff does not exist' };
  }
  await requirePermission(ctx, 'staff.delete');
  await unassignStaffFromOpenWork(ctx, staffId);
  await ctx.db.patch(existingStaff._id, {
    employmentStatus: 'terminated' as const,
    dateTerminated: new Date().toISOString(),
  });
  const latest = await ctx.db.get(existingStaff._id);
  if (latest) {
    await unsetStaffUserId(ctx, latest);
  }
  return { success: true, message: 'Staff terminated. Historical Hours and payroll were kept.' };
}

export const getStaff = query({
  args: { staff_id: v.id('staffs') },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'staff.read');
    const staff = await ctx.db.get(args.staff_id);
    if (!staff) return null;
    return await enrichStaff(ctx, staff, canReadCompensation(auth));
  },
});

export const listStaff = query({
  args: {
    includeTerminated: v.optional(v.boolean()),
    department: v.optional(v.string()),
    employmentType: v.optional(employmentTypeValidator),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'staff.read');
    const propertyId = auth.propertyIds[0];
    if (!propertyId) return [];
    const canSeePay = canReadCompensation(auth);
    const rows = await ctx.db
      .query('staffs')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', propertyId))
      .collect();
    const unscoped = (await ctx.db.query('staffs').collect()).filter((row) => !row.propertyId);
    const merged = [...rows, ...unscoped];
    const filtered = merged.filter((row) => {
      const status = normalizeEmploymentStatus(row.employmentStatus);
      if (!args.includeTerminated && status === 'terminated') return false;
      if (args.department && row.department !== args.department) return false;
      if (args.employmentType && row.employmentType !== args.employmentType) return false;
      return true;
    });
    filtered.sort(
      (a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
    );
    return await Promise.all(filtered.map((row) => enrichStaff(ctx, row, canSeePay)));
  },
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

export const listManagers = query({
  args: { excludeStaffId: v.optional(v.id('staffs')) },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'staff.read');
    const propertyId = auth.propertyIds[0];
    if (!propertyId) return [];
    const rows = await ctx.db
      .query('staffs')
      .withIndex('by_propertyId', (q) => q.eq('propertyId', propertyId))
      .collect();
    return rows
      .filter(
        (row) =>
          row._id !== args.excludeStaffId && isActiveStatus(row.employmentStatus),
      )
      .map((row) => ({
        _id: row._id,
        name: `${row.firstName} ${row.lastName}`,
        role: row.role,
      }));
  },
});

export const getAllStaffs = query({
  handler: async (ctx) => {
    const auth = await requirePermission(ctx, 'staff.read');
    const propertyId = auth.propertyIds[0];
    const canSeePay = canReadCompensation(auth);
    try {
      const staffs = propertyId
        ? await ctx.db
            .query('staffs')
            .withIndex('by_propertyId', (q) => q.eq('propertyId', propertyId))
            .collect()
        : await ctx.db.query('staffs').collect();
      return staffs.map((row) => publicStaffFields(row, canSeePay));
    } catch (error) {
      console.log(`Failed to fetch staffs: ${error}`);
      return [];
    }
  },
});

export const getStaffDetail = query({
  args: { staff_id: v.id('staffs') },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'staff.read');
    const staff = await ctx.db.get(args.staff_id);
    if (!staff) return null;
    const canSeePay = canReadCompensation(auth);
    const profile = await enrichStaff(ctx, staff, canSeePay);

    const hours = (
      await ctx.db
        .query('hours')
        .withIndex('by_employeeId', (q) => q.eq('employeeId', staff._id))
        .collect()
    )
      .sort((a, b) => b.workDate - a.workDate)
      .slice(0, 10);

    const payHistory = canSeePay
      ? (
          await ctx.db
            .query('payHistory')
            .withIndex('by_employeeId', (q) => q.eq('employeeId', staff._id))
            .collect()
        ).sort((a, b) => b.effectiveFrom - a.effectiveFrom)
      : [];

    const timeOff = (
      await ctx.db
        .query('timeOff')
        .withIndex('by_employeeId', (q) => q.eq('employeeId', staff._id))
        .collect()
    ).sort((a, b) => b.startDate - a.startDate);

    const timeOffTypes = await Promise.all(
      timeOff.map(async (row) => {
        const type = await ctx.db.get(row.timeOffTypeId);
        return { ...row, timeOffTypeName: type?.name ?? 'Unknown', paid: type?.paid ?? true };
      }),
    );

    const staffPay = (
      await ctx.db
        .query('staffPay')
        .withIndex('by_employeeId', (q) => q.eq('employeeId', staff._id))
        .collect()
    )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    const payItemRows = canSeePay
      ? await ctx.db
          .query('staffPayItems')
          .withIndex('by_employeeId', (q) => q.eq('employeeId', staff._id))
          .collect()
      : [];
    const payItems = await Promise.all(
      payItemRows.map(async (row) => {
        const type = await ctx.db.get(row.payItemTypeId);
        return { ...row, name: type?.name, code: type?.code, kind: type?.kind };
      }),
    );
    const availablePayItemTypes =
      canSeePay && staff.propertyId
        ? (
            await ctx.db
              .query('payItemTypes')
              .withIndex('by_propertyId', (q) => q.eq('propertyId', staff.propertyId!))
              .collect()
          ).filter((row) => row.isActive)
        : [];

    const documents = await ctx.db
      .query('staffDocuments')
      .withIndex('by_employeeId', (q) => q.eq('employeeId', staff._id))
      .collect();

    const documentsWithUrl = await Promise.all(
      documents.map(async (row) => ({
        ...row,
        url: await ctx.storage.getUrl(row.storageId),
      })),
    );

    const onboarding = await ctx.db
      .query('staffOnboardingItems')
      .withIndex('by_employeeId', (q) => q.eq('employeeId', staff._id))
      .collect();

    const changeRequests = await ctx.db
      .query('staffChangeRequests')
      .withIndex('by_employeeId', (q) => q.eq('employeeId', staff._id))
      .collect();

    return {
      ...profile,
      hours,
      payHistory,
      timeOff: timeOffTypes,
      staffPay: canSeePay
        ? staffPay
        : staffPay.map((row) => ({
            _id: row._id,
            payrollId: row.payrollId,
            createdAt: row.createdAt,
          })),
      payItems,
      availablePayItemTypes,
      documents: documentsWithUrl,
      onboarding,
      changeRequests,
    };
  },
});

export const createStaff = mutation({
  args: {
    email: v.optional(v.string()),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    DoB: v.string(),
    stateOfOrigin: v.string(),
    salary: v.optional(v.number()),
    employmentStatus: v.optional(
      v.union(v.literal('employed'), v.literal('terminated'), v.literal('active')),
    ),
    LGA: v.string(),
    address: v.string(),
    dateRecruited: v.string(),
    dateTerminated: v.optional(v.string()),
    role: v.string(),
    department: v.optional(v.string()),
    position: v.optional(v.string()),
    employmentType: employmentTypeValidator,
    managerId: v.optional(v.id('staffs')),
    userId: v.optional(v.id('users')),
    clockMethod: v.optional(staffClockMethodValidator),
    payType: v.optional(payTypeValidator),
    hourlyRate: v.optional(v.number()),
    paymentMethod: v.optional(paymentMethodValidator),
    taxId: v.optional(v.string()),
    bankName: v.optional(v.string()),
    accountName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    routingCode: v.optional(v.string()),
    nationalId: v.optional(v.string()),
    idType: v.optional(idTypeValidator),
    emergencyName: v.optional(v.string()),
    emergencyPhone: v.optional(v.string()),
    emergencyRelationship: v.optional(v.string()),
    contractStartDate: v.optional(v.string()),
    contractEndDate: v.optional(v.string()),
    probationEndDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'staff.create');
    const propertyId = auth.propertyIds[0];
    const canPay = canUpdateCompensation(auth);

    try {
      if (args.email && (await emailTaken(ctx, args.email, propertyId))) {
        return { success: false, message: 'Staff already exists with that email at this property' };
      }

      if (args.userId) {
        const linkError = await assertLinkableUser(ctx, args.userId, propertyId);
        if (linkError) {
          return { success: false, message: linkError };
        }
      }
      if (args.managerId) {
        const managerError = await assertManager(ctx, args.managerId, propertyId);
        if (managerError) return { success: false, message: managerError };
      }

      const department = normalizeDepartment(args.department ?? departmentFromRole(args.role));
      let template = null;
      if (propertyId) {
        const rows = await ctx.db
          .query('shiftTemplates')
          .withIndex('by_propertyId_department', (q) =>
            q.eq('propertyId', propertyId).eq('department', department),
          )
          .collect();
        template =
          rows.find((row) => row.isActive && row.isDefault) ??
          rows.find((row) => row.isActive) ??
          null;
      }

      const clockMethod = args.clockMethod ?? defaultClockMethodForStaff(args.userId);
      if (clockMethod === 'self' && !args.userId) {
        return { success: false, message: 'Self-clock requires a linked login.' };
      }

      const property = propertyId ? await ctx.db.get(propertyId) : null;
      const employeeNumber = propertyId
        ? await nextEmployeeNumber(ctx, propertyId, property?.name)
        : undefined;
      const employmentType: EmploymentType = args.employmentType;
      const status = normalizeEmploymentStatus(args.employmentStatus ?? 'active');
      const payType = canPay ? (args.payType ?? 'salary') : 'salary';
      const baseSalary = args.salary ?? 0;
      const paymentMethod = canPay ? (args.paymentMethod ?? 'cash') : 'cash';

      const staffId = await ctx.db.insert('staffs', {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        phone: args.phone,
        DoB: args.DoB,
        stateOfOrigin: args.stateOfOrigin,
        salary: baseSalary,
        employmentStatus: status,
        LGA: args.LGA,
        address: args.address,
        dateRecruited: args.dateRecruited,
        dateTerminated: args.dateTerminated,
        role: args.role,
        position: args.position,
        propertyId,
        department,
        employmentType,
        managerId: args.managerId,
        shiftTemplateId: template?._id,
        clockMethod,
        employeeNumber,
        payType,
        baseSalary,
        hourlyRate: canPay ? args.hourlyRate : undefined,
        paymentMethod,
        taxId: canPay ? args.taxId : undefined,
        bankName: canPay ? args.bankName : undefined,
        accountName: canPay ? args.accountName : undefined,
        accountNumber: canPay ? args.accountNumber : undefined,
        routingCode: canPay ? args.routingCode : undefined,
        nationalId: args.nationalId,
        idType: args.idType,
        emergencyName: args.emergencyName,
        emergencyPhone: args.emergencyPhone,
        emergencyRelationship: args.emergencyRelationship,
        contractStartDate: args.contractStartDate,
        contractEndDate: args.contractEndDate,
        probationEndDate: args.probationEndDate,
        searchName: peopleSearchName(args.firstName, args.lastName),
        ...(args.userId ? { userId: args.userId } : {}),
      });

      if (propertyId) {
        await seedOnboardingItems(ctx, {
          propertyId,
          employeeId: staffId,
          employmentType,
          userId: args.userId,
          shiftTemplateId: template?._id,
        });
        await writeOpeningPayHistory(ctx, {
          employeeId: staffId,
          payType,
          baseSalary,
          hourlyRate: canPay ? args.hourlyRate : undefined,
          changedBy: auth.user._id,
          effectiveFrom: Date.parse(args.dateRecruited) || Date.now(),
        });
      }

      const suffix = template
        ? ` Assigned ${template.name} (${department}).`
        : ` No default shift exists yet for ${department} — define one under Shift Management.`;
      return {
        success: true,
        message: `Staff added successfully.${employeeNumber ? ` Employee number ${employeeNumber}.` : ''}${suffix}`,
        id: staffId,
        employeeNumber,
      };
    } catch (error) {
      console.log(`Insert failed ${error}`);
      return { success: false, message: 'Failed to create new staff!' };
    }
  },
});

export const updateStaff = mutation({
  args: {
    id: v.id('staffs'),
    email: v.optional(v.string()),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    DoB: v.string(),
    stateOfOrigin: v.string(),
    salary: v.optional(v.number()),
    employmentStatus: v.optional(
      v.union(v.literal('employed'), v.literal('terminated'), v.literal('active')),
    ),
    LGA: v.string(),
    address: v.string(),
    dateRecruited: v.optional(v.string()),
    dateTerminated: v.optional(v.string()),
    role: v.string(),
    department: v.optional(v.string()),
    position: v.optional(v.string()),
    employmentType: v.optional(employmentTypeValidator),
    managerId: v.optional(v.union(v.id('staffs'), v.null())),
    userId: v.optional(v.union(v.id('users'), v.null())),
    clockMethod: v.optional(staffClockMethodValidator),
    nationalId: v.optional(v.string()),
    idType: v.optional(idTypeValidator),
    emergencyName: v.optional(v.string()),
    emergencyPhone: v.optional(v.string()),
    emergencyRelationship: v.optional(v.string()),
    contractStartDate: v.optional(v.string()),
    contractEndDate: v.optional(v.string()),
    probationEndDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingStaff = await ctx.db.get(args.id);
    if (!existingStaff) {
      return { success: false, message: 'Staff does not exist!' };
    }
    await requirePermission(ctx, 'staff.update');
    const propertyId = existingStaff.propertyId;

    try {
      if (args.email && (await emailTaken(ctx, args.email, propertyId, existingStaff._id))) {
        return { success: false, message: 'Another staff member already uses that email at this property' };
      }
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
      if (args.managerId) {
        const managerError = await assertManager(ctx, args.managerId, propertyId, existingStaff._id);
        if (managerError) return { success: false, message: managerError };
      }

      const department = args.department
        ? normalizeDepartment(args.department)
        : normalizeDepartment(existingStaff.department ?? departmentFromRole(args.role));
      const departmentChanged = department !== existingStaff.department;
      const nextStatus = args.employmentStatus
        ? normalizeEmploymentStatus(args.employmentStatus)
        : normalizeEmploymentStatus(existingStaff.employmentStatus);

      const nextUserId = args.userId === null ? undefined : (args.userId ?? existingStaff.userId);
      const nextClockMethod =
        args.clockMethod ??
        existingStaff.clockMethod ??
        defaultClockMethodForStaff(nextUserId);
      if (nextClockMethod === 'self' && !nextUserId) {
        return { success: false, message: 'Self-clock requires a linked login.' };
      }

      await ctx.db.patch(existingStaff._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        employmentStatus: nextStatus,
        phone: args.phone,
        DoB: args.DoB,
        stateOfOrigin: args.stateOfOrigin,
        address: args.address,
        LGA: args.LGA,
        dateTerminated:
          nextStatus === 'terminated'
            ? args.dateTerminated || new Date().toISOString()
            : existingStaff.dateTerminated,
        department,
        role: args.role,
        position: args.position,
        employmentType: args.employmentType ?? existingStaff.employmentType,
        nationalId: args.nationalId,
        idType: args.idType,
        emergencyName: args.emergencyName,
        emergencyPhone: args.emergencyPhone,
        emergencyRelationship: args.emergencyRelationship,
        contractStartDate: args.contractStartDate,
        contractEndDate: args.contractEndDate,
        probationEndDate: args.probationEndDate,
        searchName: peopleSearchName(args.firstName, args.lastName),
        clockMethod: nextClockMethod,
        ...(args.userId ? { userId: args.userId } : {}),
        ...(args.managerId ? { managerId: args.managerId } : {}),
      });

      if (args.userId === null) {
        const latest = await ctx.db.get(existingStaff._id);
        if (latest) await unsetStaffUserId(ctx, latest);
        const afterUnlink = await ctx.db.get(existingStaff._id);
        if (afterUnlink && resolveStaffClockMethod(afterUnlink) === 'self') {
          await ctx.db.patch(afterUnlink._id, { clockMethod: 'supervisor' });
        }
      }
      if (args.managerId === null) {
        const latest = await ctx.db.get(existingStaff._id);
        if (latest) await unsetStaffManagerId(ctx, latest);
      }

      if (departmentChanged && existingStaff.propertyId) {
        await assignDefaultShiftTemplate(
          ctx,
          existingStaff._id,
          existingStaff.propertyId,
          department,
        );
      }

      return { success: true, message: 'Staff updated successfully' };
    } catch (error) {
      console.log(`Update failed ${error}`);
      return { success: false, message: 'Failed to update existing staff data' };
    }
  },
});

export const upsertPayHistory = mutation({
  args: {
    id: v.id('staffs'),
    payType: payTypeValidator,
    baseSalary: v.optional(v.number()),
    hourlyRate: v.optional(v.number()),
    paymentMethod: v.optional(paymentMethodValidator),
    taxId: v.optional(v.string()),
    bankName: v.optional(v.string()),
    accountName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    routingCode: v.optional(v.string()),
    effectiveFrom: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.id);
    if (!staff) return { success: false, message: 'Staff does not exist' };
    const auth = await requirePermission(ctx, 'staff.update', staff.propertyId);
    if (!canUpdateCompensation(auth)) {
      return { success: false, message: 'You cannot change compensation' };
    }
    if (args.paymentMethod === 'bank' && !args.accountNumber && !staff.accountNumber) {
      return { success: false, message: 'Bank account number is required for bank payment' };
    }
    const effectiveFrom = args.effectiveFrom ?? Date.now();
    await closeAndInsertPayHistory(ctx, {
      employeeId: staff._id,
      payType: args.payType,
      baseSalary: args.baseSalary,
      hourlyRate: args.hourlyRate,
      changedBy: auth.user._id,
      effectiveFrom,
    });
    await ctx.db.patch(staff._id, {
      payType: args.payType,
      baseSalary: args.baseSalary,
      hourlyRate: args.hourlyRate,
      salary: args.baseSalary ?? staff.salary,
      paymentMethod: args.paymentMethod ?? staff.paymentMethod,
      taxId: args.taxId ?? staff.taxId,
      bankName: args.bankName ?? staff.bankName,
      accountName: args.accountName ?? staff.accountName,
      accountNumber: args.accountNumber ?? staff.accountNumber,
      routingCode: args.routingCode ?? staff.routingCode,
    });
    return { success: true, message: 'Pay history updated' };
  },
});

export const terminateStaff = mutation({
  args: { id: v.id('staffs') },
  handler: async (ctx, args) => {
    try {
      return await terminateStaffRecord(ctx, args.id);
    } catch (error) {
      console.log(`Failed to terminate staff record ${error}`);
      return { success: false, message: 'Failed to terminate staff record' };
    }
  },
});

export const removeStaff = mutation({
  args: { id: v.id('staffs') },
  handler: async (ctx, args) => {
    try {
      return await terminateStaffRecord(ctx, args.id);
    } catch (error) {
      console.log(`Failed to terminate staff record ${error}`);
      return { success: false, message: 'Failed to terminate staff record' };
    }
  },
});

export const listStaffPayItems = query({
  args: { employeeId: v.id('staffs') },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'staff.read');
    if (!canReadCompensation(auth)) return [];
    const rows = await ctx.db
      .query('staffPayItems')
      .withIndex('by_employeeId', (q) => q.eq('employeeId', args.employeeId))
      .collect();
    return await Promise.all(
      rows.map(async (row) => {
        const type = await ctx.db.get(row.payItemTypeId);
        return { ...row, name: type?.name, code: type?.code, kind: type?.kind };
      }),
    );
  },
});

export const upsertStaffPayItem = mutation({
  args: {
    employeeId: v.id('staffs'),
    payItemTypeId: v.id('payItemTypes'),
    amount: v.optional(v.number()),
    rate: v.optional(v.number()),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.employeeId);
    if (!staff) return { success: false, message: 'Staff not found' };
    const auth = await requirePermission(ctx, 'staff.update', staff.propertyId);
    if (!canUpdateCompensation(auth)) {
      return { success: false, message: 'You cannot change pay items' };
    }
    const existing = await ctx.db
      .query('staffPayItems')
      .withIndex('by_employeeId_payItemTypeId', (q) =>
        q.eq('employeeId', args.employeeId).eq('payItemTypeId', args.payItemTypeId),
      )
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        amount: args.amount,
        rate: args.rate,
        isEnabled: args.isEnabled,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('staffPayItems', {
        employeeId: args.employeeId,
        payItemTypeId: args.payItemTypeId,
        amount: args.amount,
        rate: args.rate,
        isEnabled: args.isEnabled,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { success: true, message: 'Pay item saved' };
  },
});

export const generateStaffDocumentUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, 'staff.update');
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachStaffDocument = mutation({
  args: {
    employeeId: v.id('staffs'),
    kind: documentKindValidator,
    storageId: v.id('_storage'),
    fileName: v.string(),
    mimeType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.employeeId);
    if (!staff?.propertyId) return { success: false, message: 'Staff not found' };
    const auth = await requirePermission(ctx, 'staff.update', staff.propertyId);
    await ctx.db.insert('staffDocuments', {
      propertyId: staff.propertyId,
      employeeId: args.employeeId,
      kind: args.kind,
      storageId: args.storageId,
      fileName: args.fileName,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      uploadedBy: auth.user._id,
      createdAt: Date.now(),
    });
    return { success: true, message: 'Document attached' };
  },
});

export const listStaffDocuments = query({
  args: { employeeId: v.id('staffs') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'staff.read');
    const rows = await ctx.db
      .query('staffDocuments')
      .withIndex('by_employeeId', (q) => q.eq('employeeId', args.employeeId))
      .collect();
    return await Promise.all(
      rows.map(async (row) => ({
        ...row,
        url: await ctx.storage.getUrl(row.storageId),
      })),
    );
  },
});

export const deleteStaffDocument = mutation({
  args: { documentId: v.id('staffDocuments') },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return { success: false, message: 'Document not found' };
    await requirePermission(ctx, 'staff.update', doc.propertyId);
    await ctx.storage.delete(doc.storageId);
    await ctx.db.delete(doc._id);
    return { success: true, message: 'Document removed' };
  },
});

export const completeOnboardingItem = mutation({
  args: {
    itemId: v.id('staffOnboardingItems'),
    skipped: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return { success: false, message: 'Item not found' };
    const auth = await requirePermission(ctx, 'staff.update', item.propertyId);
    await ctx.db.patch(item._id, {
      skipped: args.skipped ?? false,
      completedAt: Date.now(),
      completedBy: auth.user._id,
      updatedAt: Date.now(),
    });
    return { success: true, message: args.skipped ? 'Item skipped' : 'Item completed' };
  },
});

export const getMyStaff = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireAuthenticated(ctx);
    const staff = await ctx.db
      .query('staffs')
      .withIndex('by_userId', (q) => q.eq('userId', auth.user._id))
      .first();
    if (!staff) return null;
    const profile = await enrichStaff(ctx, staff, true);
    return {
      ...profile,
      accountNumber: maskAccountNumber(staff.accountNumber),
    };
  },
});

export const getMyStaffDetail = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireAuthenticated(ctx);
    const staff = await ctx.db
      .query('staffs')
      .withIndex('by_userId', (q) => q.eq('userId', auth.user._id))
      .first();
    if (!staff) return null;

    const hours = (
      await ctx.db
        .query('hours')
        .withIndex('by_employeeId', (q) => q.eq('employeeId', staff._id))
        .collect()
    )
      .sort((a, b) => b.workDate - a.workDate)
      .slice(0, 10);

    const timeOff = (
      await ctx.db
        .query('timeOff')
        .withIndex('by_employeeId', (q) => q.eq('employeeId', staff._id))
        .collect()
    ).sort((a, b) => b.startDate - a.startDate);

    const timeOffTypes = await Promise.all(
      timeOff.map(async (row) => {
        const type = await ctx.db.get(row.timeOffTypeId);
        return { ...row, timeOffTypeName: type?.name ?? 'Unknown', paid: type?.paid ?? true };
      }),
    );

    const payslips = (
      await ctx.db
        .query('payslips')
        .withIndex('by_employeeId', (q) => q.eq('employeeId', staff._id))
        .collect()
    )
      .sort((a, b) => b.generatedAt - a.generatedAt)
      .slice(0, 8);

    const onboarding = await ctx.db
      .query('staffOnboardingItems')
      .withIndex('by_employeeId', (q) => q.eq('employeeId', staff._id))
      .collect();

    const changeRequests = await ctx.db
      .query('staffChangeRequests')
      .withIndex('by_employeeId', (q) => q.eq('employeeId', staff._id))
      .collect();

    const template = staff.shiftTemplateId ? await ctx.db.get(staff.shiftTemplateId) : null;
    const onLeave = await approvedTimeOffOverlapsToday(ctx, staff._id);
    const timeOffTypeOptions = staff.propertyId
      ? (
          await ctx.db
            .query('timeOffTypes')
            .withIndex('by_propertyId', (q) => q.eq('propertyId', staff.propertyId!))
            .collect()
        ).filter((row) => row.isActive)
      : [];

    return {
      ...stripCompensation({ ...staff }, false),
      paymentMethod: staff.paymentMethod,
      accountNumber: maskAccountNumber(staff.accountNumber),
      employmentStatus: normalizeEmploymentStatus(staff.employmentStatus),
      onLeave,
      shiftTemplateName: template?.name ?? null,
      hours,
      timeOff: timeOffTypes,
      timeOffTypes: timeOffTypeOptions.map((row) => ({
        _id: row._id,
        name: row.name,
        paid: row.paid,
      })),
      payslips,
      onboarding,
      changeRequests,
    };
  },
});

export const createChangeRequest = mutation({
  args: {
    kind: v.union(v.literal('contact'), v.literal('bank'), v.literal('emergency')),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticated(ctx);
    const staff = await ctx.db
      .query('staffs')
      .withIndex('by_userId', (q) => q.eq('userId', auth.user._id))
      .first();
    if (!staff?.propertyId) {
      return { success: false, message: 'No staff record is linked to your login.' };
    }
    const now = Date.now();
    await ctx.db.insert('staffChangeRequests', {
      propertyId: staff.propertyId,
      employeeId: staff._id,
      kind: args.kind,
      payload: args.payload,
      status: 'pending',
      requestedBy: auth.user._id,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, message: 'Change request submitted for HR approval' };
  },
});

export const reviewChangeRequest = mutation({
  args: {
    requestId: v.id('staffChangeRequests'),
    status: v.union(v.literal('approved'), v.literal('rejected')),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return { success: false, message: 'Request not found' };
    const auth = await requirePermission(ctx, 'staff.update', request.propertyId);
    if (request.kind === 'bank' && args.status === 'approved' && !canUpdateCompensation(auth)) {
      return { success: false, message: 'You cannot approve bank detail changes' };
    }
    if (args.status === 'approved') {
      const staff = await ctx.db.get(request.employeeId);
      if (!staff) return { success: false, message: 'Staff not found' };
      const payload = request.payload as Record<string, string | undefined>;
      if (request.kind === 'contact') {
        await ctx.db.patch(staff._id, {
          phone: payload.phone ?? staff.phone,
          address: payload.address ?? staff.address,
          email: payload.email ?? staff.email,
        });
      } else if (request.kind === 'emergency') {
        await ctx.db.patch(staff._id, {
          emergencyName: payload.emergencyName ?? staff.emergencyName,
          emergencyPhone: payload.emergencyPhone ?? staff.emergencyPhone,
          emergencyRelationship: payload.emergencyRelationship ?? staff.emergencyRelationship,
        });
      } else if (request.kind === 'bank') {
        await ctx.db.patch(staff._id, {
          paymentMethod:
            (payload.paymentMethod as Doc<'staffs'>['paymentMethod']) ?? staff.paymentMethod,
          bankName: payload.bankName ?? staff.bankName,
          accountName: payload.accountName ?? staff.accountName,
          accountNumber: payload.accountNumber ?? staff.accountNumber,
          routingCode: payload.routingCode ?? staff.routingCode,
        });
      }
    }
    await ctx.db.patch(request._id, {
      status: args.status,
      reviewedBy: auth.user._id,
      reviewedAt: Date.now(),
      notes: args.notes,
      updatedAt: Date.now(),
    });
    return {
      success: true,
      message: args.status === 'approved' ? 'Request approved' : 'Request rejected',
    };
  },
});

export const requestOwnTimeOff = mutation({
  args: {
    timeOffTypeId: v.id('timeOffTypes'),
    startDate: v.number(),
    endDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticated(ctx);
    const staff = await ctx.db
      .query('staffs')
      .withIndex('by_userId', (q) => q.eq('userId', auth.user._id))
      .first();
    if (!staff?.propertyId) {
      return { success: false, message: 'No staff record is linked to your login.' };
    }
    const timeOffType = await ctx.db.get(args.timeOffTypeId);
    if (!timeOffType || timeOffType.propertyId !== staff.propertyId || !timeOffType.isActive) {
      return { success: false, message: 'Select a valid time-off type for this property.' };
    }
    const startDate = startOfUtcDay(args.startDate);
    const endDate = startOfUtcDay(args.endDate);
    if (endDate < startDate) {
      return { success: false, message: 'End date must be on or after start date' };
    }
    const now = Date.now();
    const id = await ctx.db.insert('timeOff', {
      propertyId: staff.propertyId,
      employeeId: staff._id,
      timeOffTypeId: args.timeOffTypeId,
      startDate,
      endDate,
      days: workingDaysInclusive(startDate, endDate),
      status: 'pending',
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, message: 'Time off requested', id };
  },
});
