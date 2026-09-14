'use client'

import { BackLink } from '../../../../shared/pageHeader';
import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { FcPlus } from 'react-icons/fc';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import BootstrapModal from '../../../../shared/modal';
import Hours from './components/hours';
import { FormComponent } from './components/createHoursForm';

export default function HoursPage() {
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
        <h3>Hours</h3>
        <div className="flex items-center gap-3">
          <BackLink />
        <Button
          variant="light"
          className="cursor-pointer"
          style={{ width: 'fit', height: 'fit', padding: '0', borderRadius: '100%' }}
          onClick={() => setModalShow(true)}
        >
          <FcPlus className="w-8 h-8" />
        </Button>
      
        </div>
      </header>
      <p className="mb-4 text-sm text-gray-600">
        Record a day’s Hours with +, end a shift on Attendance Tracker, or finalize an ad-hoc Shift to create a draft.
        Approve Hours before they can be paid. After Prepare pay, included Hours are locked until Recalculate
        (while the Payroll is still Draft or Ready to review).
      </p>
      <Hours propertyId={currentPropertyId} />
      <BootstrapModal
        show={modalShow}
        onHide={() => setModalShow(false)}
        backdrop="static"
        keyboard={false}
        heading="Record Hours"
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
