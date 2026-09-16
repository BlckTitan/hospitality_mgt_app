'use client'

import { BackLink } from '../../../../shared/pageHeader';
import React from 'react'
import { Spinner } from 'react-bootstrap';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useSearchParams } from 'next/navigation';
import { FormComponent } from '../components/editMaintenanceOrderForm';
import { TaskAssignmentPageGuide } from '../../../../shared/taskAssignmentPageGuide';

export default function Page() {
  const { isAuthenticated } = useConvexAuth()
  const searchParams = useSearchParams();
  const id = searchParams.get("order_id") ?? searchParams.get("id") ?? null
  const response = useQuery(
    api.maintenanceOrders.getMaintenanceOrder,
    isAuthenticated && id ? { maintenanceOrderId: id as Id<'maintenanceOrders'> } : 'skip'
  )

  if (response === undefined) return <div className='w-full h-screen flex justify-center items-center'><Spinner animation="border" size='sm' variant="dark" /></div>
  if (!response?.success || !response.data) return <div>No data available!</div>

  const row = response.data;

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full border-b flex justify-between items-center'>
        <h3>Update {row.title}</h3>
        <BackLink />
      </header>

      <TaskAssignmentPageGuide page="maintenance-edit" />

      <FormComponent
        id={row._id}
        title={row.title}
        orderType={row.orderType}
        status={row.status}
        priority={row.priority}
        leadId={row.lead?.staffId}
        helperIds={row.helpers?.map((helper) => helper.staffId) ?? []}
        supplierId={row.supplierId}
        notes={row.notes}
        propertyId={row.propertyId}
      />
    </div>
  )
}
