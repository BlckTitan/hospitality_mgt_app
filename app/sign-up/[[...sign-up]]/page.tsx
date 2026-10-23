'use client'

import { SignUp, useAuth } from '@clerk/nextjs'
import { redirect, useSearchParams } from 'next/navigation';
import React from 'react'
import ClerkUiMount from '../../../components/ClerkUiMount'
import Spinner from '../../../shared/spinner';
import { ACCEPT_INVITE_PATH, PROPERTY_SETUP_PATH } from '../../../lib/route-access';

export default function Page() {
  const { isLoaded, userId } = useAuth();
  const searchParams = useSearchParams();
  // Clerk adds __clerk_ticket to the link in an invitation email
  const fromInvite = searchParams.has('__clerk_ticket');
  const afterSignUp = fromInvite ? ACCEPT_INVITE_PATH : PROPERTY_SETUP_PATH;

  if (!isLoaded) return <div className='w-full h-screen flex items-center justify-center'><Spinner size='sm' /></div>;
  if (userId) return redirect(afterSignUp);

  return (
    <div className='w-full h-screen flex justify-center items-center'>
      <ClerkUiMount fallback={<Spinner size='sm' />}>
        <SignUp
          forceRedirectUrl={afterSignUp}
          signInUrl="/sign-in"
        />
      </ClerkUiMount>
    </div>
  )
}
