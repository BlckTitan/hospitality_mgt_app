import { createPermissionChecker, type UserContext } from './permission-utils';
import { ROUTE_PERMISSIONS } from './proxy-permissions';
import { matchRoute } from './route-matching';

export const DASHBOARD_PATH = '/admin/dashboard';
export const STAFF_HOME_PATH = '/admin/staff/myProfile';

export const SECTION_HUBS = [
  '/admin/user',
  '/admin/bar-management',
  '/admin/inventory-management',
  '/admin/room-management',
  '/admin/shift-management',
  '/admin/payroll-management',
  '/admin/maintenance',
  '/admin/billing',
  '/admin/tasks',
] as const;

export function isSectionHub(pathname: string): boolean {
  return (SECTION_HUBS as readonly string[]).includes(pathname);
}

export function isPathInSection(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function routeAllows(
  permission: { granular: string | string[] },
  hasGranularPermission: (granular: string) => boolean,
): boolean {
  const keys = Array.isArray(permission.granular) ? permission.granular : [permission.granular];
  return keys.some((key) => hasGranularPermission(key));
}

export function canAccessPath(
  pathname: string,
  hasGranularPermission: (granular: string) => boolean,
): boolean {
  const matchedRoute = matchRoute(pathname, ROUTE_PERMISSIONS);
  if (matchedRoute && routeAllows(ROUTE_PERMISSIONS[matchedRoute], hasGranularPermission)) {
    return true;
  }

  if (isSectionHub(pathname)) {
    const prefix = `${pathname}/`;
    return Object.entries(ROUTE_PERMISSIONS).some(
      ([route, permission]) =>
        route.startsWith(prefix) && routeAllows(permission, hasGranularPermission),
    );
  }

  if (pathname.startsWith('/admin')) {
    return false;
  }

  return !matchedRoute;
}

export function getPostLoginPath(
  hasGranularPermission: (granular: string) => boolean,
): string {
  return canAccessPath(DASHBOARD_PATH, hasGranularPermission)
    ? DASHBOARD_PATH
    : STAFF_HOME_PATH;
}

export function resolvePostAuthPath(
  userContext: UserContext,
  requestedPath?: string | null,
): string {
  const checker = createPermissionChecker(userContext);
  const hasGranularPermission = (granular: string) =>
    checker.hasGranularPermission(granular);
  if (requestedPath && canAccessPath(requestedPath, hasGranularPermission)) {
    return requestedPath;
  }
  return getPostLoginPath(hasGranularPermission);
}

type NavLeaf = {
  href: string;
};

type NavBranch<TLeaf extends NavLeaf> = {
  href: string;
  subLink?: TLeaf[];
};

export function filterNavByAccess<TItem extends NavBranch<TLeaf>, TLeaf extends NavLeaf>(
  items: TItem[],
  canAccess: (href: string) => boolean,
): TItem[] {
  return items.flatMap((item) => {
    if (item.href === '/#') {
      return [item];
    }

    const children = (item.subLink ?? []).filter((link) => {
      if (link.href === '/#' || link.href === item.href) {
        return link.href === '/#';
      }
      return canAccess(link.href);
    });

    const canVisitHub = canAccess(item.href);
    if (!canVisitHub && children.length === 0) {
      return [];
    }

    return [
      {
        ...item,
        href: canVisitHub ? item.href : children[0].href,
        subLink: children.length > 0 ? children : undefined,
      },
    ];
  });
}
