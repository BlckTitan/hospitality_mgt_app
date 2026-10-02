'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import React, { useState, useEffect } from 'react';
import { Button } from '../../../../../shared/button';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import BootstrapModal from '../../../../../shared/modal';
import EditShiftForm from '../components/editShiftForm';
import { ShiftPageGuide } from '../../components/shiftPageGuide';

export default function EditShiftPage() {
  const [modalShow, setModalShow] = useState(true);
  const [shiftId, setShiftId] = useState<string>('');
  const [propertyId, setPropertyId] = useState<string>('');

  // Get shift ID from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('shift_id');
    if (id) {
      setShiftId(id);
    }
  }, []);

  // Fetch properties to get current property
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const properties = propertiesResponse?.data || [];
  const currentPropertyId = propertyId || properties?.[0]?._id || '';

  // Fetch shift data
  const shiftResponse = useQuery(api.shifts.getShift, shiftId ? { shiftId: shiftId as any } : "skip");

  useEffect(() => {
    if (shiftResponse?.success && shiftResponse?.data) {
      setPropertyId(shiftResponse.data.propertyId);
    }
  }, [shiftResponse]);

  // check if property is loading
  if (!propertiesResponse?.data || !shiftResponse?.data) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        Loading...
      </div>
    );
  }

  if (propertiesResponse.data?.length === 0) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        <p className='text-xl'>No properties yet!</p>
      </div>
    );
  }

  if (!shiftResponse?.success) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        <p className='text-xl'>Shift not found!</p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Edit Shift</h1>
        <ShiftPageGuide page="shift-edit" />
      </div>
        <div className="flex items-center gap-3 shrink-0">
          <BackLink />
          <Button
            variant="light"
            className="cursor-pointer"
            circle
            onClick={() => window.location.href = '/admin/shift-management/shift'}
          >
            ×
          </Button>
        </div>
      </header>
      <ModalComponent
        modalShow={modalShow}
        setModalShow={setModalShow}
        onSuccess={() => {
          setModalShow(false);
        }}
        propertyId={currentPropertyId}
        shiftData={shiftResponse?.data}
        shiftId={shiftId}
      />
    </div>
  );
}

function ModalComponent(props: {
  modalShow: boolean;
  setModalShow: (show: boolean) => void;
  onSuccess: () => void;
  propertyId: string;
  shiftData: any;
  shiftId: string;
}) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => window.location.href = '/admin/shift-management/shift'}
      backdrop="static"
      keyboard={false}
      heading="Edit Shift"
      body={
        <EditShiftForm
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
          propertyId={props.propertyId}
          shiftData={props.shiftData}
          shiftId={props.shiftId}
        />
      }
    />
  );
}
