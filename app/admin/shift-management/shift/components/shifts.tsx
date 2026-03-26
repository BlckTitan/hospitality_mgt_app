'use client'

import { FcDocument, FcEmptyTrash } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import { Suspense } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { TableColumn } from "../../../../../shared/table";
import PaginationComponent from "../../../../../shared/pagination";
import { Id } from "../../../../../convex/_generated/dataModel";

interface ShiftProps {
  _id: string;
  propertyId: string;
  userId: string;
  barId: string;
  shiftDate: string;
  startTime: string;
  endTime?: string;
  isFinalized: boolean;
  createdAt: number;
  user?: {
    _id: string;
    name: string;
    email: string;
  };
  bar?: {
    _id: string;
    name: string;
    location: string;
  };
}

const Shifts = ({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) => {
  const shiftData = useQuery(api.shifts.getAllShifts, { propertyId: currentPropertyId });
  const removeShift = useMutation(api.shifts.deleteShift);

  const handleDelete = async (id: string, shiftDate: string) => {
    if (!confirm('Are you sure you want to delete shift: ' + shiftDate + '?')) return;
    try {
      const response = await removeShift({ shiftId: id as Id<'shifts'> });

      if (response.success === true) {
        toast.success(response.message);
        // Reload page after deletion
        setTimeout(() => {
          window.location.href = "/admin/shift-management/shift";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete shift! ${error}`);
      toast.error("Failed to delete shift. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (isFinalized: boolean) => {
    return (
      <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${isFinalized ? 'bg-green-600' : 'bg-yellow-600'}`}>
        {isFinalized ? 'Finalized' : 'Active'}
      </p>
    );
  };

  const tableColumns: TableColumn<ShiftProps>[] = [
    { label: 'Shift Date', key: 'shiftDate' },
    {
      label: 'User',
      key: 'user',
      render: (value, row) => (
        <span>{row.user?.name || 'N/A'}</span>
      )
    },
    {
      label: 'Bar',
      key: 'bar',
      render: (value, row) => (
        <span>{row.bar?.name || 'N/A'}</span>
      )
    },
    {
      label: 'Start Time',
      key: 'startTime',
      render: (value, row) => (
        <span>{row.startTime}</span>
      )
    },
    {
      label: 'End Time',
      key: 'endTime',
      render: (value, row) => (
        <span>{row.endTime || 'N/A'}</span>
      )
    },
    {
      label: 'Status',
      key: 'isFinalized',
      render: (value, row) => getStatusBadge(row.isFinalized)
    },
    {
      label: 'Created At',
      key: 'createdAt',
      render: (value, row) => (
        <span>{formatDate(row.createdAt)}</span>
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/shift-management/shift/edit?shift_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.shiftDate)}
            title='Delete shift'
          >
            <i className='icon'>
              <FcEmptyTrash />
            </i>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className='w-full h-full overflow-x-scroll lg:!overflow-x-hidden'>
      <Suspense>
        <PaginationComponent 
          collectionName='shifts' 
          columns={tableColumns}
          jointTableData={(shiftData?.success === true) && shiftData?.data}  
        />
      </Suspense>
    </div>
  );
};

export default Shifts;
