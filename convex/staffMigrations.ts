import { internalMutation, internalQuery } from "./_generated/server";
import { peopleSearchName } from "./lib/searchNames";
import {
  nextEmployeeNumber,
  normalizeEmploymentStatus,
  seedOnboardingItems,
  writeOpeningPayHistory,
} from "./lib/staffAccess";

export const needsStaffHrBackfill = internalQuery({
  args: {},
  handler: async (ctx) => {
    const staffs = await ctx.db.query("staffs").take(80);
    return staffs.some(
      (row) =>
        !row.propertyId ||
        !row.employeeNumber ||
        !row.employmentType ||
        row.employmentStatus === "employed" ||
        row.employmentStatus === "on-leave" ||
        row.baseSalary === undefined,
    );
  },
});

export const backfillStaffHr = internalMutation({
  args: {},
  handler: async (ctx) => {
    const staffs = await ctx.db.query("staffs").collect();
    let patched = 0;
    let payHistoryCreated = 0;
    let onboardingSeeded = 0;

    for (const staff of staffs) {
      const scopedPropertyId = staff.propertyId;
      if (!scopedPropertyId) continue;
      const property = await ctx.db.get(scopedPropertyId);
      const patch: Record<string, unknown> = {};
      if (!staff.employmentType) patch.employmentType = "full-time";
      const status = normalizeEmploymentStatus(staff.employmentStatus);
      if (staff.employmentStatus !== status) patch.employmentStatus = status;
      if (staff.baseSalary === undefined) patch.baseSalary = staff.salary;
      if (!staff.payType) patch.payType = "salary";
      if (!staff.paymentMethod) patch.paymentMethod = "cash";
      const searchName = peopleSearchName(staff.firstName, staff.lastName);
      if (staff.searchName !== searchName) patch.searchName = searchName;
      if (!staff.employeeNumber) {
        patch.employeeNumber = await nextEmployeeNumber(
          ctx,
          scopedPropertyId,
          property?.name,
        );
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(staff._id, patch);
        patched += 1;
      }

      const actor = await ctx.db
        .query("userRoles")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", scopedPropertyId))
        .first();

      const existingPay = await ctx.db
        .query("payHistory")
        .withIndex("by_employeeId", (q) => q.eq("employeeId", staff._id))
        .first();
      if (!existingPay && actor) {
        await writeOpeningPayHistory(ctx, {
          employeeId: staff._id,
          payType: staff.payType ?? "salary",
          baseSalary: staff.baseSalary ?? staff.salary,
          hourlyRate: staff.hourlyRate,
          changedBy: actor.userId,
          effectiveFrom: Date.parse(staff.dateRecruited) || Date.now(),
        });
        payHistoryCreated += 1;
      }

      const existingOnboarding = await ctx.db
        .query("staffOnboardingItems")
        .withIndex("by_employeeId", (q) => q.eq("employeeId", staff._id))
        .first();
      if (!existingOnboarding) {
        await seedOnboardingItems(ctx, {
          propertyId: scopedPropertyId,
          employeeId: staff._id,
          employmentType: staff.employmentType ?? "full-time",
          userId: staff.userId,
          shiftTemplateId: staff.shiftTemplateId,
        });
        onboardingSeeded += 1;
      }
    }

    return { patched, payHistoryCreated, onboardingSeeded };
  },
});
