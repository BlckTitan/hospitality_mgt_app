'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React, { Suspense } from 'react'
import MyProfileComponent from './components/my-profile'

export default function Page() {
  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full mb-4 border-b flex justify-between items-center'>
        <h3>My profile</h3>
        <BackLink />
      </header>

      <Suspense fallback={<p>Please wait...</p>}>
        <MyProfileComponent />
      </Suspense>
    </div>
  )
}
