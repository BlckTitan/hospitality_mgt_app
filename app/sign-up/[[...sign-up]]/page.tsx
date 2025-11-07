'use client'

import { SignUp, useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation';
import React from 'react'

export default function Page() {
  
  const { isSignedIn } = useUser();

  if (!isSignedIn) {
    return redirect('/admin/dashboard')
  }

  return (
    <div className='w-full h-screen flex justify-center items-center'>
      <SignUp/>
    </div>
  )
}
