'use client'

import { FcEmptyTrash } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import { Suspense } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { TableColumn } from "../../../../../shared/table";
import PaginationComponent from "../../../../../shared/pagination";
import { Id } from "../../../../../convex/_generated/dataModel";
import { DEPARTMENT_LABELS, SHIFT_DEPARTMENTS } from "./validation";

interface ShiftProps {
  _id: string;
  propertyId: string;
  employeeId?: string;
  userId?: string;
  barId?: string;
  department?: string;
  shiftDate: string;
  startTime: string;
  endTime?: string;
  isFinalized: boolean;
  staffName?: string;
  hoursStatus?: string;
  hoursId?: string;
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

function departmentLabel(value?: string) {
  if (value && SHIFT_DEPARTMENTS.includes(value as (typeof SHIFT_DEPARTMENTS)[number])) {
    return DEPARTMENT_LABELS[value as (typeof SHIFT_DEPARTMENTS)[number]];
  }
  return value || "—";
}

const Shifts = ({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) => {
  const shiftData = useQuery(
    api.shifts.getAllShifts,
    currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  );
  const canManage = shiftData?.canManage === true;
  const removeShift = useMutation(api.shifts.deleteShift);
  const finalizeShift = useMutation(api.shifts.finalizeShift);

  const handleDelete = async (id: string, shiftDate: string) => {
    if (!confirm('Are you sure you want to delete shift: ' + shiftDate + '?')) return;
    try {
      const response = await removeShift({ shiftId: id as Id<'shifts'> });
      if (response.success === true) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete shift! ${error}`);
      toast.error("Failed to delete shift. Please try again.");
    }
  };

  const handleFinalize = async (id: string) => {
    if (!confirm('Finalize this shift? This creates draft Hours for payroll approval and cannot be undone.')) return;
    try {
      const response = await finalizeShift({ shiftId: id as Id<'shifts'> });
      if (response.success === true) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to finalize shift! ${error}`);
      toast.error("Failed to finalize shift. Please try again.");
    }
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
      label: 'Staff',
      key: 'staffName',
      render: (_value, row) => (
        <span>{row.staffName || row.user?.name || 'N/A'}</span>
      )
    },
    {
      label: 'Department',
      key: 'department',
      render: (_value, row) => <span>{departmentLabel(row.department)}</span>
    },
    {
      label: 'Bar',
      key: 'bar',
      render: (_value, row) => (
        <span>{row.bar?.name || '—'}</span>
      )
    },
    {
      label: 'Start Time',
      key: 'startTime',
      render: (_value, row) => (
        <span>{row.startTime}</span>
      )
    },
    {
      label: 'End Time',
      key: 'endTime',
      render: (_value, row) => (
        <span>{row.endTime || 'N/A'}</span>
      )
    },
    {
      label: 'Status',
      key: 'isFinalized',
      render: (_value, row) => getStatusBadge(row.isFinalized)
    },
    {
      label: 'Hours',
      key: 'hoursStatus',
      render: (_value, row) => (
        row.hoursId ? (
          <a href="/admin/shift-management/hours" className="!text-blue-700">
            {row.hoursStatus}
          </a>
        ) : (
          <span>{row.isFinalized ? 'Not created' : '—'}</span>
        )
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (_value, row) => (
        canManage ? (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          {!row.isFinalized && (
            <Button
              variant="dark"
              size="sm"
              onClick={() => handleFinalize(row._id)}
              title="Finalize shift"
            >
              Finalize
            </Button>
          )}
          {!row.isFinalized && (
            <a
              href={`/admin/shift-management/shift/edit?shift_id=${row._id}`}
              className='!mr-2 !no-underline !text-amber-400'
            >
              <i className='icon'><MdEditDocument /></i>
            </a>
          )}
          {!row.isFinalized && (
            <Button
              variant='white'
              onClick={() => handleDelete(row._id, row.shiftDate)}
              title='Delete shift'
            >
              <i className='icon'>
                <FcEmptyTrash />
              </i>
            </Button>
          )}
        </div>
        ) : (
          <span>—</span>
        )
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
