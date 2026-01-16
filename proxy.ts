import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server'

// export default clerkMiddleware();
const isAdminRoute = createRouteMatcher(['/admin(.*)'])//protect all admin routes
const isSetupRoute = createRouteMatcher(['/setup(.*)'])//allow setup routes
const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])//allow auth routes

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  
  // If user is not logged in and trying to access admin/setup routes, redirect to sign-in
  if (!userId && (isAdminRoute(req) || isSetupRoute(req))) {
    const url = new URL('/sign-in', req.url)
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
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}