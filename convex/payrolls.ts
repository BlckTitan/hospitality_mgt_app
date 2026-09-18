import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { requirePermission } from "./lib/rbac";
import { postCashOutflow } from "./lib/postCashOutflow";
import {
  applyPayItemType,
  overlapWorkingDays,
  periodFromSchedule,
  roundMoney,
  startOfUtcDay,
  workingDaysInclusive,
} from "./lib/payrollHelpers";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  calculated: "Ready to review",
  approved: "Approved",
  processed: "Payment files ready",
  paid: "Paid",
};

function staffPayType(staff: Doc<"staffs">): "hourly" | "salary" | "mixed" {
  return staff.payType ?? "salary";
}

async function currentCompensation(ctx: { db: any }, employeeId: Id<"staffs">) {
  const rows: Doc<"payHistory">[] = await ctx.db
    .query("payHistory")
    .withIndex("by_employeeId", (q: any) => q.eq("employeeId", employeeId))
    .collect();
  return rows.find((row) => row.effectiveTo === undefined) ?? null;
}

export const listPayrolls = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "payroll.run.read", args.propertyId);
    const rows = await ctx.db
      .query("payrolls")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    rows.sort((a, b) => b.payPeriodEnd - a.payPeriodEnd);
    return {
      success: true,
      data: rows.map((row) => ({ ...row, statusLabel: STATUS_LABEL[row.status] ?? row.status })),
    };
  },
});

export const getPayroll = query({
  args: { payrollId: v.id("payrolls") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.payrollId);
    if (!run) return { success: false, data: null, message: "Payroll not found" };
    await requirePermission(ctx, "payroll.run.read", run.propertyId);
    const lines = await ctx.db
      .query("staffPay")
      .withIndex("by_payrollId", (q) => q.eq("payrollId", run._id))
      .collect();
    const staffPay = await Promise.all(
      lines.map(async (line) => {
        const staff = await ctx.db.get(line.employeeId);
        const items = await ctx.db
          .query("payItems")
          .withIndex("by_staffPayId", (q) => q.eq("staffPayId", line._id))
          .collect();
        const payslip = await ctx.db
          .query("payslips")
          .withIndex("by_staffPayId", (q) => q.eq("staffPayId", line._id))
          .first();
        return {
          ...line,
          staffName: staff ? `${staff.firstName} ${staff.lastName}` : "Unknown",
          paymentMethod: staff?.paymentMethod ?? "cash",
          items,
          payslipId: payslip?._id,
        };
      })
    );
    const exports = await ctx.db
      .query("paymentFiles")
      .withIndex("by_payrollId", (q) => q.eq("payrollId", run._id))
      .collect();
    const schedule = await ctx.db.get(run.payCycleId);
    return {
      success: true,
      data: {
        ...run,
        statusLabel: STATUS_LABEL[run.status] ?? run.status,
        schedule,
        staffPay,
        exports,
      },
    };
  },
});

export const startPayroll = mutation({
  args: {
    propertyId: v.id("properties"),
    payCycleId: v.id("payCycles"),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, "payroll.run.create", args.propertyId);
    const schedule = await ctx.db.get(args.payCycleId);
    if (!schedule || schedule.propertyId !== args.propertyId) {
      return { success: false, message: "Pay cycle not found" };
    }
    const period = periodFromSchedule(schedule.frequency, schedule.anchorDate);
    const open = await ctx.db
      .query("payrolls")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const overlap = open.find(
      (run) =>
        (run.status === "draft" || run.status === "calculated") &&
        run.payPeriodStart <= period.payPeriodEnd &&
        run.payPeriodEnd >= period.payPeriodStart
    );
    if (overlap) {
      return { success: false, message: "An open Payroll already covers this period" };
    }
    const now = Date.now();
    const id = await ctx.db.insert("payrolls", {
      propertyId: args.propertyId,
      payCycleId: schedule._id,
      runType: "regular",
      payPeriodStart: period.payPeriodStart,
      payPeriodEnd: period.payPeriodEnd,
      payDate: period.payDate,
      payFrequency: schedule.frequency,
      cutoffDaysBeforePayDate: schedule.cutoffDaysBeforePayDate,
      status: "draft",
      totalGrossPay: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      createdBy: auth.user._id,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, message: "Payroll started", id };
  },
});

async function unlockHoursForPayroll(ctx: { db: any }, runId: Id<"payrolls">) {
  const locked: Doc<"hours">[] = await ctx.db
    .query("hours")
    .withIndex("by_lockedByPayrollId", (q: any) => q.eq("lockedByPayrollId", runId))
    .collect();
  for (const sheet of locked) {
    await ctx.db.patch(sheet._id, {
      lockedAt: undefined,
      lockedByPayrollId: undefined,
      staffPayId: undefined,
      updatedAt: Date.now(),
    });
  }
}

export const preparePay = mutation({
  args: { payrollId: v.id("payrolls") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.payrollId);
    if (!run) return { success: false, message: "Payroll not found" };
    const auth = await requirePermission(ctx, "payroll.run.calculate", run.propertyId);
    if (run.status !== "draft" && run.status !== "calculated") {
      return { success: false, message: "Only Draft or Ready to review payrolls can be prepared" };
    }

    await unlockHoursForPayroll(ctx, run._id);
    const existingLines = await ctx.db
      .query("staffPay")
      .withIndex("by_payrollId", (q) => q.eq("payrollId", run._id))
      .collect();
    for (const line of existingLines) {
      const items = await ctx.db
        .query("payItems")
        .withIndex("by_staffPayId", (q) => q.eq("staffPayId", line._id))
        .collect();
      for (const item of items) await ctx.db.delete(item._id);
      await ctx.db.delete(line._id);
    }

    const settings = await ctx.db
      .query("payrollSettings")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", run.propertyId))
      .first();
    const otMultiplier = settings?.overtimeMultiplier ?? 1.5;
    const cutoff = startOfUtcDay(run.payDate) - run.cutoffDaysBeforePayDate * 24 * 60 * 60 * 1000;

    const staffs = (
      await ctx.db
        .query("staffs")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", run.propertyId))
        .collect()
    ).concat((await ctx.db.query("staffs").collect()).filter((s) => !s.propertyId));

    const hours = await ctx.db
      .query("hours")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", run.propertyId))
      .collect();
    const leave = await ctx.db
      .query("timeOff")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", run.propertyId))
      .collect();
    const components = await ctx.db
      .query("payItemTypes")
      .withIndex("by_propertyId_isActive", (q) =>
        q.eq("propertyId", run.propertyId).eq("isActive", true)
      )
      .collect();

    const periodDays = workingDaysInclusive(run.payPeriodStart, run.payPeriodEnd);
    let totalGross = 0;
    let totalDed = 0;
    let totalNet = 0;
    const now = Date.now();

    for (const staff of staffs) {
      const payType = staffPayType(staff);
      const approvedHours = hours.filter(
        (h) =>
          h.employeeId === staff._id &&
          h.status === "approved" &&
          !h.lockedAt &&
          h.workDate >= run.payPeriodStart &&
          h.workDate <= run.payPeriodEnd &&
          (h.approvedAt ?? h.updatedAt) <= cutoff
      );
      const approvedLeave = leave.filter(
        (l) =>
          l.employeeId === staff._id &&
          l.status === "approved" &&
          l.startDate <= run.payPeriodEnd &&
          l.endDate >= run.payPeriodStart &&
          (l.approvedAt ?? l.updatedAt) <= cutoff
      );

      const hasHours = approvedHours.length > 0;
      const hasUnpaid = approvedLeave.length > 0;
      const active = staff.employmentStatus === "active" || staff.employmentStatus === "employed";
      if (!active && !hasHours && !hasUnpaid) continue;

      let unpaidDays = 0;
      for (const entry of approvedLeave) {
        const type = await ctx.db.get(entry.timeOffTypeId);
        if (type && !type.paid) {
          unpaidDays += overlapWorkingDays(run.payPeriodStart, run.payPeriodEnd, entry.startDate, entry.endDate);
        }
      }

      const compensation = await currentCompensation(ctx, staff._id);
      const hourlyRate = compensation?.hourlyRate ?? staff.hourlyRate ?? 0;
      const baseSalary = compensation?.baseSalary ?? staff.baseSalary ?? staff.salary ?? 0;

      let regularHours = approvedHours.reduce((sum, h) => sum + h.regularHours, 0);
      let overtimeHours = approvedHours.reduce((sum, h) => sum + h.overtimeHours, 0);
      if (payType === "hourly" && approvedHours.length === 0) {
        regularHours = 0;
        overtimeHours = 0;
      }

      let regularPay = 0;
      let overtimePay = 0;
      if (payType === "hourly") {
        regularPay = regularHours * hourlyRate;
        overtimePay = overtimeHours * hourlyRate * otMultiplier;
      } else {
        const paidFraction = Math.max(0, (periodDays - unpaidDays) / periodDays);
        regularPay = baseSalary * paidFraction;
        if (payType === "mixed") {
          overtimePay = overtimeHours * hourlyRate * otMultiplier;
        }
      }
      regularPay = roundMoney(regularPay);
      overtimePay = roundMoney(overtimePay);

      const lineId = await ctx.db.insert("staffPay", {
        payrollId: run._id,
        employeeId: staff._id,
        payHistoryIdUsed: compensation?._id,
        payTypeUsed: payType,
        hourlyRateUsed: hourlyRate || undefined,
        baseSalaryUsed: baseSalary || undefined,
        overtimeMultiplierUsed: otMultiplier,
        regularHours,
        overtimeHours,
        regularPay,
        overtimePay,
        grossPay: 0,
        totalDeductions: 0,
        netPay: 0,
        createdAt: now,
        updatedAt: now,
      });

      const items: Array<{ kind: any; code: string; label: string; amount: number }> = [
        { kind: "earning", code: "BASIC", label: "Basic pay", amount: regularPay },
      ];
      if (overtimePay > 0) {
        items.push({ kind: "overtime", code: "OT", label: "Overtime", amount: overtimePay });
      }

      let gross = regularPay + overtimePay;
      const overrides = await ctx.db
        .query("staffPayItems")
        .withIndex("by_employeeId", (q) => q.eq("employeeId", staff._id))
        .collect();

      for (const component of components) {
        const override = overrides.find((o) => o.payItemTypeId === component._id);
        if (override && !override.isEnabled) continue;
        const amount = applyPayItemType({
          calculation: component.calculation,
          formulaKey: component.formulaKey,
          params: component.params as Record<string, unknown> | undefined,
          amount: override?.amount,
          rate: override?.rate,
          defaultAmount: component.defaultAmount,
          defaultRate: component.defaultRate,
          gross,
          frequency: run.payFrequency,
        });
        if (amount === 0) continue;
        items.push({
          kind: component.kind === "deduction" ? "deduction" : component.kind === "allowance" ? "allowance" : "earning",
          code: component.code,
          label: component.name,
          amount,
        });
      }

      let deductions = 0;
      let finalGross = 0;
      for (const item of items) {
        await ctx.db.insert("payItems", {
          staffPayId: lineId,
          kind: item.kind,
          code: item.code,
          label: item.label,
          amount: item.amount,
          createdAt: now,
        });
        if (item.kind === "deduction") deductions += item.amount;
        else finalGross += item.amount;
      }
      const net = roundMoney(finalGross - deductions);
      await ctx.db.patch(lineId, {
        grossPay: roundMoney(finalGross),
        totalDeductions: roundMoney(deductions),
        netPay: net,
        updatedAt: now,
      });

      for (const sheet of approvedHours) {
        await ctx.db.patch(sheet._id, {
          lockedAt: now,
          lockedByPayrollId: run._id,
          staffPayId: lineId,
          updatedAt: now,
        });
      }

      totalGross += finalGross;
      totalDed += deductions;
      totalNet += net;
    }

    await ctx.db.patch(run._id, {
      status: "calculated",
      calculatedBy: auth.user._id,
      totalGrossPay: roundMoney(totalGross),
      totalDeductions: roundMoney(totalDed),
      totalNetPay: roundMoney(totalNet),
      updatedAt: now,
    });
    return { success: true, message: "Pay prepared" };
  },
});

export const approvePayroll = mutation({
  args: { payrollId: v.id("payrolls") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.payrollId);
    if (!run) return { success: false, message: "Payroll not found" };
    const auth = await requirePermission(ctx, "payroll.run.approve", run.propertyId);
    if (run.status !== "calculated") {
      return { success: false, message: "Prepare pay before Approve payroll" };
    }
    if (auth.user._id === run.createdBy || auth.user._id === run.calculatedBy) {
      return { success: false, message: "Maker cannot approve this Payroll. Another user must Approve payroll." };
    }

    const lines = await ctx.db
      .query("staffPay")
      .withIndex("by_payrollId", (q) => q.eq("payrollId", run._id))
      .collect();
    const now = Date.now();

    for (const line of lines) {
      const staff = await ctx.db.get(line.employeeId);
      const items = await ctx.db
        .query("payItems")
        .withIndex("by_staffPayId", (q) => q.eq("staffPayId", line._id))
        .collect();
      const existing = await ctx.db
        .query("payslips")
        .withIndex("by_staffPayId", (q) => q.eq("staffPayId", line._id))
        .first();
      if (!existing) {
        await ctx.db.insert("payslips", {
          staffPayId: line._id,
          propertyId: run.propertyId,
          employeeId: line.employeeId,
          snapshot: {
            staffName: staff ? `${staff.firstName} ${staff.lastName}` : "Staff",
            periodStart: run.payPeriodStart,
            periodEnd: run.payPeriodEnd,
            payDate: run.payDate,
            grossPay: line.grossPay,
            totalDeductions: line.totalDeductions,
            netPay: line.netPay,
            items: items.map((i) => ({ code: i.code, label: i.label, kind: i.kind, amount: i.amount })),
          },
          generatedAt: now,
          createdAt: now,
        });
      }
    }

    const journalId = await ctx.db.insert("journalEntries", {
      propertyId: run.propertyId,
      referenceType: "Payroll",
      referenceId: run._id,
      status: "posted",
      totalDebit: run.totalGrossPay,
      totalCredit: run.totalGrossPay,
      postedAt: now,
      postedBy: auth.user._id,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("journalEntryLines", {
      journalEntryId: journalId,
      accountCode: "5100",
      accountName: "Labor expense",
      debit: run.totalGrossPay,
      credit: 0,
      description: "Payroll labor",
    });
    await ctx.db.insert("journalEntryLines", {
      journalEntryId: journalId,
      accountCode: "2100",
      accountName: "Employee deductions payable",
      debit: 0,
      credit: run.totalDeductions,
    });
    await ctx.db.insert("journalEntryLines", {
      journalEntryId: journalId,
      accountCode: "2110",
      accountName: "Wages payable",
      debit: 0,
      credit: run.totalNetPay,
    });

    await ctx.db.patch(run._id, {
      status: "approved",
      approvedBy: auth.user._id,
      approvedAt: now,
      updatedAt: now,
    });
    return { success: true, message: "Payroll approved" };
  },
});

export const downloadPaymentFiles = mutation({
  args: { payrollId: v.id("payrolls") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.payrollId);
    if (!run) return { success: false, message: "Payroll not found" };
    const auth = await requirePermission(ctx, "payroll.run.export", run.propertyId);
    if (run.status !== "approved" && run.status !== "processed") {
      return { success: false, message: "Approve payroll before downloading payment files" };
    }
    const lines = await ctx.db
      .query("staffPay")
      .withIndex("by_payrollId", (q) => q.eq("payrollId", run._id))
      .collect();
    const bankRows: string[] = ["staff,accountName,accountNumber,bankName,routingCode,netPay"];
    const cashRows: string[] = ["staff,paymentMethod,netPay"];
    for (const line of lines) {
      const staff = await ctx.db.get(line.employeeId);
      const name = staff ? `${staff.firstName} ${staff.lastName}` : line.employeeId;
      if (staff?.paymentMethod === "bank") {
        bankRows.push(
          [name, staff.accountName ?? "", staff.accountNumber ?? "", staff.bankName ?? "", staff.routingCode ?? "", line.netPay].join(",")
        );
      } else {
        cashRows.push([name, staff?.paymentMethod ?? "cash", line.netPay].join(","));
      }
    }
    const now = Date.now();
    const existing = await ctx.db
      .query("paymentFiles")
      .withIndex("by_payrollId", (q) => q.eq("payrollId", run._id))
      .collect();
    for (const row of existing) await ctx.db.delete(row._id);

    await ctx.db.insert("paymentFiles", {
      payrollId: run._id,
      format: "generic_csv",
      status: "generated",
      content: bankRows.join("\n"),
      generatedBy: auth.user._id,
      generatedAt: now,
      createdAt: now,
    });
    await ctx.db.insert("paymentFiles", {
      payrollId: run._id,
      format: "cash_sheet",
      status: "generated",
      content: cashRows.join("\n"),
      generatedBy: auth.user._id,
      generatedAt: now,
      createdAt: now,
    });
    await ctx.db.patch(run._id, { status: "processed", processedAt: now, updatedAt: now });
    return { success: true, message: "Payment files ready" };
  },
});

function payrollExpenseDescription(run: Doc<"payrolls">) {
  const start = new Date(run.payPeriodStart).toISOString().slice(0, 10);
  const end = new Date(run.payPeriodEnd).toISOString().slice(0, 10);
  return `Payroll ${start} – ${end}`;
}

async function postPayrollExpense(
  ctx: Parameters<typeof postCashOutflow>[0],
  run: Doc<"payrolls">,
  createdBy: Id<"users">,
  expenseDate: number,
) {
  if (run.totalNetPay <= 0) {
    return null;
  }
  return await postCashOutflow(ctx, {
    propertyId: run.propertyId,
    sourceType: "Payroll",
    sourceId: run._id,
    amount: run.totalNetPay,
    category: "staff",
    description: payrollExpenseDescription(run),
    vendor: "Payroll",
    paymentMethod: "bank_transfer",
    paymentType: "payroll",
    createdBy,
    expenseDate,
  });
}

export const markAsPaid = mutation({
  args: { payrollId: v.id("payrolls") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.payrollId);
    if (!run) return { success: false, message: "Payroll not found" };
    const auth = await requirePermission(ctx, "payroll.run.mark_paid", run.propertyId);
    if (run.status === "paid" && run.expenseId) {
      return { success: true, message: "Payroll already marked as paid" };
    }
    if (run.status !== "processed" && run.status !== "approved" && run.status !== "paid") {
      return { success: false, message: "Download payment files (or approve) before Mark as paid" };
    }
    const now = Date.now();
    const posted = await postPayrollExpense(ctx, run, auth.user._id, run.paidAt ?? now);
    await ctx.db.patch(run._id, {
      status: "paid",
      paidAt: run.paidAt ?? now,
      expenseId: posted?.expenseId ?? run.expenseId,
      updatedAt: now,
    });
    return { success: true, message: "Payroll marked as paid" };
  },
});

export const backfillPaidPayrollExpenses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const runs = await ctx.db.query("payrolls").collect();
    let posted = 0;
    for (const run of runs) {
      if (run.status !== "paid" || run.expenseId || run.totalNetPay <= 0) {
        continue;
      }
      const createdBy = run.approvedBy ?? run.createdBy;
      const result = await postPayrollExpense(ctx, run, createdBy, run.paidAt ?? run.updatedAt);
      if (result) {
        await ctx.db.patch(run._id, {
          expenseId: result.expenseId,
          updatedAt: Date.now(),
        });
        posted += 1;
      }
    }
    return { success: true, posted };
  },
});

export const getPayslip = query({
  args: { payslipId: v.id("payslips") },
  handler: async (ctx, args) => {
    const payslip = await ctx.db.get(args.payslipId);
    if (!payslip) return { success: false, data: null, message: "Payslip not found" };
    await requirePermission(ctx, "payroll.payslip.read", payslip.propertyId);
    const line = await ctx.db.get(payslip.staffPayId);
    const run = line ? await ctx.db.get(line.payrollId) : null;
    const staff = await ctx.db.get(payslip.employeeId);
    return { success: true, data: { payslip, line, run, staff } };
  },
});
