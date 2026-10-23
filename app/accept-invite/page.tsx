'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignOutButton, useUser } from '@clerk/nextjs';
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '../../shared/button';
import Spinner from '../../shared/spinner';
import { resolvePostAuthPath } from '../../lib/route-access';

const MAX_ATTEMPTS = 10;
const RETRY_DELAY_MS = 3000;

export default function AcceptInvitePage() {
  const router = useRouter();
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const userContext = useQuery(api.authContext.getCurrentUserContext, isAuthenticated ? {} : 'skip');
  const syncFromClerk = useAction(api.users.syncCurrentUserFromClerk);
  const trackLogin = useMutation(api.users.trackLogin);
  const [attempt, setAttempt] = useState(0);

  const hasRole = Boolean(userContext && userContext.roles.length > 0);
  const gaveUp = attempt >= MAX_ATTEMPTS && !hasRole;

  useEffect(() => {
    if (hasRole && userContext) {
      router.replace(resolvePostAuthPath(userContext));
    }
  }, [hasRole, userContext, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || hasRole || attempt >= MAX_ATTEMPTS) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        await syncFromClerk();
        await trackLogin();
      } catch (error) {
        console.error('Failed to apply invitation:', error);
      }
      if (!cancelled) {
        setAttempt((count) => count + 1);
      }
    }, attempt === 0 ? 0 : RETRY_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [attempt, hasRole, isAuthenticated, isLoading, syncFromClerk, trackLogin]);

  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 text-center space-y-6">
        {gaveUp ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900">We couldn&apos;t add you yet</h1>
            <p className="text-gray-600">
              Your account is ready, but we couldn&apos;t find an open invitation
              {email ? <> for <span className="font-medium">{email}</span></> : null}. Ask the
              administrator who invited you to check that the invitation is still active and was sent to this email address.
            </p>
            <Button className="w-full" onClick={() => setAttempt(0)}>
              Try again
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Spinner size="md" />
            <h1 className="text-2xl font-bold text-gray-900">Joining your property</h1>
            <p className="text-gray-600">
              You were invited by an administrator. We&apos;re adding your role now, and you&apos;ll be taken in automatically.
            </p>
          </div>
        )}

        <SignOutButton redirectUrl="/">
          <Button variant="outline" className="w-full">Sign out</Button>
        </SignOutButton>
      </div>
    </div>
  );
}
