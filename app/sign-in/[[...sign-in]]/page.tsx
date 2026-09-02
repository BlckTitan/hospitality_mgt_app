'use client'

import { SignIn, useAuth } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import React, { useEffect, useState } from 'react';
import Spinner from '../../../shared/spinner';
import { api } from '../../../convex/_generated/api';

const DEFAULT_REDIRECT = '/admin/dashboard';

export default function Page() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || DEFAULT_REDIRECT;
  const router = useRouter();

  const { isLoaded, userId } = useAuth();
  const userContext = useQuery(api.authContext.getCurrentUserContext);
  const trackLogin = useMutation(api.users.trackLogin);
  const [loginTracked, setLoginTracked] = useState(false);
  const [ensureError, setEnsureError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !userId || loginTracked) {
      return;
    }

    const trackUserLogin = async () => {
      try {
        await trackLogin();
        setLoginTracked(true);
        // Allow Clerk to handle the redirect via fallbackRedirectUrl
      } catch (error) {
        console.error('Failed to track login:', error);
        setEnsureError('Failed to track login');
        setLoginTracked(true); // Don't block on errors
      }
    };

    trackUserLogin();
  }, [isLoaded, userId, trackLogin, loginTracked]);

  useEffect(() => {
    if (!loginTracked || userContext === undefined) {
      return;
    }

    const destination = userContext && userContext.roles?.length > 0 ? redirectUrl : '/setup/property';
    router.replace(destination);
  }, [loginTracked, userContext, redirectUrl, router]);

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
      <SignIn fallbackRedirectUrl={redirectUrl} />
    </div>
  );
}
