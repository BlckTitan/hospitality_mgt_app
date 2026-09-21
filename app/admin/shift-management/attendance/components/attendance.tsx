'use client'

import { Button } from 'react-bootstrap';
import { useMutation, useQuery, useConvexAuth } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { PunctualityStatusLabel } from '../../punctuality/components/punctualityReport';
import { DEPARTMENT_LABELS, SHIFT_DEPARTMENTS } from '../../shift/components/validation';

const CLOCK_LABELS: Record<string, string> = {
  self: 'Self',
  supervisor: 'Supervisor',
  kiosk: 'Kiosk',
  proxy: 'Supervisor',
};

function departmentLabel(department?: string) {
  if (department && (SHIFT_DEPARTMENTS as readonly string[]).includes(department)) {
    return DEPARTMENT_LABELS[department as (typeof SHIFT_DEPARTMENTS)[number]];
  }
  return department || '—';
}

function clockLabel(method?: string | null) {
  if (!method) return '—';
  return CLOCK_LABELS[method] ?? method;
}

export default function Attendance() {
  const { isAuthenticated } = useConvexAuth();
  const duty = useQuery(api.attendance.getMyDuty, isAuthenticated ? {} : 'skip');
  const floor = useQuery(api.attendance.getFloorDuty, isAuthenticated ? {} : 'skip');
  const startShift = useMutation(api.attendance.startShift);
  const endShift = useMutation(api.attendance.endShift);
  const startShiftFor = useMutation(api.attendance.startShiftFor);
  const endShiftFor = useMutation(api.attendance.endShiftFor);

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

  const handleStartFor = async (staffId: Id<'staffs'>) => {
    const result = await startShiftFor({ staffId });
    if (result.success === false) toast.error(result.message);
    else toast.success(result.message);
  };

  const handleEndFor = async (staffId: Id<'staffs'>) => {
    const result = await endShiftFor({ staffId });
    if (result.success === false) toast.error(result.message);
    else toast.success(result.message);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="max-w-xl">
        <h4 className="mb-2">My duty</h4>
        {duty?.success === false && (
          <p className="text-red-600">{duty.message}</p>
        )}
        {data && (
          <div className="border p-4 flex flex-col gap-2">
            <p><span className="font-semibold">Staff:</span> {data.staffName}</p>
            <p><span className="font-semibold">Date:</span> {data.shiftDate}</p>
            <p><span className="font-semibold">Shift:</span> {data.templateName || 'Not assigned'}</p>
            <p>
              <span className="font-semibold">Expected hours:</span>{' '}
              {data.expectedStart && data.expectedEnd ? `${data.expectedStart}–${data.expectedEnd}` : '—'}
            </p>
            <p>
              <span className="font-semibold">Clock method:</span> {clockLabel(data.clockMethod)}
            </p>
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
                {data.activeShift.clockMethod ? ` · ${clockLabel(data.activeShift.clockMethod)}` : ''}
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
      </section>

      {floor === undefined && (
        <p className="text-sm text-gray-600">Loading today&apos;s floor...</p>
      )}
      {floor?.canView && (
        <section>
          <h4 className="mb-2">Today&apos;s floor</h4>
          <p className="text-sm text-gray-600 mb-3">
            {floor.shiftDate}. Start for / End for records the time the button is pressed. Staff with no phone appear here for a supervisor to clock.
          </p>
          {!floor.data?.length ? (
            <p className="text-sm text-gray-600">
              No staff with an assigned department shift yet. Create a department shift and onboard staff into that department.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-2 text-left">Staff</th>
                    <th className="p-2 text-left">Expected</th>
                    <th className="p-2 text-left">Clock</th>
                    <th className="p-2 text-left">Cover</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {floor.data.map((row) => (
                    <tr key={row.staffId} className="border-t">
                      <td className="p-2">
                        {row.staffName}
                        <div className="text-xs text-slate-600">{departmentLabel(row.department)}</div>
                      </td>
                      <td className="p-2">
                        {row.templateName || 'Not assigned'}
                        {row.expectedStart && row.expectedEnd ? ` · ${row.expectedStart}–${row.expectedEnd}` : ''}
                      </td>
                      <td className="p-2">{clockLabel(row.clockMethod)}</td>
                      <td className="p-2">
                        {row.isCovering
                          ? `Covering ${row.scheduledName}`
                          : row.isCovered
                            ? `Covered by ${row.workingName}`
                            : '—'}
                      </td>
                      <td className="p-2">
                        {row.activeShift ? (
                          <div>
                            {row.activeShift.isFinalized
                              ? `Ended ${row.activeShift.endTime}`
                              : `Started ${row.activeShift.clockStartLocal || row.activeShift.startTime}`}
                            <div>
                              <PunctualityStatusLabel
                                status={row.activeShift.punctualityStatus}
                                minutesLate={row.activeShift.minutesLate}
                              />
                              {row.activeShift.clockMethod ? ` · ${clockLabel(row.activeShift.clockMethod)}` : ''}
                            </div>
                          </div>
                        ) : row.blockedReason ? (
                          <span className="text-slate-600">{row.blockedReason}</span>
                        ) : (
                          'Not started'
                        )}
                      </td>
                      <td className="p-2">
                        {row.isSelf ? (
                          <span className="text-xs text-slate-600">Use My duty</span>
                        ) : floor.canProxy ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="dark"
                              disabled={!row.canStartFor}
                              onClick={() => handleStartFor(row.staffId)}
                            >
                              Start for
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={!row.canEndFor}
                              onClick={() => handleEndFor(row.staffId)}
                            >
                              End for
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">View only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
