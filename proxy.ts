import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  getClerkConvexAuthToken,
  isMissingClerkConvexJwtTemplate,
  logMissingClerkConvexJwtTemplate,
} from './lib/clerk-convex-auth';
import { createPermissionChecker } from './lib/permission-utils';
import {
  ensureUserAndGetContext,
  needsPropertySetup,
  PUBLIC_ROUTES,
} from './lib/proxy-helpers';
import { isSignInEntryPath, isSignUpEntryPath } from './lib/auth-routes';
import { canAccessPath, resolvePostAuthPath } from './lib/route-access';

const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isSetupRoute = createRouteMatcher(['/setup(.*)']);
const isHomeRoute = createRouteMatcher(['/']);
const isPublicRoute = createRouteMatcher(PUBLIC_ROUTES.map((route) => `${route}(.*)`));
export default clerkMiddleware(async (auth, req) => {
  const { userId, getToken } = await auth();
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  if (userId && isHomeRoute(req)) {
    const authToken = await getClerkConvexAuthToken(getToken);

    if (isMissingClerkConvexJwtTemplate(userId, authToken)) {
      logMissingClerkConvexJwtTemplate('middleware');
      const setupUrl = new URL('/auth/clerk-setup', req.url);
      return NextResponse.redirect(setupUrl);
    }

    const userContext = await ensureUserAndGetContext(authToken);

    if (!userContext || needsPropertySetup(userContext)) {
      const setupUrl = new URL('/setup/property', req.url);
      return NextResponse.redirect(setupUrl);
    }

    const homeUrl = new URL(resolvePostAuthPath(userContext), req.url);
    return NextResponse.redirect(homeUrl);
  }

  if (!userId && (isAdminRoute(req) || isSetupRoute(req))) {
    const url = new URL('/sign-in', req.url);
    url.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(url);
  }

  if (userId && isSignUpEntryPath(pathname)) {
    const authToken = await getClerkConvexAuthToken(getToken);

    if (isMissingClerkConvexJwtTemplate(userId, authToken)) {
      logMissingClerkConvexJwtTemplate('middleware-signup');
      const setupUrl = new URL('/auth/clerk-setup', req.url);
      return NextResponse.redirect(setupUrl);
    }

    const userContext = await ensureUserAndGetContext(authToken);

    // If user has roles (e.g., from an accepted invite), skip property setup
    if (userContext && !needsPropertySetup(userContext)) {
      const homeUrl = new URL(resolvePostAuthPath(userContext), req.url);
      return NextResponse.redirect(homeUrl);
    }

    // Otherwise, proceed with property setup
    const url = new URL('/setup/property', req.url);
    return NextResponse.redirect(url);
  }

  if (userId && isSignInEntryPath(pathname)) {
    const authToken = await getClerkConvexAuthToken(getToken);

    if (isMissingClerkConvexJwtTemplate(userId, authToken)) {
      logMissingClerkConvexJwtTemplate('middleware-signin');
      const setupUrl = new URL('/auth/clerk-setup', req.url);
      return NextResponse.redirect(setupUrl);
    }

    const userContext = await ensureUserAndGetContext(authToken);
    if (!userContext || needsPropertySetup(userContext)) {
      const setupUrl = new URL('/setup/property', req.url);
      return NextResponse.redirect(setupUrl);
    }

    const requested = req.nextUrl.searchParams.get('redirect_url');
    const homeUrl = new URL(resolvePostAuthPath(userContext, requested), req.url);
    return NextResponse.redirect(homeUrl);
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
      const homeUrl = new URL(resolvePostAuthPath(userContext), req.url);
      return NextResponse.redirect(homeUrl);
    }

    const permissionChecker = createPermissionChecker(userContext);
    if (!canAccessPath(pathname, (granular) => permissionChecker.hasGranularPermission(granular))) {
      const unauthorizedUrl = new URL('/unauthorized', req.url);
      return NextResponse.redirect(unauthorizedUrl);
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
