const NO_DASHBOARD_LAYOUT_ROUTES = [
  '/',
  '/sign-in',
  '/account',
  '/sign-up',
  '/setup/property',
  '/auth/clerk-setup',
  '/unauthorized',
] as const;

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isNoDashboardLayoutPath(pathname: string): boolean {
  const path = normalizePathname(pathname);

  return NO_DASHBOARD_LAYOUT_ROUTES.some((route) => {
    if (route === '/') {
      return path === '/';
    }
    return path === route || path.startsWith(`${route}/`);
  });
}

export function isSignInEntryPath(pathname: string): boolean {
  return normalizePathname(pathname) === '/sign-in';
}

export function isSignUpEntryPath(pathname: string): boolean {
  return normalizePathname(pathname) === '/sign-up';
}
