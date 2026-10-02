'use client'

import { BackLink } from '../../../../shared/pageHeader';
import React from 'react'
import Spinner from '../../../../shared/spinner';
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

  if (response === undefined) return <div className='w-full h-screen flex justify-center items-center'><Spinner  size='sm'  /></div>
  if (!response?.success || !response.data) return <div>No data available!</div>

  const row = response.data;

  return (
    <div className='w-full p-4 bg-white'>
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Update {row.title}</h1>
        <TaskAssignmentPageGuide page="maintenance-edit" />
      </div>
        <BackLink />
      </header>
      <FormComponent
        id={row._id}
        title={row.title}
        description={row.description}
        orderType={row.orderType}
        status={row.status}
        priority={row.priority}
        estimatedCost={row.estimatedCost}
        actualCost={row.actualCost}
        leadId={row.lead?.staffId}
        helperIds={row.helpers?.map((helper) => helper.staffId) ?? []}
        supplierId={row.supplierId}
        notes={row.notes}
        propertyId={row.propertyId}
        parts={row.parts}
      />
    </div>
  )
}
