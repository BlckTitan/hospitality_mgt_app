/** Waiter and bartender accounts work one property and their own checks. */
const FLOOR_SERVICE_ROLES = new Set(["Waiter", "Bartender"]);

export function isFloorServiceOnly(roles: readonly string[]): boolean {
  return roles.length > 0 && roles.every((role) => FLOOR_SERVICE_ROLES.has(role));
}

/** Waiter menu, including someone who is also only a bartender. */
export function isWaiterView(roles: readonly string[] | undefined): boolean {
  if (!roles?.includes("Waiter")) return false;
  return isFloorServiceOnly(roles);
}

const WAITER_HIDDEN_PREFIXES = [
  "/admin/bar-management/bar",
  "/admin/bar-management/beverages",
  "/admin/bar-management/beverage-categories",
  "/admin/bar-management/user-stock-logs",
  "/admin/restaurant/menu-items",
  "/admin/restaurant/recipes",
  "/admin/restaurant/inventory",
  "/admin/restaurant/kitchen",
  "/admin/room-management",
  "/admin/inventory-management",
];

export function isHiddenFromWaiter(pathname: string): boolean {
  const path = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  if (path === "/admin/restaurant") return true;
  return WAITER_HIDDEN_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}
