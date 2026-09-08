'use client'

import { Suspense } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Button } from 'react-bootstrap';
import { toast } from 'sonner';
import PaginationComponent from '../../../../../shared/pagination';
import { TableColumn } from '../../../../../shared/table';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';

type TimeOffRow = {
  _id: string;
  staffName: string;
  timeOffTypeName: string;
  startDate: number;
  endDate: number;
  days: number;
  status: string;
  paid: boolean;
};

export default function TimeOff({ propertyId }: { propertyId: string }) {
  const response = useQuery(api.timeOff.listTimeOff, {
    propertyId: propertyId as Id<'properties'>,
  });
  const approveTimeOff = useMutation(api.timeOff.approveTimeOff);
  const rejectTimeOff = useMutation(api.timeOff.rejectTimeOff);

  const tableColumns: TableColumn<TimeOffRow>[] = [
    { label: 'Staff', key: 'staffName' },
    { label: 'Type', key: 'timeOffTypeName' },
    {
      label: 'Dates',
      key: 'startDate',
      render: (_value, row) =>
        `${new Date(row.startDate).toISOString().slice(0, 10)} – ${new Date(row.endDate).toISOString().slice(0, 10)}`,
    },
    { label: 'Days', key: 'days' },
    {
      label: 'Paid',
      key: 'paid',
      render: (value) => (value ? 'Paid' : 'Unpaid'),
    },
    { label: 'Status', key: 'status' },
    {
      label: 'Action',
      key: '_id',
      render: (_value, row) => (
        <div className="flex gap-1">
          {row.status === 'pending' && (
            <>
              <Button
                variant="dark"
                size="sm"
                onClick={async () => {
                  const result = await approveTimeOff({ timeOffId: row._id as Id<'timeOff'> });
                  if (result.success === false) toast.error(result.message);
                  else toast.success(result.message);
                }}
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const result = await rejectTimeOff({ timeOffId: row._id as Id<'timeOff'> });
                  if (result.success === false) toast.error(result.message);
                  else toast.success(result.message);
                }}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="w-full h-full overflow-x-scroll lg:!overflow-x-hidden">
      <Suspense>
        <PaginationComponent
          collectionName="timeOff"
          columns={tableColumns}
          jointTableData={response?.success === true ? response.data : []}
        />
      </Suspense>
    </div>
  );
}
