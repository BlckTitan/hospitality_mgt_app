import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { resolveJurisdictionPack } from "./lib/payrollPacks";
import { seedPayrollForProperty, startOfUtcDay } from "./lib/payrollHelpers";

const SETTINGS_CODE = /^\d{6}$/;

function parseSettingsCode(code: string) {
  const normalized = code.trim();
  if (!SETTINGS_CODE.test(normalized)) {
    return { ok: false as const, message: "Code must be exactly 6 digits" };
  }
  return { ok: true as const, code: normalized };
}

function sameName(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export const getSettings = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "payroll.run.read", args.propertyId);
    const settings = await ctx.db
      .query("payrollSettings")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .first();
    const payCycles = await ctx.db
      .query("payCycles")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const timeOffTypes = await ctx.db
      .query("timeOffTypes")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const payItemTypes = await ctx.db
      .query("payItemTypes")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const extraPayRules = await ctx.db
      .query("extraPayRules")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const calendar = await ctx.db
      .query("holidayCalendars")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .first();
    const holidays = calendar
      ? await ctx.db
          .query("holidays")
          .withIndex("by_holidayCalendarId", (q) => q.eq("holidayCalendarId", calendar._id))
          .collect()
      : [];
    const property = await ctx.db.get(args.propertyId);
    return {
      success: true,
      data: {
        property,
        settings,
        payCycles,
        timeOffTypes,
        payItemTypes,
        extraPayRules,
        calendar,
        holidays,
      },
    };
  },
});

/** Seeds Payroll settings from Property.country (or an explicit country). */
export const seedSettings = mutation({
  args: {
    propertyId: v.id("properties"),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "payroll.settings.update", args.propertyId);
    const property = await ctx.db.get(args.propertyId);
    if (!property) return { success: false, message: "Property not found" };

    const country = (args.country || property.country || "").trim().toUpperCase();
    if (!country) {
      return { success: false, message: "Set a country on the property before seeding Payroll settings" };
    }

    const existing = await ctx.db
      .query("payrollSettings")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .first();
    if (existing) {
      return { success: false, message: "Payroll settings already exist for this property" };
    }

    if (!property.country) {
      await ctx.db.patch(args.propertyId, { country });
    }

    const pack = resolveJurisdictionPack(country);
    await seedPayrollForProperty(ctx, args.propertyId, country);
    return { success: true, message: `Seeded ${pack.id} pack` };
  },
});

export const updateSettings = mutation({
  args: {
    propertyId: v.id("properties"),
    regularHoursLimitDaily: v.optional(v.number()),
    overtimeMultiplier: v.optional(v.number()),
    defaultPayCycleId: v.optional(v.id("payCycles")),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "payroll.settings.update", args.propertyId);
    const settings = await ctx.db
      .query("payrollSettings")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .first();
    if (!settings) return { success: false, message: "Seed Payroll settings first" };
    await ctx.db.patch(settings._id, {
      regularHoursLimitDaily: args.regularHoursLimitDaily ?? settings.regularHoursLimitDaily,
      overtimeMultiplier: args.overtimeMultiplier ?? settings.overtimeMultiplier,
      defaultPayCycleId: args.defaultPayCycleId ?? settings.defaultPayCycleId,
      updatedAt: Date.now(),
    });
    return { success: true, message: "Payroll settings updated" };
  },
});

/** Updates the property's single default pay cycle. Extra rows are deactivated. */
export const savePayCycle = mutation({
  args: {
    propertyId: v.id("properties"),
    frequency: v.union(v.literal("weekly"), v.literal("bi-weekly"), v.literal("monthly"), v.literal("annually")),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "payroll.settings.update", args.propertyId);
    const name =
      args.frequency === "weekly" ? "Weekly" : args.frequency === "annually" ? "Annually" : args.frequency === "bi-weekly" ? "Bi-weekly" : "Monthly";
    const existing = await ctx.db
      .query("payCycles")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const current = existing.find((row) => row.isDefault) ?? existing[0];
    const now = Date.now();

    if (current) {
      await ctx.db.patch(current._id, {
        name,
        frequency: args.frequency,
        isDefault: true,
        isActive: true,
        updatedAt: now,
      });
      for (const row of existing) {
        if (row._id !== current._id) {
          await ctx.db.patch(row._id, { isDefault: false, isActive: false, updatedAt: now });
        }
      }
      const settings = await ctx.db
        .query("payrollSettings")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
        .first();
      if (settings && settings.defaultPayCycleId !== current._id) {
        await ctx.db.patch(settings._id, { defaultPayCycleId: current._id, updatedAt: now });
      }
      return { success: true, message: "Pay cycle updated", id: current._id };
    }

    const id = await ctx.db.insert("payCycles", {
      propertyId: args.propertyId,
      name,
      frequency: args.frequency,
      anchorDate: now,
      cutoffDaysBeforePayDate: 2,
      isDefault: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const settings = await ctx.db
      .query("payrollSettings")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .first();
    if (settings) {
      await ctx.db.patch(settings._id, { defaultPayCycleId: id, updatedAt: now });
    }
    return { success: true, message: "Pay cycle saved", id };
  },
});

export const createTimeOffType = mutation({
  args: {
    propertyId: v.id("properties"),
    code: v.string(),
    name: v.string(),
    paid: v.boolean(),
    countsTowardOvertime: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "payroll.settings.update", args.propertyId);
    const parsed = parseSettingsCode(args.code);
    if (!parsed.ok) return { success: false, message: parsed.message };
    const name = args.name.trim();
    if (!name) return { success: false, message: "Enter a Time-off type name" };

    const existing = await ctx.db
      .query("timeOffTypes")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    if (existing.some((row) => row.code === parsed.code)) {
      return { success: false, message: "A Time-off type with this code already exists" };
    }
    if (existing.some((row) => sameName(row.name, name))) {
      return { success: false, message: "A Time-off type with this name already exists" };
    }

    const now = Date.now();
    const id = await ctx.db.insert("timeOffTypes", {
      propertyId: args.propertyId,
      code: parsed.code,
      name,
      paid: args.paid,
      countsTowardOvertime: args.countsTowardOvertime,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, message: "Time-off type created", id };
  },
});

export const createPayItemType = mutation({
  args: {
    propertyId: v.id("properties"),
    code: v.string(),
    name: v.string(),
    kind: v.union(v.literal("earning"), v.literal("allowance"), v.literal("deduction")),
    calculation: v.union(v.literal("flat"), v.literal("percent_of_gross"), v.literal("pack_formula")),
    defaultAmount: v.optional(v.number()),
    defaultRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "payroll.settings.update", args.propertyId);
    const parsed = parseSettingsCode(args.code);
    if (!parsed.ok) return { success: false, message: parsed.message };
    const name = args.name.trim();
    if (!name) return { success: false, message: "Enter a Pay item type name" };

    const existing = await ctx.db
      .query("payItemTypes")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    if (existing.some((row) => row.code === parsed.code)) {
      return { success: false, message: "A Pay item type with this code already exists" };
    }
    if (existing.some((row) => sameName(row.name, name))) {
      return { success: false, message: "A Pay item type with this name already exists" };
    }

    const now = Date.now();
    const id = await ctx.db.insert("payItemTypes", {
      propertyId: args.propertyId,
      code: parsed.code,
      name,
      kind: args.kind,
      source: "custom",
      calculation: args.calculation,
      defaultAmount: args.defaultAmount,
      defaultRate: args.defaultRate,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, message: "Pay item type created", id };
  },
});

export const createHoliday = mutation({
  args: {
    propertyId: v.id("properties"),
    date: v.number(),
    name: v.string(),
    isPaid: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "payroll.settings.update", args.propertyId);
    let calendar = await ctx.db
      .query("holidayCalendars")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .first();
    const now = Date.now();
    if (!calendar) {
      const calendarId = await ctx.db.insert("holidayCalendars", {
        propertyId: args.propertyId,
        name: "Holidays",
        createdAt: now,
        updatedAt: now,
      });
      calendar = await ctx.db.get(calendarId);
    }
    if (!calendar) return { success: false, message: "Could not create Holidays calendar" };
    const name = args.name.trim();
    if (!name) return { success: false, message: "Enter a holiday name" };
    const date = startOfUtcDay(args.date);
    const existing = await ctx.db
      .query("holidays")
      .withIndex("by_holidayCalendarId", (q) => q.eq("holidayCalendarId", calendar._id))
      .collect();
    if (existing.some((row) => startOfUtcDay(row.date) === date)) {
      return { success: false, message: "A holiday already exists on this date" };
    }
    if (existing.some((row) => sameName(row.name, name))) {
      return { success: false, message: "A holiday with this name already exists" };
    }
    const id = await ctx.db.insert("holidays", {
      holidayCalendarId: calendar._id,
      date,
      name,
      isPaid: args.isPaid,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, message: "Holiday added", id };
  },
});

export const createExtraPayRule = mutation({
  args: {
    propertyId: v.id("properties"),
    kind: v.union(
      v.literal("daily_overtime"),
      v.literal("weekly_overtime"),
      v.literal("night"),
      v.literal("weekend"),
      v.literal("public_holiday")
    ),
    multiplier: v.number(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "payroll.settings.update", args.propertyId);
    const existing = await ctx.db
      .query("extraPayRules")
      .withIndex("by_propertyId_kind", (q) =>
        q.eq("propertyId", args.propertyId).eq("kind", args.kind)
      )
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        multiplier: args.multiplier,
        startTime: args.startTime,
        endTime: args.endTime,
        isActive: true,
        updatedAt: now,
      });
      return { success: true, message: "Extra pay rule updated", id: existing._id };
    }
    const id = await ctx.db.insert("extraPayRules", {
      propertyId: args.propertyId,
      kind: args.kind,
      multiplier: args.multiplier,
      startTime: args.startTime,
      endTime: args.endTime,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, message: "Extra pay rule created", id };
  },
});

export const listStaffForProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "payroll.timesheet.read", args.propertyId);
    const staffs = await ctx.db
      .query("staffs")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    // Also include staffs that have not been scoped yet so Hours can still be recorded.
    const unscoped = (await ctx.db.query("staffs").collect()).filter((s) => !s.propertyId);
    const merged = [...staffs, ...unscoped];
    return {
      success: true,
      data: merged.map((s) => ({
        _id: s._id,
        firstName: s.firstName,
        lastName: s.lastName,
        payType: s.payType,
        paymentMethod: s.paymentMethod,
        employmentStatus: s.employmentStatus,
      })),
    };
  },
});
