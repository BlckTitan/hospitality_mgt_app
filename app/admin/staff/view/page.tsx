'use client'

import React, { Suspense } from 'react'
import { Spinner } from 'react-bootstrap';
import StaffViewComponent from './components/staff-view';

export default function Page() {

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full mb-4 border-b flex justify-between items-center'>
        <h4 className=''>Profile</h4>
        <a 
          href='/admin/staff'
          className='flex items-center gap-1 !no-underline cursor-pointer' 
        >
          Back
        </a>
      </header>
      
      <Suspense fallback={<Spinner/>}>
        <StaffViewComponent/> 
      </Suspense>

    </div>
  )
}

