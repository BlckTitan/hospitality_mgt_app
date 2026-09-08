'use client'

import { Suspense } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Button } from 'react-bootstrap';
import { toast } from 'sonner';
import PaginationComponent from '../../../../../shared/pagination';
import { TableColumn } from '../../../../../shared/table';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';

type HoursRow = {
  _id: string;
  staffName: string;
  workDate: number;
  regularHours: number;
  overtimeHours: number;
  status: string;
  source: string;
  lockedAt?: number;
};

export default function Hours({ propertyId }: { propertyId: string }) {
  const response = useQuery(api.hours.listHours, {
    propertyId: propertyId as Id<'properties'>,
  });
  const approveHours = useMutation(api.hours.approveHours);
  const rejectHours = useMutation(api.hours.rejectHours);

  const handleApprove = async (id: string) => {
    const result = await approveHours({ hoursId: id as Id<'hours'> });
    if (result.success === false) toast.error(result.message);
    else toast.success(result.message);
  };

  const handleReject = async (id: string) => {
    const result = await rejectHours({ hoursId: id as Id<'hours'> });
    if (result.success === false) toast.error(result.message);
    else toast.success(result.message);
  };

  const tableColumns: TableColumn<HoursRow>[] = [
    { label: 'Staff', key: 'staffName' },
    {
      label: 'Work date',
      key: 'workDate',
      render: (value) => new Date(value as number).toISOString().slice(0, 10),
    },
    { label: 'Regular', key: 'regularHours' },
    { label: 'Overtime', key: 'overtimeHours' },
    { label: 'Source', key: 'source' },
    {
      label: 'Status',
      key: 'status',
      render: (value, row) => (
        <span>{row.lockedAt ? `${value} · Locked for payroll` : value}</span>
      ),
    },
    {
      label: 'Action',
      key: '_id',
      render: (_value, row) => (
        <div className="flex gap-1">
          {row.status !== 'approved' && !row.lockedAt && (
            <Button variant="dark" size="sm" onClick={() => handleApprove(row._id)}>Approve</Button>
          )}
          {row.status !== 'rejected' && !row.lockedAt && (
            <Button variant="secondary" size="sm" onClick={() => handleReject(row._id)}>Reject</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="w-full h-full overflow-x-scroll lg:!overflow-x-hidden">
      <Suspense>
        <PaginationComponent
          collectionName="hours"
          columns={tableColumns}
          jointTableData={response?.success === true ? response.data : []}
        />
      </Suspense>
    </div>
  );
}
