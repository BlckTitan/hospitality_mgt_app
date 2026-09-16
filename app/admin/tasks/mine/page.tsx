'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React, { Suspense } from 'react'
import MyTasksComponent from './components/my-tasks'
import { TaskAssignmentPageGuide } from '../../../../shared/taskAssignmentPageGuide'

export default function Page() {
  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full mb-4 border-b flex justify-between items-center'>
        <h3>My tasks</h3>
        <BackLink />
      </header>

      <TaskAssignmentPageGuide page="mine" />

      <Suspense fallback={<p>Please wait...</p>}>
        <MyTasksComponent />
      </Suspense>
    </div>
  )
}
