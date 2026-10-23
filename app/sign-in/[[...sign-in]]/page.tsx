'use client'

import { SignIn, useAuth, useUser } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import React, { useEffect, useState } from 'react';
import ClerkUiMount from '../../../components/ClerkUiMount';
import Spinner from '../../../shared/spinner';
import { api } from '../../../convex/_generated/api';
import { ACCEPT_INVITE_PATH, NO_ACCESS_PATH, resolvePostAuthPath } from '../../../lib/route-access';
import { wasInvitedByAdmin } from '../../../lib/invite-metadata';

export default function Page() {
  const searchParams = useSearchParams();
  const requestedPath = searchParams.get('next') ?? searchParams.get('redirect_url');
  const router = useRouter();

  const { isLoaded, userId } = useAuth();
  const { user } = useUser();
  const userContext = useQuery(api.authContext.getCurrentUserContext);
  const trackLogin = useMutation(api.users.trackLogin);
  const [loginTracked, setLoginTracked] = useState(false);
  const [ensureError, setEnsureError] = useState<string | null>(null);
  const forceRedirectUrl = requestedPath
    ? `/sign-in?next=${encodeURIComponent(requestedPath)}`
    : '/sign-in';

  useEffect(() => {
    if (!isLoaded || !userId || loginTracked) {
      return;
    }

    const trackUserLogin = async () => {
      try {
        await trackLogin();
        setLoginTracked(true);
      } catch (error) {
        console.error('Failed to track login:', error);
        setEnsureError('Failed to track login');
        setLoginTracked(true);
      }
    };

    trackUserLogin();
  }, [isLoaded, userId, trackLogin, loginTracked]);

  useEffect(() => {
    if (!loginTracked || userContext === undefined) {
      return;
    }

    const noRolePath = wasInvitedByAdmin(user?.publicMetadata) ? ACCEPT_INVITE_PATH : NO_ACCESS_PATH;
    const destination = userContext && userContext.roles?.length > 0
      ? resolvePostAuthPath(userContext, requestedPath)
      : noRolePath;
    router.replace(destination);
  }, [loginTracked, userContext, requestedPath, router, user]);

  if (!isLoaded || (userId && !loginTracked) || (userId && loginTracked && userContext === undefined)) {
    return <div className='w-full h-screen flex items-center justify-center'><Spinner size='md' /></div>;
  }

  if (ensureError) {
    return <div className='w-full h-screen flex items-center justify-center'>
      <div className='text-red-500'>{ensureError}</div>
    </div>;
  }

  return (
    <div className='w-full h-screen flex justify-center items-center'>
      <ClerkUiMount fallback={<Spinner size='md' />}>
        <SignIn forceRedirectUrl={forceRedirectUrl} signUpUrl="/sign-up" />
      </ClerkUiMount>
    </div>
  );
}
