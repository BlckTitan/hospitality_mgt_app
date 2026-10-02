'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React, { Suspense } from 'react'
import TaskTemplatesComponent from './components/templates'
import { TaskAssignmentPageGuide } from '../../../../shared/taskAssignmentPageGuide'

export default function Page() {
  return (
    <div className='w-full p-4 bg-white'>
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Task templates</h1>
        <TaskAssignmentPageGuide page="templates" />
      </div>
        <BackLink />
      </header>
      <Suspense fallback={<p>Please wait...</p>}>
        <TaskTemplatesComponent />
      </Suspense>
    </div>
  )
}
