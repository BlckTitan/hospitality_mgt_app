import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
import { createPermissionChecker, UserContext } from './permission-utils';

export const PUBLIC_ROUTES = [
  '/',
  '/sign-in',
  '/sign-up',
  '/auth/clerk-setup',
  '/api/webhook/clerk',
  '/api/auth',
];

export function hasNoAppRole(userContext: UserContext): boolean {
  return userContext.roles.length === 0;
}

async function fetchUserContext(authToken: string): Promise<UserContext | null> {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(authToken);

  const context = await convex.query(api.authContext.getCurrentUserContext, {});

  if (!context) {
    return null;
  }

  return {
    userId: context.userId,
    roles: context.roles,
    propertyId: context.propertyId,
    customPermissions: context.customPermissions,
  };
}

export async function getUserContext(
  authToken: string | null,
): Promise<UserContext | null> {
  if (!authToken) {
    return null;
  }

  try {
    return await fetchUserContext(authToken);
  } catch (error) {
    console.error('Error getting user context:', error);
    return null;
  }
}

export async function ensureUserAndGetContext(
  authToken: string | null,
): Promise<UserContext | null> {
  if (!authToken) {
    return null;
  }

  try {
    let context = await fetchUserContext(authToken);
    if (context && !hasNoAppRole(context)) {
      return context;
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(authToken);

    if (!context) {
      await convex.mutation(api.users.ensureCurrentUser, {});
      context = await fetchUserContext(authToken);
    }

    // An invite can only be matched once the row has the user's real email.
    if (!context || hasNoAppRole(context)) {
      const { synced } = await convex.action(api.users.syncCurrentUserFromClerk, {});
      if (synced) {
        context = await fetchUserContext(authToken);
      }
    }

    return context;
  } catch (error) {
    console.error('Error ensuring user and getting context:', error);
    return null;
  }
}

export function createUserPermissionChecker(userContext: UserContext) {
  return createPermissionChecker(userContext);
}
