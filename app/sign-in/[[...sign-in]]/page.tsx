'use client'

import { SignIn, useAuth } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import React, { useEffect } from 'react'
import Spinner from '../../../shared/spinner';
import { api } from '../../../convex/_generated/api';

const DEFAULT_REDIRECT = '/admin/dashboard';

export default function Page() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || DEFAULT_REDIRECT;
  const router = useRouter();

  const { isLoaded, userId } = useAuth();
  const userContext = useQuery(api.authContext.getCurrentUserContext);

  useEffect(() => {
    if (!isLoaded || !userId || userContext === undefined) {
      return;
    }

    const destination = userContext && userContext.roles?.length > 0 ? redirectUrl : '/setup/property';
    router.replace(destination);
  }, [isLoaded, userId, userContext, redirectUrl, router]);

  if (!isLoaded || (userId && userContext === undefined)) {
    return <div className='w-full h-screen flex items-center justify-center'><Spinner size='md' /></div>;
  }

  if (userId) {
    return <div className='w-full h-screen flex items-center justify-center'><Spinner size='md' /></div>;
  }

  return (
    <div className='w-full h-screen flex justify-center items-center'>
      <SignIn fallbackRedirectUrl={redirectUrl} />
    </div>
  );
}
