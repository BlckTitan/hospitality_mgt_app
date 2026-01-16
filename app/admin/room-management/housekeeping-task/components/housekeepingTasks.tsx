'use client';

import { FcEmptyTrash } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import { Suspense } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { TableColumn } from "../../../../../shared/table";
import PaginationComponent from "../../../../../shared/pagination";
import { Id } from "../../../../../convex/_generated/dataModel";

interface HousekeepingTaskProps {
  _id: string;
  propertyId: string;
  roomId: string;
  assignedTo?: string;
  taskType: string;
  status: string;
  priority: string;
  scheduledAt?: number;
  startedAt?: number;
  completedAt?: number;
  estimatedDuration?: number;
  actualDuration?: number;
  notes?: string;
  checklist?: any;
  createdAt: number;
  updatedAt: number;
  room?: {
    _id: string;
    roomNumber: string;
    roomType?: {
      name: string;
    };
  };
  assignedToStaff?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

const HousekeepingTasks = () => {
  const removeTask = useMutation(api.housekeepingTasks.deleteHousekeepingTask);

  const handleDelete = async (id: string, roomNumber: string) => {
    if (!confirm('Are you sure you want to delete housekeeping task for room: ' + roomNumber + '?')) return;
    try {
      const response = await removeTask({ taskId: id as Id<'housekeepingTasks'> });

      if (response.success === true) {
        toast.success(response.message);
        setTimeout(() => {
          window.location.href = "/admin/room-management/housekeeping-task";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete housekeeping task! ${error}`);
      toast.error("Failed to delete housekeeping task. Please try again.");
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString();
  };

  const formatDateTime = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      'pending': { bg: 'bg-yellow-600', text: 'Pending' },
      'in-progress': { bg: 'bg-blue-600', text: 'In Progress' },
      'completed': { bg: 'bg-green-600', text: 'Completed' },
      'skipped': { bg: 'bg-gray-600', text: 'Skipped' },
    };

    const config = statusConfig[status] || { bg: 'bg-gray-400', text: status };
    return (
      <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${config.bg}`}>
        {config.text}
      </p>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { bg: string; text: string }> = {
      'low': { bg: 'bg-gray-500', text: 'Low' },
      'medium': { bg: 'bg-yellow-500', text: 'Medium' },
      'high': { bg: 'bg-orange-500', text: 'High' },
      'urgent': { bg: 'bg-red-600', text: 'Urgent' },
    };

    const config = priorityConfig[priority] || { bg: 'bg-gray-400', text: priority };
    return (
      <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${config.bg}`}>
        {config.text}
      </p>
    );
  };

  const getTaskTypeLabel = (taskType: string) => {
    const typeLabels: Record<string, string> = {
      'checkout': 'Checkout',
      'stayover': 'Stayover',
      'deep-clean': 'Deep Clean',
      'inspection': 'Inspection',
    };
    return typeLabels[taskType] || taskType;
  };

  const tableColumns: TableColumn<HousekeepingTaskProps>[] = [
    {
      label: 'Room',
      key: 'room',
      render: (value, row) => (
        <span>{row.room ? `${row.room.roomNumber}${row.room.roomType ? ` (${row.room.roomType.name})` : ''}` : 'N/A'}</span>
      )
    },
    {
      label: 'Task Type',
      key: 'taskType',
      render: (value, row) => (
        <span>{getTaskTypeLabel(row.taskType)}</span>
      )
    },
    {
      label: 'Assigned To',
      key: 'assignedToStaff',
      render: (value, row) => (
        <span>{row.assignedToStaff ? `${row.assignedToStaff.firstName} ${row.assignedToStaff.lastName}` : 'Unassigned'}</span>
      )
    },
    {
      label: 'Status',
      key: 'status',
      render: (value, row) => getStatusBadge(row.status)
    },
    {
      label: 'Priority',
      key: 'priority',
      render: (value, row) => getPriorityBadge(row.priority)
    },
    {
      label: 'Scheduled At',
      key: 'scheduledAt',
      render: (value, row) => (
        <span>{formatDateTime(row.scheduledAt)}</span>
      )
    },
    {
      label: 'Duration',
      key: 'estimatedDuration',
      render: (value, row) => (
        <span>
          {row.actualDuration !== undefined 
            ? `${row.actualDuration} min` 
            : row.estimatedDuration 
              ? `Est: ${row.estimatedDuration} min` 
              : '-'}
        </span>
      )
    },
    {
      label: 'Created At',
      key: 'createdAt',
      render: (value, row) => (
        <span>{formatDateTime(row.createdAt)}</span>
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/room-management/housekeeping-task/edit?task_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.room?.roomNumber || 'N/A')}
            disabled={row.status === 'in-progress' || row.status === 'completed'}
            title={row.status === 'in-progress' || row.status === 'completed' ? 'Cannot delete in-progress or completed tasks' : 'Delete task'}
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
        <PaginationComponent collectionName='housekeepingTasks' columns={tableColumns} />
      </Suspense>
    </div>
  );
};

export default HousekeepingTasks;
