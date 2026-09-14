'use client';

import { BackLink } from '../../../../shared/pageHeader';
import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import BootstrapModal from '../../../../shared/modal';
import Cover from './components/cover';
import { FormComponent } from './components/createCoverForm';

export default function CoverPage() {
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [coverFor, setCoverFor] = useState<{ scheduledEmployeeId: string; scheduledName: string } | null>(null);
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const propertyId = propertiesResponse?.data?.[0]?._id;
  const staff = useQuery(
    api.shifts.listStaffForShifts,
    propertyId ? { propertyId } : 'skip',
  );

  if (!propertiesResponse?.data) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        Loading...
      </div>
    );
  }

  if (propertiesResponse.data?.length === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <p className="text-xl">No properties yet!</p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Cover</h3>
        <div className="flex items-center gap-3">
          <BackLink />
          <label className="flex items-center gap-2 text-sm">
            <span>Date</span>
            <input
              type="date"
              className="border rounded p-2"
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
            />
          </label>
        </div>
      </header>
      <p className="mb-4 text-sm text-gray-600">
        Reassign a day when someone cannot report. This changes who should attend, not Hours already recorded.
        Cover is blocked if the scheduled person already started a shift or has Hours for that date.
      </p>
      {propertyId && (
        <Cover
          currentPropertyId={propertyId}
          shiftDate={shiftDate}
          onAssign={setCoverFor}
        />
      )}
      <BootstrapModal
        show={Boolean(coverFor)}
        onHide={() => setCoverFor(null)}
        backdrop="static"
        keyboard={false}
        heading={coverFor ? `Cover for ${coverFor.scheduledName}` : 'Cover'}
        body={
          coverFor && propertyId ? (
            <FormComponent
              propertyId={propertyId}
              shiftDate={shiftDate}
              scheduledEmployeeId={coverFor.scheduledEmployeeId}
              staff={(staff?.data ?? []).filter((row) => row._id !== coverFor.scheduledEmployeeId)}
              onClose={() => setCoverFor(null)}
              onSuccess={() => setCoverFor(null)}
            />
          ) : null
        }
      />
    </div>
  );
}
