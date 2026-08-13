export const CLERK_CONVEX_JWT_TEMPLATE = 'convex' as const;

export const CLERK_CONVEX_SETUP_URL =
  'https://dashboard.clerk.com/apps/setup/convex';

export const MISSING_CLERK_CONVEX_JWT_TEMPLATE_ERROR =
  'Clerk JWT template "convex" is not configured. Enable the Convex integration in the Clerk dashboard, then sign out and sign back in.';

type GetTokenFn = (options: { template: string }) => Promise<string | null>;

export async function getClerkConvexAuthToken(
  getToken: GetTokenFn,
): Promise<string | null> {
  return getToken({ template: CLERK_CONVEX_JWT_TEMPLATE });
}

export function isMissingClerkConvexJwtTemplate(
  userId: string | null | undefined,
  token: string | null,
): boolean {
  return Boolean(userId) && !token;
}

export function logMissingClerkConvexJwtTemplate(source: string): void {
  console.error(
    `[auth:${source}] ${MISSING_CLERK_CONVEX_JWT_TEMPLATE_ERROR} Setup: ${CLERK_CONVEX_SETUP_URL}`,
  );
}
