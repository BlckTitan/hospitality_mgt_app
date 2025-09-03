'use client'

import { SignUp, useUser } from '@clerk/nextjs'
import React from 'react'

export default function Page() {

  return (
    <div className='w-full h-screen flex justify-center items-center bg-red-400'>
      <SignUp/>
    </div>
  )
}
