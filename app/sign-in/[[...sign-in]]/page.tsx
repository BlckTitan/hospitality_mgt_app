'use client'

import { SignIn, useAuth } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import React, { useEffect, useState } from 'react'
import Spinner from '../../../shared/spinner';
import { api } from '../../../convex/_generated/api';

const DEFAULT_REDIRECT = '/admin/dashboard';

export default function Page() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || DEFAULT_REDIRECT;
  const router = useRouter();

  const { isLoaded, userId } = useAuth();
  const userContext = useQuery(api.authContext.getCurrentUserContext);
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  const [userEnsured, setUserEnsured] = useState(false);
  const [ensureError, setEnsureError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !userId) {
      return;
    }

    // If user is authenticated but doesn't exist in Convex yet, ensure they are created
    if (userContext === null && !userEnsured && !ensureError) {
      ensureCurrentUser()
        .then(() => {
          setUserEnsured(true);
          setEnsureError(null);
        })
        .catch((error) => {
          console.error('Failed to ensure user:', error);
          setEnsureError('Failed to create user account');
        });
      return;
    }

    // Only redirect after user has been ensured in Convex and userContext is loaded
    if (userEnsured && userContext !== undefined) {
      const destination = userContext && userContext.roles?.length > 0 ? redirectUrl : '/setup/property';
      router.replace(destination);
    }
  }, [isLoaded, userId, userContext, userEnsured, ensureError, ensureCurrentUser, redirectUrl, router]);

  if (!isLoaded || (userId && !userEnsured) || (userId && userEnsured && userContext === undefined)) {
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
