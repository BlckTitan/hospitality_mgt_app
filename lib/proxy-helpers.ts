import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
import { UserContext } from './permission-utils';
import { ROUTE_PERMISSIONS } from './proxy-permissions';

export const PUBLIC_ROUTES = [
  '/',
  '/sign-in',
  '/sign-up',
  '/api/webhook/clerk',
  '/api/auth',
];

export function matchRoute(pathname: string): string | null {
  // Exact match first
  if (ROUTE_PERMISSIONS[pathname]) {
    return pathname;
  }

  for (const route of Object.keys(ROUTE_PERMISSIONS)) {
    if (route.includes('[id]')) {
      const regex = route.replace(/\[id\]/g, '[^/]+');
      if (new RegExp(`^${regex}$`).test(pathname)) {
        return route;
      }
    }
  }

  return null;
}

export async function getUserContext(userId: string): Promise<UserContext | null> {
  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    const user = await convex.query(api.users.getUserByExternalId, {
      externalId: userId,
    });

    if (!user.success || !user.data) {
      console.warn('User not found in database:', userId);
      return null;
    }

    const userRoles = await convex.query(api.userRoles.getUserRolesByUserId, {
      userId: user.data._id,
    });

    if (!userRoles.success) {
      console.error('Failed to fetch user roles:', userRoles.message);
      return null;
    }

    const roles = userRoles.data.map((userRole) => userRole.roleName);
    const propertyIds = [...new Set(userRoles.data.map((userRole) => userRole.propertyId))];

    const rolePermissionResults = await Promise.all(
      roles.map(async (roleName) => {
        const roleResponse = await convex.query(api.roles.getRoleByName, { name: roleName });
        return roleResponse.success && roleResponse.data?.permissions ? roleResponse.data.permissions : {};
      })
    );

    const mergedPermissions = rolePermissionResults.reduce((acc, permissions) => {
      Object.entries(permissions).forEach(([key, value]) => {
        if (value) {
          acc[key] = true;
        }
      });
      return acc;
    }, {} as Record<string, boolean>);

    console.log('User context loaded with merged role permissions:', {
      userId,
      roles,
      propertyIds,
      permissionsCount: Object.keys(mergedPermissions).length,
    });

    return {
      userId,
      roles,
      propertyId: propertyIds[0],
      customPermissions: mergedPermissions,
    };
  } catch (error) {
    console.error('Error getting user context:', error);
    return null;
  }
}
