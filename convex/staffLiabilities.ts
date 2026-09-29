import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/rbac';

const kindValidator = v.union(v.literal('cash_shortage'), v.literal('stock_shortage'));
const statusValidator = v.union(
  v.literal('pending'),
  v.literal('approved'),
  v.literal('waived'),
  v.literal('collected'),
  v.literal('deducted'),
);

export const listStaffLiabilities = query({
  args: {
    propertyId: v.id('properties'),
    status: v.optional(statusValidator),
    employeeId: v.optional(v.id('staffs')),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'fnb.read', args.propertyId);
    let rows = args.status
      ? await ctx.db
          .query('staffLiabilities')
          .withIndex('by_propertyId_status', (q) =>
            q.eq('propertyId', args.propertyId).eq('status', args.status!),
          )
          .collect()
      : await ctx.db
          .query('staffLiabilities')
          .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
          .collect();
    if (args.employeeId) {
      rows = rows.filter((r) => r.employeeId === args.employeeId);
    }
    rows.sort((a, b) => b.createdAt - a.createdAt);
    const data = await Promise.all(
      rows.slice(0, 200).map(async (row) => {
        const staff = await ctx.db.get(row.employeeId);
        return {
          ...row,
          staffName: staff ? `${staff.firstName} ${staff.lastName}` : 'Staff',
        };
      }),
    );
    return { success: true, data };
  },
});

export const createStaffLiability = mutation({
  args: {
    propertyId: v.id('properties'),
    employeeId: v.id('staffs'),
    kind: kindValidator,
    amount: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'fnb.update', args.propertyId);
    if (!Number.isFinite(args.amount) || args.amount <= 0) {
      return { success: false, message: 'Amount must be greater than 0' };
    }
    const reason = args.reason.trim();
    if (reason.length < 3) {
      return { success: false, message: 'Enter a short reason' };
    }
    const staff = await ctx.db.get(args.employeeId);
    if (!staff || (staff.propertyId && staff.propertyId !== args.propertyId)) {
      return { success: false, message: 'Staff not found for this property' };
    }
    const now = Date.now();
    const amount = Math.round((args.amount + Number.EPSILON) * 100) / 100;
    const id = await ctx.db.insert('staffLiabilities', {
      propertyId: args.propertyId,
      employeeId: args.employeeId,
      kind: args.kind,
      amount,
      remainingAmount: amount,
      reason,
      sourceType: 'manual',
      status: 'pending',
      createdBy: auth.user._id,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, message: 'Liability created (pending approval)', data: { id } };
  },
});

export const approveStaffLiability = mutation({
  args: { liabilityId: v.id('staffLiabilities') },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.liabilityId);
    if (!row) return { success: false, message: 'Liability not found' };
    const auth = await requirePermission(ctx, 'fnb.update', row.propertyId);
    if (row.status !== 'pending') {
      return { success: false, message: 'Only pending liabilities can be approved' };
    }
    const now = Date.now();
    await ctx.db.patch(args.liabilityId, {
      status: 'approved',
      approvedBy: auth.user._id,
      approvedAt: now,
      updatedAt: now,
    });
    return {
      success: true,
      message: 'Approved — will deduct on next Prepare pay (or mark collected)',
    };
  },
});

export const waiveStaffLiability = mutation({
  args: { liabilityId: v.id('staffLiabilities'), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.liabilityId);
    if (!row) return { success: false, message: 'Liability not found' };
    const auth = await requirePermission(ctx, 'fnb.update', row.propertyId);
    if (row.status !== 'pending' && row.status !== 'approved') {
      return { success: false, message: 'Only pending or approved liabilities can be waived' };
    }
    if (row.includedInPayrollId) {
      return { success: false, message: 'Already included in a payroll run' };
    }
    const now = Date.now();
    await ctx.db.patch(args.liabilityId, {
      status: 'waived',
      remainingAmount: 0,
      reason: args.note?.trim()
        ? `${row.reason} — Waived: ${args.note.trim()}`
        : row.reason,
      resolvedAt: now,
      resolvedBy: auth.user._id,
      updatedAt: now,
    });
    return { success: true, message: 'Liability waived' };
  },
});

export const collectStaffLiability = mutation({
  args: {
    liabilityId: v.id('staffLiabilities'),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.liabilityId);
    if (!row) return { success: false, message: 'Liability not found' };
    const auth = await requirePermission(ctx, 'fnb.update', row.propertyId);
    if (row.status !== 'pending' && row.status !== 'approved') {
      return { success: false, message: 'Only pending or approved liabilities can be collected' };
    }
    if (row.includedInPayrollId) {
      return { success: false, message: 'Already included in a payroll run — finish that run first' };
    }
    const take =
      args.amount === undefined
        ? row.remainingAmount
        : Math.round((args.amount + Number.EPSILON) * 100) / 100;
    if (!Number.isFinite(take) || take <= 0) {
      return { success: false, message: 'Collection amount must be greater than 0' };
    }
    if (take > row.remainingAmount + 0.0001) {
      return { success: false, message: 'Cannot collect more than remaining' };
    }
    const remaining = Math.round((row.remainingAmount - take + Number.EPSILON) * 100) / 100;
    const now = Date.now();
    await ctx.db.patch(args.liabilityId, {
      remainingAmount: remaining,
      status: remaining <= 0.0001 ? 'collected' : row.status === 'pending' ? 'approved' : row.status,
      resolvedAt: remaining <= 0.0001 ? now : row.resolvedAt,
      resolvedBy: remaining <= 0.0001 ? auth.user._id : row.resolvedBy,
      updatedAt: now,
    });
    return {
      success: true,
      message: remaining <= 0.0001 ? 'Fully collected' : 'Partial collection recorded',
    };
  },
});
