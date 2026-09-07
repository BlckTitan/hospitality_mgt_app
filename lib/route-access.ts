import { ROUTE_PERMISSIONS } from './proxy-permissions';
import { matchRoute } from './route-matching';

export const SECTION_HUBS = [
  '/admin/user',
  '/admin/bar-management',
  '/admin/inventory-management',
  '/admin/room-management',
  '/admin/shift-management',
  '/admin/payroll-management',
] as const;

export function isSectionHub(pathname: string): boolean {
  return (SECTION_HUBS as readonly string[]).includes(pathname);
}

export function isPathInSection(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function canAccessPath(
  pathname: string,
  hasGranularPermission: (granular: string) => boolean,
): boolean {
  const matchedRoute = matchRoute(pathname, ROUTE_PERMISSIONS);
  if (matchedRoute && hasGranularPermission(ROUTE_PERMISSIONS[matchedRoute].granular)) {
    return true;
  }

  if (isSectionHub(pathname)) {
    const prefix = `${pathname}/`;
    return Object.entries(ROUTE_PERMISSIONS).some(
      ([route, permission]) =>
        route.startsWith(prefix) && hasGranularPermission(permission.granular),
    );
  }

  if (pathname.startsWith('/admin')) {
    return false;
  }

  return !matchedRoute;
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
        subLink: children.length > 0 ? children : undefined,
      },
    ];
  });
}
