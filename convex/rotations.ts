import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { propertyTimeZone } from "./lib/billingPeriods";
import {
  MAX_SEGMENT_MINUTES,
  MIN_SEGMENT_MINUTES,
  activeStaffRotation,
  formatDuration,
  formatWhen,
  segmentsForRotation,
  zonedWallTimeToUtc,
} from "./lib/rotation";
import { staffDisplayName } from "./lib/shiftHelpers";

const departmentValidator = v.union(
  v.literal("front-office"),
  v.literal("housekeeping"),
  v.literal("fnb"),
  v.literal("restaurant"),
  v.literal("maintenance"),
  v.literal("finance"),
  v.literal("admin"),
  v.literal("other"),
);

const segmentValidator = v.object({
  kind: v.union(v.literal("on"), v.literal("off")),
  durationMinutes: v.number(),
});

function segmentError(segments: { kind: "on" | "off"; durationMinutes: number }[]) {
  if (segments.length < 2) return "A rotation needs at least one on segment and one off segment";
  if (!segments.some((segment) => segment.kind === "on")) return "A rotation needs an on segment";
  if (!segments.some((segment) => segment.kind === "off")) return "A rotation needs an off segment";
  for (const segment of segments) {
    if (!Number.isFinite(segment.durationMinutes) || segment.durationMinutes < MIN_SEGMENT_MINUTES) {
      return `Each segment must be at least ${MIN_SEGMENT_MINUTES} minutes`;
    }
    if (segment.durationMinutes > MAX_SEGMENT_MINUTES) {
      return "Each segment must be 72 hours or less";
    }
  }
  return null;
}

export const listRotations = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "staff.read", args.propertyId);
    const property = await ctx.db.get(args.propertyId);
    const timeZone = propertyTimeZone(property);
    const rows = await ctx.db
      .query("rotations")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    rows.sort((a, b) => a.name.localeCompare(b.name));
    const data = await Promise.all(
      rows.map(async (row) => {
        const segments = await segmentsForRotation(ctx, row._id);
        const template = row.shiftTemplateId ? await ctx.db.get(row.shiftTemplateId) : null;
        const assignments = await ctx.db
          .query("staffRotations")
          .withIndex("by_rotationId", (q) => q.eq("rotationId", row._id))
          .collect();
        const cycleMinutes = segments.reduce((sum, segment) => sum + segment.durationMinutes, 0);
        return {
          ...row,
          dutyName: template?.name,
          segments: segments.map((segment) => ({
            kind: segment.kind,
            durationMinutes: segment.durationMinutes,
            label: `${segment.kind === "on" ? "On" : "Off"} ${formatDuration(segment.durationMinutes)}`,
          })),
          cycleLabel: segments.map((segment) => `${segment.kind === "on" ? "on" : "off"} ${formatDuration(segment.durationMinutes)}`).join(", "),
          cycleMinutes,
          assignmentCount: assignments.filter((assignment) => assignment.isActive).length,
        };
      }),
    );
    const assignmentRows = [];
    for (const rotation of data) {
      const links = await ctx.db
        .query("staffRotations")
        .withIndex("by_rotationId", (q) => q.eq("rotationId", rotation._id))
        .collect();
      for (const link of links) {
        if (!link.isActive) continue;
        const staff = await ctx.db.get(link.staffId);
        assignmentRows.push({
          _id: link._id,
          staffId: link.staffId,
          staffName: staffDisplayName(staff),
          rotationId: rotation._id,
          rotationName: rotation.name,
          anchorAt: link.anchorAt,
          anchorLabel: formatWhen(link.anchorAt, timeZone),
        });
      }
    }
    assignmentRows.sort((a, b) => a.staffName.localeCompare(b.staffName));
    return { success: true, data, assignments: assignmentRows };
  },
});

export const createRotation = mutation({
  args: {
    propertyId: v.id("properties"),
    department: departmentValidator,
    name: v.string(),
    shiftTemplateId: v.optional(v.id("shiftTemplates")),
    segments: v.array(segmentValidator),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "staff.update", args.propertyId);
    const name = args.name.trim();
    if (!name) return { success: false, message: "Name is required" };
    const problem = segmentError(args.segments);
    if (problem) return { success: false, message: problem };
    if (args.shiftTemplateId) {
      const template = await ctx.db.get(args.shiftTemplateId);
      if (!template || template.propertyId !== args.propertyId) {
        return { success: false, message: "Department shift was not found for this property" };
      }
      if (template.department !== args.department) {
        return { success: false, message: "That duty belongs to a different department" };
      }
    }
    const now = Date.now();
    const rotationId = await ctx.db.insert("rotations", {
      propertyId: args.propertyId,
      department: args.department,
      name,
      ...(args.shiftTemplateId ? { shiftTemplateId: args.shiftTemplateId } : {}),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    for (let index = 0; index < args.segments.length; index += 1) {
      const segment = args.segments[index];
      await ctx.db.insert("rotationSegments", {
        rotationId,
        position: index,
        kind: segment.kind,
        durationMinutes: Math.round(segment.durationMinutes),
      });
    }
    return { success: true, id: rotationId, message: "Rotation created" };
  },
});

export const deleteRotation = mutation({
  args: { rotationId: v.id("rotations") },
  handler: async (ctx, args) => {
    const rotation = await ctx.db.get(args.rotationId);
    if (!rotation) return { success: false, message: "Rotation not found" };
    await requirePermission(ctx, "staff.update", rotation.propertyId);
    const assignments = await ctx.db
      .query("staffRotations")
      .withIndex("by_rotationId", (q) => q.eq("rotationId", args.rotationId))
      .collect();
    if (assignments.some((row) => row.isActive)) {
      return { success: false, message: "Remove everyone from this rotation before deleting it" };
    }
    for (const row of assignments) await ctx.db.delete(row._id);
    const segments = await segmentsForRotation(ctx, args.rotationId);
    for (const segment of segments) await ctx.db.delete(segment._id);
    await ctx.db.delete(args.rotationId);
    return { success: true, message: "Rotation deleted" };
  },
});

export const setRotationActive = mutation({
  args: { rotationId: v.id("rotations"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    const rotation = await ctx.db.get(args.rotationId);
    if (!rotation) return { success: false, message: "Rotation not found" };
    await requirePermission(ctx, "staff.update", rotation.propertyId);
    await ctx.db.patch(args.rotationId, { isActive: args.isActive, updatedAt: Date.now() });
    return { success: true, message: args.isActive ? "Rotation activated" : "Rotation deactivated" };
  },
});

export const assignStaffRotation = mutation({
  args: {
    propertyId: v.id("properties"),
    staffId: v.id("staffs"),
    rotationId: v.id("rotations"),
    anchorLocal: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "staff.update", args.propertyId);
    const staff = await ctx.db.get(args.staffId);
    if (!staff || staff.propertyId !== args.propertyId) {
      return { success: false, message: "Staff member was not found for this property" };
    }
    if (staff.employmentStatus === "terminated") {
      return { success: false, message: "Cannot assign a rotation to terminated staff" };
    }
    const rotation = await ctx.db.get(args.rotationId);
    if (!rotation || rotation.propertyId !== args.propertyId || !rotation.isActive) {
      return { success: false, message: "Rotation was not found or is inactive" };
    }
    if (staff.department && staff.department !== rotation.department) {
      return { success: false, message: "This rotation is for a different department" };
    }
    const property = await ctx.db.get(args.propertyId);
    const anchorAt = zonedWallTimeToUtc(args.anchorLocal, propertyTimeZone(property));
    if (anchorAt == null) return { success: false, message: "Enter the date and time the first on-duty starts" };
    const existing = await activeStaffRotation(ctx, args.staffId);
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { isActive: false, updatedAt: now });
    }
    await ctx.db.insert("staffRotations", {
      propertyId: args.propertyId,
      staffId: args.staffId,
      rotationId: args.rotationId,
      anchorAt,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, message: `${staffDisplayName(staff)} is on ${rotation.name}` };
  },
});

export const clearStaffRotation = mutation({
  args: { assignmentId: v.id("staffRotations") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.assignmentId);
    if (!row) return { success: false, message: "Assignment not found" };
    await requirePermission(ctx, "staff.update", row.propertyId);
    await ctx.db.patch(args.assignmentId, { isActive: false, updatedAt: Date.now() });
    return { success: true, message: "Rotation removed from this staff member" };
  },
});
