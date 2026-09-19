'use client'

import { BackLink } from '../../../../../shared/pageHeader';
import React from 'react'
import { Spinner } from 'react-bootstrap';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { useSearchParams } from 'next/navigation';
import { FormComponent } from '../components/editInventoryTaskForm';
import { TaskAssignmentPageGuide } from '../../../../../shared/taskAssignmentPageGuide';
import { InventoryPageGuide } from '../../components/inventoryPageGuide';

export default function Page() {
  const { isAuthenticated } = useConvexAuth()
  const searchParams = useSearchParams();
  const id = searchParams.get("task_id") ?? searchParams.get("id") ?? null
  const response = useQuery(
    api.inventoryTasks.getInventoryTask,
    isAuthenticated && id ? { inventoryTaskId: id as Id<'inventoryTasks'> } : 'skip'
  )

  if (response === undefined) return <div className='w-full h-screen flex justify-center items-center'><Spinner animation="border" size='sm' variant="dark" /></div>
  if (!response?.success || !response.data) return <div>No data available!</div>

  const row = response.data;

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full border-b flex justify-between items-center'>
        <h3>Update {row.taskType} — {row.item?.name ?? 'item'}</h3>
        <BackLink />
      </header>

      <InventoryPageGuide page="tasks" />
      <TaskAssignmentPageGuide page="inventory-edit" />

      <FormComponent
        id={row._id}
        status={row.status}
        leadId={row.lead?.staffId}
        helperIds={row.helpers?.map((helper) => helper.staffId) ?? []}
        notes={row.notes}
        propertyId={row.propertyId}
      />
    </div>
  )
}
