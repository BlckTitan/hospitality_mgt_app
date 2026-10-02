'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React, { Suspense } from 'react'
import MyTasksComponent from './components/my-tasks'
import { TaskAssignmentPageGuide } from '../../../../shared/taskAssignmentPageGuide'

export default function Page() {
  return (
    <div className='w-full p-4 bg-white'>
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">My tasks</h1>
        <TaskAssignmentPageGuide page="mine" />
      </div>
        <BackLink />
      </header>
      <Suspense fallback={<p>Please wait...</p>}>
        <MyTasksComponent />
      </Suspense>
    </div>
  )
}
