import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createPermissionChecker, UserContext } from './lib/permission-utils';
import { ConvexHttpClient } from 'convex/browser';
import { api } from './convex/_generated/api';

// Route permission mapping
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

      // Check granular permission
      const hasPermission = permissionChecker.hasGranularPermission(routePermission.granular);

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