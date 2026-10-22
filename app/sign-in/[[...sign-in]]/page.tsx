'use client'

import { SignIn, useAuth } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import React, { useEffect, useState } from 'react';
import ClerkUiMount from '../../../components/ClerkUiMount';
import Spinner from '../../../shared/spinner';
import { api } from '../../../convex/_generated/api';
import { NO_ACCESS_PATH, resolvePostAuthPath } from '../../../lib/route-access';

export default function Page() {
  const searchParams = useSearchParams();
  const requestedPath = searchParams.get('next') ?? searchParams.get('redirect_url');
  const router = useRouter();

  const { isLoaded, userId } = useAuth();
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

    const destination = userContext && userContext.roles?.length > 0
      ? resolvePostAuthPath(userContext, requestedPath)
      : NO_ACCESS_PATH;
    router.replace(destination);
  }, [loginTracked, userContext, requestedPath, router]);

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
