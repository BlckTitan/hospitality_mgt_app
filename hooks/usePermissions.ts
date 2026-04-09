'use client';

import React from 'react';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Action, Module } from '../lib/permissions';
import { createPermissionChecker, PermissionChecker, UserContext } from '../lib/permission-utils';
import { convex, api } from '../lib/convex-client';

// Route permission mapping (same as middleware)
interface RoutePermission {
  module: Module;
  action: Action;
  granular?: string;
}

const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  // Admin Dashboard
  '/admin/dashboard': { module: 'reports', action: 'read' },

  // Users & Roles
  '/admin/user': { module: 'users', action: 'read' },
  '/admin/user/role': { module: 'users', action: 'read' },
  '/admin/user/userRole': { module: 'users', action: 'read' },

  // Properties
  '/admin/property': { module: 'properties', action: 'read' },

  // Staff Management
  '/admin/staff': { module: 'staff', action: 'read' },

  // Bar Management (Food & Beverage)
  '/admin/bar-management': { module: 'fnb', action: 'read' },
  '/admin/bar-management/bar': { module: 'fnb', action: 'read' },
  '/admin/bar-management/beverages': { module: 'fnb', action: 'read' },
  '/admin/bar-management/user-stock-logs': { module: 'fnb', action: 'read' },
  '/admin/bar-management/store-inventory': { module: 'inventory', action: 'read' },
  '/admin/bar-management/store-transactions': { module: 'inventory', action: 'read' },

  // Inventory Management
  '/admin/inventory-management': { module: 'inventory', action: 'read' },
  '/admin/inventory-management/inventory-item': { module: 'inventory', action: 'read' },
  '/admin/inventory-management/inventory-transaction': { module: 'inventory', action: 'read' },
  '/admin/inventory-management/supplier': { module: 'inventory', action: 'read' },
  '/admin/inventory-management/purchase-order': { module: 'inventory', action: 'read' },
  '/admin/inventory-management/purchase-order-line': { module: 'inventory', action: 'read' },

  // Room Management & Reservations
  '/admin/room-management': { module: 'reservations', action: 'read' },
  '/admin/room-management/room-type': { module: 'reservations', action: 'read' },
  '/admin/room-management/room': { module: 'reservations', action: 'read' },
  '/admin/room-management/reservation': { module: 'reservations', action: 'read' },
  '/admin/room-management/guest': { module: 'reservations', action: 'read' },
  '/admin/room-management/housekeeping-task': { module: 'maintenance', action: 'read' },

  // Shift Management
  '/admin/shift-management': { module: 'staff', action: 'read' },
  '/admin/shift-management/shift': { module: 'staff', action: 'read' },

  // Additional admin routes for specific actions
  '/admin/user/create': { module: 'users', action: 'create' },
  '/admin/user/[id]/edit': { module: 'users', action: 'update' },
  '/admin/user/[id]': { module: 'users', action: 'read' },
  '/admin/user/role/create': { module: 'users', action: 'create' },
  '/admin/user/role/[id]/edit': { module: 'users', action: 'update' },
  '/admin/user/userRole/create': { module: 'users', action: 'create' },
  '/admin/user/userRole/[id]/edit': { module: 'users', action: 'update' },

  // Properties
  '/admin/property/create': { module: 'properties', action: 'create' },
  '/admin/property/[id]/edit': { module: 'properties', action: 'update' },

  // Staff Management
  '/admin/staff/create': { module: 'staff', action: 'create' },
  '/admin/staff/[id]/edit': { module: 'staff', action: 'update' },
  '/admin/shift-management/shift/create': { module: 'staff', action: 'create' },
  '/admin/shift-management/shift/[id]/edit': { module: 'staff', action: 'update' },

  // Reservations & Rooms
  '/admin/room-management/reservation/create': { module: 'reservations', action: 'create' },
  '/admin/room-management/reservation/[id]/edit': { module: 'reservations', action: 'update' },
  '/admin/room-management/reservation/[id]/checkin': { module: 'reservations', action: 'update', granular: 'reservations.checkin' },
  '/admin/room-management/reservation/[id]/checkout': { module: 'reservations', action: 'update', granular: 'reservations.checkout' },
  '/admin/room-management/room/create': { module: 'reservations', action: 'create' },
  '/admin/room-management/room/[id]/edit': { module: 'reservations', action: 'update' },
  '/admin/room-management/room-type/create': { module: 'reservations', action: 'create' },
  '/admin/room-management/room-type/[id]/edit': { module: 'reservations', action: 'update' },
  '/admin/room-management/guest/create': { module: 'reservations', action: 'create' },
  '/admin/room-management/guest/[id]/edit': { module: 'reservations', action: 'update' },
  '/admin/room-management/housekeeping-task/create': { module: 'maintenance', action: 'create' },
  '/admin/room-management/housekeeping-task/[id]/edit': { module: 'maintenance', action: 'update' },

  // Food & Beverage
  '/admin/bar-management/bar/create': { module: 'fnb', action: 'create' },
  '/admin/bar-management/bar/[id]/edit': { module: 'fnb', action: 'update' },
  '/admin/bar-management/beverages/create': { module: 'fnb', action: 'create' },
  '/admin/bar-management/beverages/[id]/edit': { module: 'fnb', action: 'update' },

  // Inventory Management
  '/admin/inventory-management/inventory-item/create': { module: 'inventory', action: 'create' },
  '/admin/inventory-management/inventory-item/[id]/edit': { module: 'inventory', action: 'update' },
  '/admin/inventory-management/inventory-transaction/create': { module: 'inventory', action: 'create' },
  '/admin/inventory-management/inventory-transaction/[id]/edit': { module: 'inventory', action: 'update' },
  '/admin/inventory-management/supplier/create': { module: 'inventory', action: 'create' },
  '/admin/inventory-management/supplier/[id]/edit': { module: 'inventory', action: 'update' },
  '/admin/inventory-management/purchase-order/create': { module: 'inventory', action: 'create' },
  '/admin/inventory-management/purchase-order/[id]/edit': { module: 'inventory', action: 'update' },
  '/admin/inventory-management/purchase-order-line/create': { module: 'inventory', action: 'create' },
  '/admin/inventory-management/purchase-order-line/[id]/edit': { module: 'inventory', action: 'update' },
};

// Helper function to match dynamic routes (same as middleware)
function matchRoute(pathname: string): string | null {
  // Exact match first
  if (ROUTE_PERMISSIONS[pathname]) {
    return pathname;
  }

  // Check for dynamic routes
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
  const { userId, isLoaded, isSignedIn } = useAuth();
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

        // Fetch user roles from Convex
        const userRoles = await convex.query(api.userRoles.getUserRolesByUserId, {
          userId
        });

        if (!userRoles.success) {
          throw new Error('Failed to fetch user roles');
        }

        // Extract role names and property information
        const roles = userRoles.data.map(userRole => userRole.roleName);
        const propertyIds = [...new Set(userRoles.data.map(userRole => userRole.propertyId))];
        
        // Get role permissions
        const rolePermissions = await Promise.all(
          roles.map(async (roleName) => {
            const role = await convex.query(api.roles.getRoleByName, {
              name: roleName
            });
            return role?.data?.permissions || {};
          })
        );

        // Merge permissions from all roles
        const mergedPermissions = rolePermissions.reduce((acc, permissions) => {
          return { ...acc, ...permissions };
        }, {});
        
        const userContext: UserContext = {
          userId,
          roles,
          propertyId: options.propertyId || propertyIds[0], // Use first property if not specified
          customPermissions: mergedPermissions,
        };

        const checker = createPermissionChecker(userContext);
        setPermissionChecker(checker);
      } catch (err) {
        console.error('Error loading user permissions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load permissions');
        setPermissionChecker(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserPermissions();
  }, [userId, isLoaded, isSignedIn, options.propertyId]);

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
    
    // Check if route requires specific permissions
    const matchedRoute = matchRoute(pathname);
    
    if (matchedRoute) {
      const routePermission = ROUTE_PERMISSIONS[matchedRoute];

      let hasRequiredPermission = false;

      // Check granular permission first
      if (routePermission.granular) {
        hasRequiredPermission = permissionChecker.hasGranularPermission(routePermission.granular);
      } else {
        // Check module-level permission
        hasRequiredPermission = permissionChecker.hasPermission(
          routePermission.module, 
          routePermission.action
        );
      }

      return hasRequiredPermission;
    }

    // If no specific permission required, allow access
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

// Higher-order component for protecting routes
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
  fallback 
}) => {
  const { hasPermission, hasGranularPermission, isLoading } = usePermissions();

  if (isLoading) {
    // You can return a loading spinner here
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

  return React.createElement('div', {children});
}

// Hook for checking multiple permissions
export function useMultiplePermissions() {
  const { permissionChecker } = usePermissions();

  const requireAll = (permissions: Array<{ module: Module; action: Action }>): boolean => {
    if (!permissionChecker) return false;
    return permissions.every(({ module, action }) => 
      permissionChecker.hasPermission(module, action)
    );
  };

  const requireAny = (permissions: Array<{ module: Module; action: Action }>): boolean => {
    if (!permissionChecker) return false;
    return permissions.some(({ module, action }) => 
      permissionChecker.hasPermission(module, action)
    );
  };

  return {
    requireAll,
    requireAny,
  };
}
