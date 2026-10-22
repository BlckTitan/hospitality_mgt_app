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
  hasNoAppRole,
  PUBLIC_ROUTES,
} from './lib/proxy-helpers';
import { isSignInEntryPath, isSignUpEntryPath } from './lib/auth-routes';
import {
  canAccessPath,
  NO_ACCESS_PATH,
  PROPERTY_SETUP_PATH,
  resolvePostAuthPath,
} from './lib/route-access';

const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isSetupRoute = createRouteMatcher(['/setup(.*)']);
const isNoAccessRoute = createRouteMatcher(['/no-access(.*)']);
const isHomeRoute = createRouteMatcher(['/']);
const isPublicRoute = createRouteMatcher(PUBLIC_ROUTES.map((route) => `${route}(.*)`));

function requestedPath(req: { nextUrl: { searchParams: { get: (name: string) => string | null } } }): string | null {
  return req.nextUrl.searchParams.get('next') ?? req.nextUrl.searchParams.get('redirect_url');
}

function redirectTo(path: string, reqUrl: string) {
  return NextResponse.redirect(new URL(path, reqUrl));
}

export default clerkMiddleware(async (auth, req) => {
  const { userId, getToken } = await auth();
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }

  if (userId && isHomeRoute(req)) {
    const authToken = await getClerkConvexAuthToken(getToken);

    if (isMissingClerkConvexJwtTemplate(userId, authToken)) {
      logMissingClerkConvexJwtTemplate('middleware');
      return redirectTo('/auth/clerk-setup', req.url);
    }

    const userContext = await ensureUserAndGetContext(authToken);

    if (!userContext || hasNoAppRole(userContext)) {
      return redirectTo(NO_ACCESS_PATH, req.url);
    }

    return redirectTo(resolvePostAuthPath(userContext), req.url);
  }

  if (!userId && (isAdminRoute(req) || isSetupRoute(req) || isNoAccessRoute(req))) {
    const url = new URL('/sign-in', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (userId && isSignUpEntryPath(pathname)) {
    const authToken = await getClerkConvexAuthToken(getToken);

    if (isMissingClerkConvexJwtTemplate(userId, authToken)) {
      logMissingClerkConvexJwtTemplate('middleware-signup');
      return redirectTo('/auth/clerk-setup', req.url);
    }

    const userContext = await ensureUserAndGetContext(authToken);

    if (!userContext || hasNoAppRole(userContext)) {
      return redirectTo(PROPERTY_SETUP_PATH, req.url);
    }

    return redirectTo(resolvePostAuthPath(userContext), req.url);
  }

  if (userId && isSignInEntryPath(pathname)) {
    const authToken = await getClerkConvexAuthToken(getToken);

    if (isMissingClerkConvexJwtTemplate(userId, authToken)) {
      logMissingClerkConvexJwtTemplate('middleware-signin');
      return redirectTo('/auth/clerk-setup', req.url);
    }

    const userContext = await ensureUserAndGetContext(authToken);
    if (!userContext || hasNoAppRole(userContext)) {
      return redirectTo(NO_ACCESS_PATH, req.url);
    }

    return redirectTo(resolvePostAuthPath(userContext, requestedPath(req)), req.url);
  }

  if (userId && !isPublicRoute(req)) {
    const authToken = await getClerkConvexAuthToken(getToken);

    if (isMissingClerkConvexJwtTemplate(userId, authToken)) {
      logMissingClerkConvexJwtTemplate('middleware');

      if (!pathname.startsWith('/auth/clerk-setup')) {
        return redirectTo('/auth/clerk-setup', req.url);
      }

      return NextResponse.next();
    }

    const userContext = await ensureUserAndGetContext(authToken);

    if (!userContext || hasNoAppRole(userContext)) {
      if (isNoAccessRoute(req) || isSetupRoute(req)) {
        return NextResponse.next();
      }

      return redirectTo(NO_ACCESS_PATH, req.url);
    }

    if (isNoAccessRoute(req)) {
      return redirectTo(resolvePostAuthPath(userContext), req.url);
    }

    const permissionChecker = createPermissionChecker(userContext);

    if (isSetupRoute(req)) {
      if (permissionChecker.hasGranularPermission('properties.create')) {
        return NextResponse.next();
      }

      return redirectTo(resolvePostAuthPath(userContext), req.url);
    }

    if (!canAccessPath(pathname, (granular) => permissionChecker.hasGranularPermission(granular))) {
      return redirectTo('/unauthorized', req.url);
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
