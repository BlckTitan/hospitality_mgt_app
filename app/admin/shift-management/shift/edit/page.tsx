'use client';

import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import BootstrapModal from '../../../../../shared/modal';
import EditShiftForm from '../components/editShiftForm';

export default function EditShiftPage() {
  const [modalShow, setModalShow] = useState(true);
  const [shiftId, setShiftId] = useState<string>('');
  const [shiftData, setShiftData] = useState<any>(null);
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
  const shiftResponse = useQuery(api.shifts.getShift, { shiftId: shiftId as any });

  useEffect(() => {
    if (shiftResponse?.success && shiftResponse?.data) {
      setShiftData(shiftResponse.data);
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
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Edit Shift</h3>
        <Button
          variant="light"
          className="cursor-pointer"
          style={{ width: 'fit', height: 'fit', padding: '0', borderRadius: '100%' }}
          onClick={() => window.location.href = '/admin/shift-management/shift'}
        >
          ×
        </Button>
      </header>

      <ModalComponent
        modalShow={modalShow}
        setModalShow={setModalShow}
        onSuccess={() => {
          setModalShow(false);
        }}
        propertyId={currentPropertyId}
        shiftData={shiftData}
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
