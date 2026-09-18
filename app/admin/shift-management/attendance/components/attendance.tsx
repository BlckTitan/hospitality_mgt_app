'use client'

import { Button } from 'react-bootstrap';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../../../convex/_generated/api';
import { PunctualityStatusLabel } from '../../punctuality/components/punctualityReport';

export default function Attendance() {
  const duty = useQuery(api.attendance.getMyDuty);
  const startShift = useMutation(api.attendance.startShift);
  const endShift = useMutation(api.attendance.endShift);

  if (duty === undefined) {
    return <div className="w-full h-full flex justify-center items-center">Loading...</div>;
  }

  const data = duty?.data;

  const handleStart = async () => {
    const result = await startShift({});
    if (result.success === false) toast.error(result.message);
    else toast.success(result.message);
  };

  const handleEnd = async () => {
    const result = await endShift({});
    if (result.success === false) toast.error(result.message);
    else toast.success(result.message);
  };

  return (
    <div className="max-w-xl">
      {duty?.success === false && (
        <p className="text-red-600">{duty.message}</p>
      )}
      {data && (
        <div className="border p-4 flex flex-col gap-2">
          <p><span className="font-semibold">Staff:</span> {data.staffName}</p>
          <p><span className="font-semibold">Date:</span> {data.shiftDate}</p>
          <p><span className="font-semibold">Shift:</span> {data.templateName || 'Not assigned'}</p>
          <p><span className="font-semibold">Expected hours:</span> {data.expectedStart && data.expectedEnd ? `${data.expectedStart}–${data.expectedEnd}` : '—'}</p>
          {data.isCovering && (
            <p className="text-amber-700">You are covering for {data.scheduledName} today.</p>
          )}
          {data.isCovered && (
            <p className="text-amber-700">You are covered by {data.workingName} today.</p>
          )}
          {data.activeShift && (
            <p>
              <span className="font-semibold">Status:</span>{' '}
              {data.activeShift.isFinalized
                ? `Ended at ${data.activeShift.endTime}`
                : `Started at ${data.activeShift.clockStartLocal || data.activeShift.startTime}`}
            </p>
          )}
          {data.activeShift && (
            <p>
              <span className="font-semibold">Punctuality:</span>{' '}
              <PunctualityStatusLabel
                status={data.activeShift.punctualityStatus}
                minutesLate={data.activeShift.minutesLate}
              />
            </p>
          )}
          {data.blockedReason && <p className="text-sm text-gray-700">{data.blockedReason}</p>}
          <div className="flex gap-2 mt-2">
            <Button variant="dark" disabled={!data.canStartShift} onClick={handleStart}>Start shift</Button>
            <Button variant="secondary" disabled={!data.canEndShift} onClick={handleEnd}>End shift</Button>
          </div>
        </div>
      )}
    </div>
  );
}
