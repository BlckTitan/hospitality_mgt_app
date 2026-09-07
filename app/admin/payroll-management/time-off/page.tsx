'use client'

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { FcPlus } from 'react-icons/fc';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import BootstrapModal from '../../../../shared/modal';
import TimeOff from './components/timeOff';
import { FormComponent } from './components/createTimeOffForm';
import { PayrollPageGuide } from '../components/payrollPageGuide';

export default function TimeOffPage() {
  const [modalShow, setModalShow] = useState(false);
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const properties = propertiesResponse?.data || [];
  const currentPropertyId = properties?.[0]?._id || '';

  if (!propertiesResponse?.data) {
    return <div className="w-full h-full flex justify-center items-center">Loading...</div>;
  }
  if (properties.length === 0) {
    return <div className="w-full p-4">No properties yet.</div>;
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Time off</h3>
        <Button
          variant="light"
          className="cursor-pointer"
          style={{ width: 'fit', height: 'fit', padding: '0', borderRadius: '100%' }}
          onClick={() => setModalShow(true)}
        >
          <FcPlus className="w-8 h-8" />
        </Button>
      </header>
      <PayrollPageGuide page="time-off" />
      <TimeOff propertyId={currentPropertyId} />
      <BootstrapModal
        show={modalShow}
        onHide={() => setModalShow(false)}
        backdrop="static"
        keyboard={false}
        heading="Record Time off"
        body={
          <FormComponent
            propertyId={currentPropertyId}
            onClose={() => setModalShow(false)}
            onSuccess={() => setModalShow(false)}
          />
        }
      />
    </div>
  );
}
