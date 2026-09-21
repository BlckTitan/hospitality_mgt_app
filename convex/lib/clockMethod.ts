import { v } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";

export const STAFF_CLOCK_METHODS = ["self", "supervisor", "kiosk"] as const;
export type StaffClockMethod = (typeof STAFF_CLOCK_METHODS)[number];

export const SHIFT_CLOCK_METHODS = ["self", "kiosk", "proxy"] as const;
export type ShiftClockMethod = (typeof SHIFT_CLOCK_METHODS)[number];

export const staffClockMethodValidator = v.union(
  v.literal("self"),
  v.literal("supervisor"),
  v.literal("kiosk"),
);

export const shiftClockMethodValidator = v.union(
  v.literal("self"),
  v.literal("kiosk"),
  v.literal("proxy"),
);

export function defaultClockMethodForStaff(userId?: Id<"users"> | null): StaffClockMethod {
  return userId ? "self" : "supervisor";
}

export function resolveStaffClockMethod(
  staff: Pick<Doc<"staffs">, "clockMethod" | "userId">,
): StaffClockMethod {
  if (staff.clockMethod === "self" || staff.clockMethod === "supervisor" || staff.clockMethod === "kiosk") {
    if (staff.clockMethod === "self" && !staff.userId) return "supervisor";
    return staff.clockMethod;
  }
  return defaultClockMethodForStaff(staff.userId);
}
