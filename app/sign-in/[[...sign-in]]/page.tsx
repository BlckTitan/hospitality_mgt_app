'use client'

import { SignIn, useUser } from '@clerk/nextjs'
import { redirect, useRouter } from 'next/navigation';
import React from 'react'

export default function Page() {

  const { isSignedIn } = useUser();

  if (!isSignedIn) {
    return redirect('/admin/dashboard')
  }

  return (
    <div className='w-full h-screen flex justify-center items-center'>
      <SignIn/>
    </div>
  )
}
