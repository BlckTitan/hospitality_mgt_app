import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createPermissionChecker } from './lib/permission-utils';
import { ROUTE_PERMISSIONS } from './lib/proxy-permissions';
import { getUserContext, matchRoute, PUBLIC_ROUTES } from './lib/proxy-helpers';

// Route matchers
const isAdminRoute = createRouteMatcher(['/admin(.*)']); // protect all admin routes
const isSetupRoute = createRouteMatcher(['/setup(.*)']); // allow setup routes
const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']); // allow auth routes
const isPublicRoute = createRouteMatcher(PUBLIC_ROUTES.map((route) => `${route}(.*)`));

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