'use client'

import { SignUp, useAuth } from '@clerk/nextjs'
import { redirect } from 'next/navigation';
import React, { useEffect } from 'react'
import { Spinner } from 'react-bootstrap';

export default function Page() {
  
  const { isLoaded, userId } = useAuth();

  // Redirect to property setup after sign-up is complete
  // userId exists means user has just completed sign-up
  useEffect(() => {
    if (isLoaded && userId) {
      redirect('/setup/property');
    }
  }, [isLoaded, userId]);

  if (!isLoaded) return <div className='w-full h-screen flex items-center justify-center'><Spinner size='sm' variant='dark'/></div>;

  return (
    <div className='w-full h-screen flex justify-center items-center'>
      <SignUp 
        redirectUrl="/setup/property"
        signInUrl="/sign-in"
      />
    </div>
  )
}
