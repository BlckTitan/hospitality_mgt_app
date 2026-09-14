'use client'

import { Suspense } from 'react';
import { Button } from 'react-bootstrap';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { TableColumn } from '../../../../../shared/table';
import PaginationComponent from '../../../../../shared/pagination';
import { DEPARTMENT_LABELS, SHIFT_DEPARTMENTS } from './validation';

type CoverRow = {
  slotId: string | null;
  scheduledEmployeeId: string;
  scheduledName: string;
  workingName: string;
  templateName?: string;
  department?: string;
  startTime?: string;
  endTime?: string;
  isCover: boolean;
  hasAttendance: boolean;
  attendanceFinalized: boolean;
  coverBlocked: boolean;
};

function departmentLabel(department?: string) {
  if (department && (SHIFT_DEPARTMENTS as readonly string[]).includes(department)) {
    return DEPARTMENT_LABELS[department as (typeof SHIFT_DEPARTMENTS)[number]];
  }
  return department || '—';
}

export default function Cover({
  currentPropertyId,
  shiftDate,
  onAssign,
}: {
  currentPropertyId: Id<'properties'>;
  shiftDate: string;
  onAssign: (row: { scheduledEmployeeId: string; scheduledName: string }) => void;
}) {
  const roster = useQuery(
    api.roster.listRosterForDate,
    currentPropertyId && shiftDate ? { propertyId: currentPropertyId, shiftDate } : 'skip',
  );
  const clearCover = useMutation(api.roster.clearRosterCover);

  if (roster === undefined) {
    return <div className="w-full h-full flex justify-center items-center">Loading...</div>;
  }

  if (!roster.data?.length) {
    return (
      <p className="text-sm text-gray-600">
        No staff with an assigned department shift yet. Create a department shift and onboard staff into that department.
      </p>
    );
  }

  const handleClear = async (slotId: string) => {
    const result = await clearCover({ slotId: slotId as Id<'rosterSlots'> });
    if (result.success === false) toast.error(result.message);
    else toast.success(result.message);
  };

  const tableColumns: TableColumn<CoverRow>[] = [
    { label: 'Scheduled', key: 'scheduledName' },
    {
      label: 'Department shift',
      key: 'templateName',
      render: (_value, row) => (
        <span>
          {row.templateName || 'No shift'} · {departmentLabel(row.department)} · {row.startTime}–{row.endTime}
        </span>
      ),
    },
    {
      label: 'Working',
      key: 'workingName',
      render: (_value, row) => (
        <span>{row.isCover ? `Covered by ${row.workingName}` : row.workingName}</span>
      ),
    },
    {
      label: 'Shift status',
      key: 'hasAttendance',
      render: (_value, row) => (
        <span>
          {row.hasAttendance
            ? (row.attendanceFinalized ? 'Ended' : 'Started')
            : row.coverBlocked
              ? 'Blocked'
              : 'Not started'}
        </span>
      ),
    },
    {
      label: 'Action',
      key: 'scheduledEmployeeId',
      render: (_value, row) => (
        <div className="flex gap-2">
          <Button
            variant="dark"
            size="sm"
            disabled={row.coverBlocked}
            onClick={() => onAssign({ scheduledEmployeeId: row.scheduledEmployeeId, scheduledName: row.scheduledName })}
          >
            Assign cover
          </Button>
          {row.isCover && row.slotId && (
            <Button variant="secondary" size="sm" onClick={() => handleClear(row.slotId as string)}>
              Clear cover
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="w-full h-full overflow-x-scroll lg:!overflow-x-hidden">
      <Suspense>
        <PaginationComponent
          collectionName="shifts"
          columns={tableColumns}
          jointTableData={(roster?.success === true) && roster?.data}
        />
      </Suspense>
    </div>
  );
}
