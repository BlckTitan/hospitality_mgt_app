'use client'

import { BackLink } from '../../../shared/pageHeader';
import React, { useState } from 'react'
import { Button } from '../../../shared/button'
import { FcPlus} from "react-icons/fc";
import BootstrapModal from '../../../shared/modal'
import MaintenanceOrders from './components/maintenanceOrders'
import { FormComponent } from './components/createMaintenanceOrderForm';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { usePermissions } from '../../../hooks/usePermissions';
import { TaskAssignmentPageGuide } from '../../../shared/taskAssignmentPageGuide';

export default function Page() {
  const [modalShow, setModalShow] = useState(false);
  const { hasGranularPermission } = usePermissions();
  const canCreate = hasGranularPermission('maintenance.order.assign');
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const currentPropertyId = propertiesResponse?.data?.[0]?._id || '';

  if (!propertiesResponse?.data) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        Loading...
      </div>
    );
  }

  if (propertiesResponse.data.length === 0) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        <p className='text-xl'>No properties yet!</p>
      </div>
    );
  }

  return (
    <div className='w-full p-4 bg-white'>
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Maintenance orders</h1>
        <TaskAssignmentPageGuide page="maintenance" />
      </div>
        <div className="flex items-center gap-3">
          <BackLink />
        {canCreate && (
        <Button
          variant='light'
          className='cursor-pointer'
          circle
          onClick={() => setModalShow(true)}
        >
          <FcPlus className='w-8 h-8'/>
        </Button>
        )}
        </div>
      </header>
      <MaintenanceOrders currentPropertyId={currentPropertyId}/>

      <ModalComponent modalShow={modalShow} setModalShow={setModalShow} propertyId={currentPropertyId}/>
    </div>
  )
}

function ModalComponent(props: { modalShow: boolean; setModalShow: (show: boolean) => void; propertyId: string }) {
  return (
    <>
      <BootstrapModal
        show={props.modalShow}
        onHide={() => props.setModalShow(false)}
        backdrop="static"
        keyboard={false}
        heading="Add New Maintenance Order"
        body={
          <FormComponent
            onClose={() => props.setModalShow(false)}
            propertyId={props.propertyId}
          />
        }
      />
    </>
  );
}
