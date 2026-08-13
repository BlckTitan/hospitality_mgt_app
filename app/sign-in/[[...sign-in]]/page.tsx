'use client'

import { SignIn, useAuth } from '@clerk/nextjs'
import { redirect, useSearchParams } from 'next/navigation';
import React from 'react'
import Spinner from '../../../shared/spinner';

const DEFAULT_REDIRECT = '/admin/dashboard';

export default function Page() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || DEFAULT_REDIRECT;

  const { isLoaded, userId } = useAuth();

  if (!isLoaded) return <div className='w-full h-screen flex items-center justify-center'><Spinner size='md' /></div>;
  if (userId) return redirect(redirectUrl);

  return (
    <div className='w-full h-screen flex justify-center items-center'>
      <SignIn fallbackRedirectUrl={redirectUrl} />
    </div>
  );
}
