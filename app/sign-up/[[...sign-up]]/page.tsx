'use client'

import { SignUp, useAuth } from '@clerk/nextjs'
import { redirect } from 'next/navigation';
import React from 'react'
import ClerkUiMount from '../../../components/ClerkUiMount'
import Spinner from '../../../shared/spinner';
import { PROPERTY_SETUP_PATH } from '../../../lib/route-access';

export default function Page() {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded) return <div className='w-full h-screen flex items-center justify-center'><Spinner size='sm' /></div>;
  // The setup page sends invited users (who already have a role) on to their home page
  if (userId) return redirect(PROPERTY_SETUP_PATH);

  return (
    <div className='w-full h-screen flex justify-center items-center'>
      <ClerkUiMount fallback={<Spinner size='sm' />}>
        <SignUp
          forceRedirectUrl={PROPERTY_SETUP_PATH}
          signInUrl="/sign-in"
        />
      </ClerkUiMount>
    </div>
  )
}
