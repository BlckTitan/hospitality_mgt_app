'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import React, { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import EditShiftForm from '../components/editShiftForm';
import { ShiftPageGuide } from '../../components/shiftPageGuide';

export default function EditShiftPage() {
  const [shiftId, setShiftId] = useState<string>('');

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('shift_id');
    if (id) setShiftId(id);
  }, []);

  const shiftResponse = useQuery(
    api.shifts.getShift,
    shiftId ? { shiftId: shiftId as Id<'shifts'> } : 'skip',
  );

  if (!shiftId || shiftResponse === undefined) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        Loading...
      </div>
    );
  }

  if (!shiftResponse.success || !shiftResponse.data) {
    return (
      <div className="w-full p-4 bg-white">
        <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Edit Shift</h1>
          <BackLink />
        </header>
        <p className="text-xl">Shift not found.</p>
      </div>
    );
  }

  const shift = shiftResponse.data;

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Edit Shift</h1>
          <ShiftPageGuide page="shift-edit" />
        </div>
        <BackLink />
      </header>
      <div className="max-w-xl">
        <EditShiftForm
          onSuccess={() => undefined}
          onClose={() => { window.location.href = '/admin/shift-management/shift'; }}
          propertyId={shift.propertyId}
          shiftData={shift}
          shiftId={shiftId}
        />
      </div>
    </div>
  );
}
