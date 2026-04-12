'use client';

import React from 'react';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Action, Module } from '../lib/permissions';
import { createPermissionChecker, PermissionChecker, UserContext } from '../lib/permission-utils';
import { convex, api } from '../lib/convex-client';

// Route permission mapping (same as middleware)
interface RoutePermission {
  granular: string;
}

const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  // Admin Dashboard
  '/admin/dashboard': { granular: 'reports.read' },

  // Users & Roles
  '/admin/user': { granular: 'users.read' },
  '/admin/user/role': { granular: 'roles.read' },
  '/admin/user/userRole': { granular: 'users.read' },

  // Properties
  '/admin/property': { granular: 'properties.read' },

  // Staff Management
  '/admin/staff': { granular: 'staff.read' },

  // Bar Management (Food & Beverage)
  '/admin/bar-management': { granular: 'fnb.read' },
  '/admin/bar-management/bar': { granular: 'fnb.read' },
  '/admin/bar-management/beverages': { granular: 'fnb.read' },
  '/admin/bar-management/user-stock-logs': { granular: 'fnb.read' },
  '/admin/bar-management/store-inventory': { granular: 'inventory.read' },
  '/admin/bar-management/store-transactions': { granular: 'inventory.read' },

  // Inventory Management
  '/admin/inventory-management': { granular: 'inventory.read' },
  '/admin/inventory-management/inventory-item': { granular: 'inventory.read' },
  '/admin/inventory-management/inventory-transaction': { granular: 'inventory.read' },
  '/admin/inventory-management/supplier': { granular: 'inventory.read' },
  '/admin/inventory-management/purchase-order': { granular: 'inventory.read' },
  '/admin/inventory-management/purchase-order-line': { granular: 'inventory.read' },

  // Room Management & Reservations
  '/admin/room-management': { granular: 'reservations.read' },
  '/admin/room-management/room-type': { granular: 'rooms.read' },
  '/admin/room-management/room': { granular: 'rooms.read' },
  '/admin/room-management/reservation': { granular: 'reservations.read' },
  '/admin/room-management/guest': { granular: 'reservations.read' },
  '/admin/room-management/housekeeping-task': { granular: 'system.admin' },

  // Shift Management
  '/admin/shift-management': { granular: 'staff.read' },
  '/admin/shift-management/shift': { granular: 'staff.read' },

  // Additional admin routes for specific actions
  '/admin/user/create': { granular: 'users.create' },
  '/admin/user/[id]/edit': { granular: 'users.update' },
  '/admin/user/[id]': { granular: 'users.read' },
  '/admin/user/role/create': { granular: 'roles.create' },
  '/admin/user/role/[id]/edit': { granular: 'roles.update' },
  '/admin/user/userRole/create': { granular: 'users.create' },
  '/admin/user/userRole/[id]/edit': { granular: 'users.update' },

  // Properties
  '/admin/property/create': { granular: 'properties.create' },
  '/admin/property/[id]/edit': { granular: 'properties.update' },

  // Staff Management
  '/admin/staff/create': { granular: 'staff.create' },
  '/admin/staff/[id]/edit': { granular: 'staff.update' },
  '/admin/shift-management/shift/create': { granular: 'staff.create' },
  '/admin/shift-management/shift/[id]/edit': { granular: 'staff.update' },

  // Reservations & Rooms
  '/admin/room-management/reservation/create': { granular: 'reservations.create' },
  '/admin/room-management/reservation/[id]/edit': { granular: 'reservations.update' },
  '/admin/room-management/reservation/[id]/checkin': { granular: 'reservations.update' },
  '/admin/room-management/reservation/[id]/checkout': { granular: 'reservations.update' },
  '/admin/room-management/room/create': { granular: 'rooms.update' },
  '/admin/room-management/room/[id]/edit': { granular: 'rooms.update' },
  '/admin/room-management/room-type/create': { granular: 'rooms.update' },
  '/admin/room-management/room-type/[id]/edit': { granular: 'rooms.update' },
  '/admin/room-management/guest/create': { granular: 'reservations.create' },
  '/admin/room-management/guest/[id]/edit': { granular: 'reservations.update' },
  '/admin/room-management/housekeeping-task/create': { granular: 'system.admin' },
  '/admin/room-management/housekeeping-task/[id]/edit': { granular: 'system.admin' },

  // Food & Beverage
  '/admin/bar-management/bar/create': { granular: 'fnb.create' },
  '/admin/bar-management/bar/[id]/edit': { granular: 'fnb.update' },
  '/admin/bar-management/beverages/create': { granular: 'fnb.create' },
  '/admin/bar-management/beverages/[id]/edit': { granular: 'fnb.update' },

  // Inventory Management
  '/admin/inventory-management/inventory-item/create': { granular: 'inventory.create' },
  '/admin/inventory-management/inventory-item/[id]/edit': { granular: 'inventory.update' },
  '/admin/inventory-management/inventory-transaction/create': { granular: 'inventory.create' },
  '/admin/inventory-management/inventory-transaction/[id]/edit': { granular: 'inventory.update' },
  '/admin/inventory-management/supplier/create': { granular: 'inventory.create' },
  '/admin/inventory-management/supplier/[id]/edit': { granular: 'inventory.update' },
  '/admin/inventory-management/purchase-order/create': { granular: 'inventory.create' },
  '/admin/inventory-management/purchase-order/[id]/edit': { granular: 'inventory.update' },
  '/admin/inventory-management/purchase-order-line/create': { granular: 'inventory.create' },
  '/admin/inventory-management/purchase-order-line/[id]/edit': { granular: 'inventory.update' },
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
  const { userId, isLoaded, isSignedIn, sessionClaims } = useAuth();
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

        // Merge permissions from all roles using OR logic
        const mergedPermissions = rolePermissions.reduce((acc, permissions) => {
          Object.entries(permissions).forEach(([key, value]) => {
            if (value) {
              acc[key] = true;
            }
          });
          return acc;
        }, {} as Record<string, boolean>);
        
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
    // Check if user has admin role - admins can access everything
    if (userId && isSignedIn && sessionClaims?.metadata?.role === 'admin') {
      return true;
    }

    if (!permissionChecker) return false;

    // Check if route requires specific permissions
    const matchedRoute = matchRoute(pathname);

    if (matchedRoute) {
      const routePermission = ROUTE_PERMISSIONS[matchedRoute];

      return permissionChecker.hasGranularPermission(routePermission.granular);
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
