'use client';

import React from 'react';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Action, Module } from '../lib/permissions';
import { createPermissionChecker, PermissionChecker, UserContext } from '../lib/permission-utils';
import { ROUTE_PERMISSIONS } from '../lib/proxy-permissions';
import { matchRoute } from '../lib/route-matching';
import {
  getClerkConvexAuthToken,
  isMissingClerkConvexJwtTemplate,
  logMissingClerkConvexJwtTemplate,
  MISSING_CLERK_CONVEX_JWT_TEMPLATE_ERROR,
} from '../lib/clerk-convex-auth';
import { convex, api } from '../lib/convex-client';

interface UsePermissionsOptions {
  propertyId?: string;
}

interface UsePermissionsReturn {
  permissionChecker: PermissionChecker | null;
  isLoading: boolean;
  error: string | null;
  hasPermission: (module: Module, action: Action) => boolean;
  hasGranularPermission: (granularPerm: string) => boolean;
  hasFullAccess: (module: Module) => boolean;
  getAccessibleModules: () => Module[];
  canAccessRoute: (pathname: string) => boolean;
}

export function usePermissions(options: UsePermissionsOptions = {}): UsePermissionsReturn {
  const { userId, isLoaded, isSignedIn, getToken } = useAuth();
  const [permissionChecker, setPermissionChecker] = useState<PermissionChecker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserPermissions() {
      if (!isLoaded || !isSignedIn || !userId) {
        setPermissionChecker(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const token = await getClerkConvexAuthToken(getToken);
        if (isMissingClerkConvexJwtTemplate(userId, token)) {
          logMissingClerkConvexJwtTemplate('usePermissions');
          throw new Error(MISSING_CLERK_CONVEX_JWT_TEMPLATE_ERROR);
        }

        convex.setAuth(token);
        const context = await convex.query(api.authContext.getCurrentUserContext, {});

        if (!context) {
          throw new Error('Failed to fetch user permissions');
        }

        const userContext: UserContext = {
          userId: context.userId,
          roles: context.roles,
          propertyId: options.propertyId || context.propertyId,
          customPermissions: context.customPermissions,
        };

        setPermissionChecker(createPermissionChecker(userContext));
      } catch (err) {
        console.error('Error loading user permissions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load permissions');
        setPermissionChecker(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserPermissions();
  }, [userId, isLoaded, isSignedIn, options.propertyId, getToken]);

  const hasPermission = (module: Module, action: Action): boolean => {
    if (!permissionChecker) return false;
    return permissionChecker.hasPermission(module, action);
  };

  const hasGranularPermission = (granularPerm: string): boolean => {
    if (!permissionChecker) return false;
    return permissionChecker.hasGranularPermission(granularPerm);
  };

  const hasFullAccess = (module: Module): boolean => {
    if (!permissionChecker) return false;
    return permissionChecker.hasFullAccess(module);
  };

  const getAccessibleModules = (): Module[] => {
    if (!permissionChecker) return [];
    return permissionChecker.getAccessibleModules();
  };

  const canAccessRoute = (pathname: string): boolean => {
    if (!permissionChecker) return false;

    if (pathname.startsWith('/admin')) {
      const matchedRoute = matchRoute(pathname, ROUTE_PERMISSIONS);
      if (!matchedRoute) {
        return false;
      }

      const routePermission = ROUTE_PERMISSIONS[matchedRoute];
      return permissionChecker.hasGranularPermission(routePermission.granular);
    }

    const matchedRoute = matchRoute(pathname, ROUTE_PERMISSIONS);
    if (matchedRoute) {
      const routePermission = ROUTE_PERMISSIONS[matchedRoute];
      return permissionChecker.hasGranularPermission(routePermission.granular);
    }

    return true;
  };

  return {
    permissionChecker,
    isLoading,
    error,
    hasPermission,
    hasGranularPermission,
    hasFullAccess,
    getAccessibleModules,
    canAccessRoute,
  };
}

interface PermissionGuardProps {
  module: Module;
  action: Action;
  granular?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  module,
  action,
  granular,
  children,
  fallback,
}) => {
  const { hasPermission, hasGranularPermission, isLoading } = usePermissions();

  if (isLoading) {
    return React.createElement('div', null, 'Loading...');
  }

  let hasRequiredPermission = false;

  if (granular) {
    hasRequiredPermission = hasGranularPermission(granular);
  } else {
    hasRequiredPermission = hasPermission(module, action);
  }

  if (!hasRequiredPermission) {
    return fallback || React.createElement('div', null, 'Access Denied');
  }

  return React.createElement('div', { children });
};

export function useMultiplePermissions() {
  const { permissionChecker } = usePermissions();

  const requireAll = (permissions: Array<{ module: Module; action: Action }>): boolean => {
    if (!permissionChecker) return false;
    return permissions.every(({ module, action }) =>
      permissionChecker.hasPermission(module, action),
    );
  };

  const requireAny = (permissions: Array<{ module: Module; action: Action }>): boolean => {
    if (!permissionChecker) return false;
    return permissions.some(({ module, action }) =>
      permissionChecker.hasPermission(module, action),
    );
  };

  return {
    requireAll,
    requireAny,
  };
}
