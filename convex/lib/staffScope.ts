import { Id } from "../_generated/dataModel";
import { AuthContext } from "./rbac";

export function isFloorServiceOnly(roles: readonly string[]): boolean {
  return roles.length > 0 && roles.every((role) => role === "Waiter" || role === "Bartender");
}

/** Managers and other non-floor roles can see every staff member's checks and requests. */
export function canViewTeamRecords(roles: readonly string[]): boolean {
  return roles.some((role) => role !== "Waiter" && role !== "Bartender");
}

export function rolesForProperty(
  auth: AuthContext,
  propertyId: Id<"properties">,
): string[] {
  return auth.rolesByProperty[propertyId] ?? [];
}
