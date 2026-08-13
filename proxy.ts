import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  getClerkConvexAuthToken,
  isMissingClerkConvexJwtTemplate,
  logMissingClerkConvexJwtTemplate,
} from './lib/clerk-convex-auth';
import { createPermissionChecker } from './lib/permission-utils';
import { ROUTE_PERMISSIONS } from './lib/proxy-permissions';
import {
  ensureUserAndGetContext,
  needsPropertySetup,
  PUBLIC_ROUTES,
} from './lib/proxy-helpers';
import { matchRoute } from './lib/route-matching';

const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isSetupRoute = createRouteMatcher(['/setup(.*)']);
const isSignUpRoute = createRouteMatcher(['/sign-up(.*)']);
const isSignInRoute = createRouteMatcher(['/sign-in(.*)']);
const isPublicRoute = createRouteMatcher(PUBLIC_ROUTES.map((route) => `${route}(.*)`));
export default clerkMiddleware(async (auth, req) => {
  const { userId, getToken } = await auth();
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  if (!userId && (isAdminRoute(req) || isSetupRoute(req))) {
    const url = new URL('/sign-in', req.url);
    url.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(url);
  }

  if (userId && isSignUpRoute(req)) {
    const url = new URL('/setup/property', req.url);
    return NextResponse.redirect(url);
  }

  if (userId && isSignInRoute(req)) {
    const redirectUrl = req.nextUrl.searchParams.get('redirect_url') || '/admin/dashboard';
    const url = new URL(redirectUrl, req.url);
    return NextResponse.redirect(url);
  }

  if (userId && !isPublicRoute(req)) {
    const authToken = await getClerkConvexAuthToken(getToken);

    if (isMissingClerkConvexJwtTemplate(userId, authToken)) {
      logMissingClerkConvexJwtTemplate('middleware');

      if (!pathname.startsWith('/auth/clerk-setup')) {
        const setupUrl = new URL('/auth/clerk-setup', req.url);
        return NextResponse.redirect(setupUrl);
      }

      return NextResponse.next();
    }

    const userContext = await ensureUserAndGetContext(authToken);

    if (!userContext) {
      if (isSetupRoute(req)) {
        return NextResponse.next();
      }

      const setupUrl = new URL('/setup/property', req.url);
      return NextResponse.redirect(setupUrl);
    }

    const onboardingRequired = needsPropertySetup(userContext);

    if (onboardingRequired) {
      if (isSetupRoute(req)) {
        return NextResponse.next();
      }

      const setupUrl = new URL('/setup/property', req.url);
      return NextResponse.redirect(setupUrl);
    }

    if (isSetupRoute(req)) {
      const dashboardUrl = new URL('/admin/dashboard', req.url);
      return NextResponse.redirect(dashboardUrl);
    }

    if (isAdminRoute(req)) {
      const matchedRoute = matchRoute(pathname, ROUTE_PERMISSIONS);

      if (!matchedRoute) {
        const unauthorizedUrl = new URL('/unauthorized', req.url);
        return NextResponse.redirect(unauthorizedUrl);
      }

      const routePermission = ROUTE_PERMISSIONS[matchedRoute];
      const permissionChecker = createPermissionChecker(userContext);
      const hasPermission = permissionChecker.hasGranularPermission(routePermission.granular);

      if (!hasPermission) {
        const unauthorizedUrl = new URL('/unauthorized', req.url);
        return NextResponse.redirect(unauthorizedUrl);
      }
    } else {
      const matchedRoute = matchRoute(pathname, ROUTE_PERMISSIONS);

      if (matchedRoute) {
        const routePermission = ROUTE_PERMISSIONS[matchedRoute];
        const permissionChecker = createPermissionChecker(userContext);
        const hasPermission = permissionChecker.hasGranularPermission(routePermission.granular);

        if (!hasPermission) {
          const unauthorizedUrl = new URL('/unauthorized', req.url);
          return NextResponse.redirect(unauthorizedUrl);
        }
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
