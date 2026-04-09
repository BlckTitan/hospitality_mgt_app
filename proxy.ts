import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createPermissionChecker, UserContext } from './lib/permission-utils';
import { Module, Action } from './lib/permissions';
import { ConvexHttpClient } from 'convex/browser';
import { api } from './convex/_generated/api';

// Route permission mapping
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
  '/admin/inventory-management/inventory-item/create': { module: 'inventory', action: 'create' },
  '/admin/inventory-management/inventory-item/[id]/edit': { module: 'inventory', action: 'update' },
  '/admin/inventory-management/inventory-transaction': { module: 'inventory', action: 'read' },
  '/admin/inventory-management/inventory-transaction/create': { module: 'inventory', action: 'create' },
  '/admin/inventory-management/inventory-transaction/[id]/edit': { module: 'inventory', action: 'update' },
  '/admin/inventory-management/supplier': { module: 'inventory', action: 'read' },
  '/admin/inventory-management/supplier/create': { module: 'inventory', action: 'create' },
  '/admin/inventory-management/supplier/[id]/edit': { module: 'inventory', action: 'update' },
  '/admin/inventory-management/purchase-order': { module: 'inventory', action: 'read' },
  '/admin/inventory-management/purchase-order/create': { module: 'inventory', action: 'create' },
  '/admin/inventory-management/purchase-order/[id]/edit': { module: 'inventory', action: 'update' },
  '/admin/inventory-management/purchase-order-line': { module: 'inventory', action: 'read' },
  '/admin/inventory-management/purchase-order-line/create': { module: 'inventory', action: 'create' },
  '/admin/inventory-management/purchase-order-line/[id]/edit': { module: 'inventory', action: 'update' },

  // Room Management & Reservations
  '/admin/room-management': { module: 'reservations', action: 'read' },
  '/admin/room-management/room-type': { module: 'reservations', action: 'read' },
  '/admin/room-management/room-type/create': { module: 'reservations', action: 'create' },
  '/admin/room-management/room-type/[id]/edit': { module: 'reservations', action: 'update' },
  '/admin/room-management/room': { module: 'reservations', action: 'read' },
  '/admin/room-management/room/create': { module: 'reservations', action: 'create' },
  '/admin/room-management/room/[id]/edit': { module: 'reservations', action: 'update' },
  '/admin/room-management/reservation': { module: 'reservations', action: 'read' },
  '/admin/room-management/reservation/create': { module: 'reservations', action: 'create' },
  '/admin/room-management/reservation/[id]/edit': { module: 'reservations', action: 'update' },
  '/admin/room-management/reservation/[id]/checkin': { module: 'reservations', action: 'update', granular: 'reservations.checkin' },
  '/admin/room-management/reservation/[id]/checkout': { module: 'reservations', action: 'update', granular: 'reservations.checkout' },
  '/admin/room-management/guest': { module: 'reservations', action: 'read' },
  '/admin/room-management/guest/create': { module: 'reservations', action: 'create' },
  '/admin/room-management/guest/[id]/edit': { module: 'reservations', action: 'update' },
  '/admin/room-management/housekeeping-task': { module: 'maintenance', action: 'read' },
  '/admin/room-management/housekeeping-task/create': { module: 'maintenance', action: 'create' },
  '/admin/room-management/housekeeping-task/[id]/edit': { module: 'maintenance', action: 'update' },

  // Financial Management
  '/admin/finance': { module: 'finance', action: 'read' },
  '/admin/finance/charges': { module: 'finance', action: 'create' },
  '/admin/finance/refunds': { module: 'finance', action: 'update' },
  '/admin/finance/reports': { module: 'finance', action: 'read' },

  // Reports & Analytics
  '/admin/reports': { module: 'reports', action: 'read' },
  '/admin/analytics': { module: 'reports', action: 'read' },
  '/admin/sales-summaries': { module: 'reports', action: 'read' },

  // System Settings
  '/admin/system': { module: 'system', action: 'read' },
  '/admin/system/settings': { module: 'system', action: 'update' },

  // Maintenance & Facilities
  '/admin/maintenance': { module: 'maintenance', action: 'read' },
  '/admin/maintenance/tasks': { module: 'maintenance', action: 'read' },
  '/admin/maintenance/tasks/create': { module: 'maintenance', action: 'create' },

  // Security & Access Logs
  '/admin/security': { module: 'security', action: 'read' },
  '/admin/security/logs': { module: 'security', action: 'read' },
};

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/sign-in',
  '/sign-up',
  '/api/webhook/clerk',
  '/api/auth',
];

// Helper function to match dynamic routes
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

// Helper function to get user context from Convex database
async function getUserContext(userId: string): Promise<UserContext | null> {
  try {
    // Initialize Convex client for server-side use
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    
    // First, find user in our database using their Clerk ID
    const user = await convex.query(api.users.getUserByExternalId, {
      externalId: userId
    });
    
    if (!user.success || !user.data) {
      console.warn('User not found in database:', userId);
      return null;
    }
    
    // Fetch user roles with populated role and property data
    const userRoles = await convex.query(api.userRoles.getUserRolesByUserId, {
      userId: user.data._id
    });
    
    if (!userRoles.success) {
      console.error('Failed to fetch user roles:', userRoles.message);
      return null;
    }
    
    // Extract role names and property information
    const roles = userRoles.data.map(userRole => userRole.roleName);
    const propertyIds = [...new Set(userRoles.data.map(userRole => userRole.propertyId))];
    
    // Get role permissions for all assigned roles
    const rolePermissions = await Promise.all(
      roles.map(async (roleName) => {
        const role = await convex.query(api.roles.getRoleByName, {
          name: roleName
        });
        return role?.data?.permissions || {};
      })
    );
    
    // Merge permissions from all roles (higher-level roles override lower-level ones)
    const mergedPermissions = rolePermissions.reduce((acc, permissions) => {
      return { ...acc, ...permissions };
    }, {});
    
    console.log('User context loaded:', {
      userId,
      roles,
      propertyIds,
      permissionsCount: Object.keys(mergedPermissions).length
    });
    
    return {
      userId,
      roles,
      propertyId: propertyIds[0], // Use first property as default
      customPermissions: mergedPermissions,
    };
  } catch (error) {
    console.error('Error getting user context:', error);
    return null;
  }
}

// Route matchers
const isAdminRoute = createRouteMatcher(['/admin(.*)'])//protect all admin routes
const isSetupRoute = createRouteMatcher(['/setup(.*)'])//allow setup routes
const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])//allow auth routes
const isPublicRoute = createRouteMatcher(PUBLIC_ROUTES.map(route => `${route}(.*)`));

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const { pathname } = req.nextUrl;
  
  // Skip middleware for static files
  if (pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // If user is not logged in and trying to access admin/setup routes, redirect to sign-in
  if (!userId && (isAdminRoute(req) || isSetupRoute(req))) {
    const url = new URL('/sign-in', req.url)
    url.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(url)
  }

  // If user is logged in and trying to access auth routes, redirect to property setup
  if (userId && isAuthRoute(req)) {
    const url = new URL('/setup/property', req.url)
    return NextResponse.redirect(url)
  }

  // Protect all routes starting with `/admin`
  if (isAdminRoute(req) && (await auth()).sessionClaims?.metadata?.role !== 'admin') {
    const url = new URL('/', req.url)
    return NextResponse.redirect(url)
  }

  // RBAC Permission checking for authenticated users
  if (userId && !isPublicRoute(req)) {
    const userContext = await getUserContext(userId);
    
    if (!userContext) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Check if route requires specific permissions
    const matchedRoute = matchRoute(pathname);
    
    if (matchedRoute) {
      const routePermission = ROUTE_PERMISSIONS[matchedRoute];
      const permissionChecker = createPermissionChecker(userContext);

      let hasPermission = false;

      // Check granular permission first
      if (routePermission.granular) {
        hasPermission = permissionChecker.hasGranularPermission(routePermission.granular);
      } else {
        // Check module-level permission
        hasPermission = permissionChecker.hasPermission(
          routePermission.module, 
          routePermission.action
        );
      }

      if (!hasPermission) {
        // Redirect to unauthorized page or dashboard
        const unauthorizedUrl = new URL('/unauthorized', req.url);
        return NextResponse.redirect(unauthorizedUrl);
      }
    }
  }

  return NextResponse.next();
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}