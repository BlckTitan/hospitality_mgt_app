'use client'

import { SignIn, useAuth } from '@clerk/nextjs'
import { redirect } from 'next/navigation';
import React from 'react'
import { Spinner } from 'react-bootstrap';

export default function  Page() {

  const { isLoaded, userId } = useAuth();

  if (!isLoaded) return <div className='w-full h-screen flex items-center justify-center'><Spinner size='sm' variant='dark'/></div>;
  if (userId) return redirect('/admin/dashboard')

  return (
    <div className='w-full h-screen flex justify-center items-center'>
      <SignIn
        redirectUrl="/admin/dashboard"
        afterSignInUrl="/admin/dashboard"
      />
    </div>
  )
}
