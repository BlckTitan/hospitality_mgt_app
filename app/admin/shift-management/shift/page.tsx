'use client';

import { BackLink } from '../../../../shared/pageHeader';
import React, { useState } from 'react';
import { Button } from '../../../../shared/button';
import { FcPlus } from 'react-icons/fc';
import Shifts from './components/shifts';
import { FormComponent } from './components/createShiftForm';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import BootstrapModal from '../../../../shared/modal';
import { usePermissions } from '../../../../hooks/usePermissions';
import { ShiftPageGuide } from '../components/shiftPageGuide';

export default function ShiftPage() {
  const [modalShow, setModalShow] = useState(false);
  const { hasGranularPermission } = usePermissions();
  const canCreate = hasGranularPermission('staff.create');
  const userContext = useQuery(api.authContext.getCurrentUserContext);
  const currentPropertyId = userContext?.propertyId || '';

  if (userContext === undefined) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        Loading...
      </div>
    );
  }

  if (!currentPropertyId) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        <p className='text-xl'>No properties yet!</p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Shifts</h1>
        <ShiftPageGuide page="shift" />
      </div>
        <div className="flex items-center gap-3">
          <BackLink />
        {canCreate && (
          <Button
            variant="light"
            className="cursor-pointer"
            circle
            onClick={() => setModalShow(true)}
          >
            <FcPlus className="w-8 h-8" />
          </Button>
        )}
      
        </div>
      </header>
      <Shifts currentPropertyId={currentPropertyId}/>

      {canCreate && (
        <ModalComponent
          modalShow={modalShow}
          setModalShow={setModalShow}
          onSuccess={() => {
            setModalShow(false);
          }}
          propertyId={currentPropertyId}
        />
      )}
    </div>
  );
}

function ModalComponent(props: {
  modalShow: boolean;
  setModalShow: (show: boolean) => void;
  onSuccess: () => void;
  propertyId: string;
}) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => props.setModalShow(false)}
      backdrop="static"
      keyboard={false}
      heading="Add New Shift"
      body={
        <FormComponent
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
          propertyId={props.propertyId}
        />
      }
    />
  );
}
