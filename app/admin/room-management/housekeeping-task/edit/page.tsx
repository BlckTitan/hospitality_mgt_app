'use client';

import React from 'react';
import { Spinner } from 'react-bootstrap';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { useSearchParams } from 'next/navigation';
import { FormComponent } from '../components/editHousekeepingTaskForm';

export default function Page() {
  const searchParams = useSearchParams();
  const id = searchParams.get("task_id") ?? null;
  const response = useQuery(api.housekeepingTasks.getHousekeepingTask, { taskId: id as Id<'housekeepingTasks'> });

  // Check response for data
  if (response === undefined) return <div className='w-full h-screen flex items-center justify-center'><Spinner animation="border" size='sm' variant="dark" /></div>;
  if (!response.success || !response.data) return <div>No data available!</div>;

  const task = response.data;

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full border-b flex justify-between items-center'>
        <h3>Update Housekeeping Task - {task.room?.roomNumber || 'N/A'}</h3>
      </header>

      <FormComponent
        id={id as Id<'housekeepingTasks'>}
        roomId={task.roomId}
        assignedTo={task.assignedTo}
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
  );
}
