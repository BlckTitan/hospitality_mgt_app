'use client'

import { BackLink } from '../../../../shared/pageHeader';
import React, { Suspense } from 'react'
import StaffViewComponent from './components/staff-view';

export default function Page() {

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full mb-4 border-b flex justify-between items-center'>
        <h4 className=''>Profile</h4>
        <BackLink />
      </header>
      
      <Suspense fallback={<p>Please wait...</p>}>
        <StaffViewComponent/> 
      </Suspense>

    </div>
  )
}
