'use client'

import { SignUp, useAuth } from '@clerk/nextjs'
import { redirect } from 'next/navigation';
import React from 'react'
import ClerkUiMount from '../../../components/ClerkUiMount'
import Spinner from '../../../shared/spinner';

export default function Page() {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded) return <div className='w-full h-screen flex items-center justify-center'><Spinner size='sm' /></div>;
  // Let middleware handle routing after sign-up based on user roles
  if (userId) return redirect('/');

  return (
    <div className='w-full h-screen flex justify-center items-center'>
      <ClerkUiMount fallback={<Spinner size='sm' />}>
        <SignUp
          fallbackRedirectUrl="/"
          signInUrl="/sign-in"
        />
      </ClerkUiMount>
    </div>
  )
}
