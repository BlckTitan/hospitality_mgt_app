import { MutationCtx, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { localDayBounds, propertyTimeZone } from "./billingPeriods";
import { hhmmInTimeZone } from "./punctuality";

type DbCtx = MutationCtx | QueryCtx;

export type RotationSegment = {
  kind: "on" | "off";
  durationMinutes: number;
};

export const MIN_SEGMENT_MINUTES = 15;
export const MAX_SEGMENT_MINUTES = 72 * 60;

export function durationFromClocks(start: string, end: string): number {
  const startMin = minutesFromClock(start);
  const endMin = minutesFromClock(end);
  if (startMin == null || endMin == null) return 8 * 60;
  let diff = endMin - startMin;
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

export function clockPlusDuration(start: string, durationMinutes: number): string {
  const startMin = minutesFromClock(start) ?? 0;
  const total = ((startMin + durationMinutes) % (24 * 60) + 24 * 60) % (24 * 60);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

function minutesFromClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function placeInCycle(
  nowMs: number,
  anchorAt: number,
  segments: RotationSegment[],
):
  | { status: "empty" }
  | { status: "before"; startsAt: number }
  | { status: "on"; startsAt: number; endsAt: number }
  | { status: "off"; resumesAt: number } {
  const cycle = segments.reduce((sum, segment) => sum + segment.durationMinutes, 0);
  if (cycle <= 0 || segments.length === 0) return { status: "empty" };
  if (nowMs < anchorAt) return { status: "before", startsAt: anchorAt };
  const elapsedMin = Math.floor((nowMs - anchorAt) / 60000);
  const into = elapsedMin % cycle;
  const cycles = Math.floor(elapsedMin / cycle);
  let cursor = 0;
  for (const segment of segments) {
    const next = cursor + segment.durationMinutes;
    if (into < next) {
      const startsAt = anchorAt + (cycles * cycle + cursor) * 60000;
      const endsAt = startsAt + segment.durationMinutes * 60000;
      if (segment.kind === "on") return { status: "on", startsAt, endsAt };
      return { status: "off", resumesAt: endsAt };
    }
    cursor = next;
  }
  return { status: "empty" };
}

export function zonedWallTimeToUtc(isoLocal: string, timeZone: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(isoLocal.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (hour > 23 || minute > 59) return null;
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const utc = wallAsUtc - zoneOffsetMs(wallAsUtc, timeZone);
  return wallAsUtc - zoneOffsetMs(utc, timeZone);
}

function zoneOffsetMs(utcMs: number, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "UTC",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(utcMs));
    const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const asUtc = Date.UTC(pick("year"), pick("month") - 1, pick("day"), pick("hour"), pick("minute"), pick("second"));
    return asUtc - utcMs;
  } catch {
    return 0;
  }
}

export function formatWhen(ms: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timeZone || "UTC",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

export function addIsoDays(iso: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return date.toISOString().slice(0, 10);
}

export async function segmentsForRotation(ctx: DbCtx, rotationId: Id<"rotations">) {
  const rows = await ctx.db
    .query("rotationSegments")
    .withIndex("by_rotationId", (q) => q.eq("rotationId", rotationId))
    .collect();
  rows.sort((a, b) => a.position - b.position);
  return rows;
}

export async function activeStaffRotation(ctx: DbCtx, staffId: Id<"staffs">) {
  const rows = await ctx.db
    .query("staffRotations")
    .withIndex("by_staffId", (q) => q.eq("staffId", staffId))
    .collect();
  return rows.find((row) => row.isActive) ?? null;
}

export type StaffPlacement =
  | { status: "none" }
  | { status: "before" | "off"; message: string }
  | {
      status: "on";
      rotationId: Id<"rotations">;
      rotationName: string;
      shiftTemplateId?: Id<"shiftTemplates">;
      startsAt: number;
      endsAt: number;
      shiftDate: string;
      expectedStart: string;
      expectedEnd: string;
    };

export async function placementForStaff(
  ctx: DbCtx,
  staff: Doc<"staffs">,
  propertyId: Id<"properties">,
  now = Date.now(),
): Promise<StaffPlacement> {
  const assignment = await activeStaffRotation(ctx, staff._id);
  if (!assignment || assignment.propertyId !== propertyId) return { status: "none" };
  const rotation = await ctx.db.get(assignment.rotationId);
  if (!rotation || !rotation.isActive) return { status: "none" };
  const segments = await segmentsForRotation(ctx, rotation._id);
  const property = await ctx.db.get(propertyId);
  const timeZone = propertyTimeZone(property);
  const place = placeInCycle(
    now,
    assignment.anchorAt,
    segments.map((segment) => ({ kind: segment.kind, durationMinutes: segment.durationMinutes })),
  );
  if (place.status === "empty") return { status: "none" };
  if (place.status === "before") {
    return { status: "before", message: `This rotation starts ${formatWhen(place.startsAt, timeZone)}.` };
  }
  if (place.status === "off") {
    return { status: "off", message: `Off this rotation until ${formatWhen(place.resumesAt, timeZone)}.` };
  }
  return {
    status: "on",
    rotationId: rotation._id,
    rotationName: rotation.name,
    shiftTemplateId: rotation.shiftTemplateId,
    startsAt: place.startsAt,
    endsAt: place.endsAt,
    shiftDate: localDayBounds(place.startsAt, timeZone).dateKey,
    expectedStart: hhmmInTimeZone(place.startsAt, timeZone),
    expectedEnd: hhmmInTimeZone(place.endsAt, timeZone),
  };
}
