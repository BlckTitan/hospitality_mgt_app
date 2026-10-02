'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React, { Suspense } from 'react'
import MyProfileComponent from './components/my-profile'

export default function Page() {
  return (
    <div className='w-full p-4 bg-white'>
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">My profile</h1>
        <p className="text-gray-600">Your staff record linked to this login. Ask HR if a section is missing or wrong.</p>
      </div>
        <BackLink />
      </header>

      <Suspense fallback={<p>Please wait...</p>}>
        <MyProfileComponent />
      </Suspense>
    </div>
  )
}
