'use client';

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Action, Module } from '../lib/permissions';
import { createPermissionChecker, PermissionChecker, UserContext } from '../lib/permission-utils';
import { canAccessPath } from '../lib/route-access';

interface PermissionsContextValue {
  authContext: UserContext | null;
  isLoading: boolean;
  error: string | null;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const raw = useQuery(
    api.authContext.getCurrentUserContext,
    isLoaded && isSignedIn ? {} : 'skip',
  );

  const value = useMemo<PermissionsContextValue>(() => {
    if (!isLoaded) {
      return { authContext: null, isLoading: true, error: null };
    }
    if (!isSignedIn) {
      return { authContext: null, isLoading: false, error: null };
    }
    if (raw === undefined) {
      return { authContext: null, isLoading: true, error: null };
    }
    if (!raw) {
      return {
        authContext: null,
        isLoading: false,
        error: 'Failed to fetch user permissions',
      };
    }
    return {
      authContext: {
        userId: raw.userId,
        roles: raw.roles,
        propertyId: raw.propertyId ? String(raw.propertyId) : undefined,
        customPermissions: raw.customPermissions,
      },
      isLoading: false,
      error: null,
    };
  }, [isLoaded, isSignedIn, raw]);

  return (
    <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
  );
}

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

function usePermissionsContext(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return ctx;
}

export function usePermissions(options: UsePermissionsOptions = {}): UsePermissionsReturn {
  const { authContext, isLoading, error } = usePermissionsContext();

  const permissionChecker = useMemo(() => {
    if (!authContext) return null;
    const userContext: UserContext = {
      ...authContext,
      propertyId: options.propertyId || authContext.propertyId,
    };
    return createPermissionChecker(userContext);
  }, [authContext, options.propertyId]);

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
    return canAccessPath(pathname, (granular) =>
      permissionChecker.hasGranularPermission(granular),
    );
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

  const hasRequiredPermission = granular
    ? hasGranularPermission(granular)
    : hasPermission(module, action);

  if (!hasRequiredPermission) {
    return fallback ? <>{fallback}</> : <>Access Denied</>;
  }

  return <>{children}</>;
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

  return { requireAll, requireAny };
}
