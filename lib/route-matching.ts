import { ROUTE_PERMISSIONS } from './proxy-permissions';

export function matchRoute(
  pathname: string,
  routePermissions: Record<string, { granular: string }> = ROUTE_PERMISSIONS,
): string | null {
  if (routePermissions[pathname]) {
    return pathname;
  }

  for (const route of Object.keys(routePermissions)) {
    if (route.includes('[id]')) {
      const regex = route.replace(/\[id\]/g, '[^/]+');
      if (new RegExp(`^${regex}$`).test(pathname)) {
        return route;
      }
    }
  }

  return null;
}
