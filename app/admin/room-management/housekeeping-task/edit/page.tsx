'use client'

import { BackLink } from '../../../../../shared/pageHeader';
import React from 'react'
import { Spinner } from 'react-bootstrap';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { useSearchParams } from 'next/navigation';
import { FormComponent } from '../components/editHousekeepingTaskForm';
import { TaskAssignmentPageGuide } from '../../../../../shared/taskAssignmentPageGuide';

export default function Page() {
  const { isAuthenticated } = useConvexAuth()
  const searchParams = useSearchParams();
  const id = searchParams.get("task_id") ?? searchParams.get("id") ?? null
  const response = useQuery(
    api.housekeepingTasks.getHousekeepingTask,
    isAuthenticated && id ? { taskId: id as Id<'housekeepingTasks'> } : 'skip'
  )

  if (response === undefined) return <div className='w-full h-screen flex justify-center items-center'><Spinner animation="border" size='sm' variant="dark" /></div>
  if (!response?.success || !response.data) return <div>No data available!</div>

  const task = response.data;

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full border-b flex justify-between items-center'>
        <h3>Update Housekeeping Task - {task.room?.roomNumber || 'N/A'}</h3>
        <BackLink />
      </header>

      <TaskAssignmentPageGuide page="housekeeping-edit" />

      <FormComponent
        id={task._id}
        roomId={task.roomId}
        assignedTo={task.lead?.staffId ?? task.assignedTo}
        helperIds={task.helpers?.map((row) => row.staffId) ?? []}
        taskType={task.taskType}
        status={task.status}
        priority={task.priority}
        scheduledAt={task.scheduledAt}
        startedAt={task.startedAt}
        completedAt={task.completedAt}
        estimatedDuration={task.estimatedDuration}
        actualDuration={task.actualDuration}
        notes={task.notes}
        propertyId={task.propertyId}
      />
    </div>
  )
}
