'use client'

import { BackLink } from '../../../../shared/pageHeader';
import React, { useState } from 'react';
import { Button } from '../../../../shared/button';
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
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Time off</h1>
        <PayrollPageGuide page="time-off" />
      </div>
        <div className="flex items-center gap-3">
          <BackLink />
        <Button
          variant="light"
          className="cursor-pointer"
          circle
          onClick={() => setModalShow(true)}
        >
          <FcPlus className="w-8 h-8" />
        </Button>
      
        </div>
      </header>
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
