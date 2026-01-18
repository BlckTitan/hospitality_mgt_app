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

interface RoomProps {
  _id: string;
  propertyId: string;
  roomTypeId: string;
  roomNumber: string;
  floor?: number;
  status: string;
  lastCleanedAt?: number;
  notes?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  roomType?: {
    _id: string;
    name: string;
    baseRate: number;
  };
}

const Rooms = ({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) => {
  const roomData = useQuery(api.rooms.getAllRooms, { propertyId: currentPropertyId }); //data from rooms
  const removeRoom = useMutation(api.rooms.deleteRoom);

  const handleDelete = async (id: string, roomNumber: string) => {
    if (!confirm('Are you sure you want to delete room: ' + roomNumber + '?')) return;
    try {
      const response = await removeRoom({ roomId: id as Id<'rooms'> });

      if (response.success === true) {
        toast.success(response.message);
        // Reload page after deletion
        setTimeout(() => {
          window.location.href = "/admin/room-management/room";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete room! ${error}`);
      toast.error("Failed to delete room. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      'available': { bg: 'bg-green-600', text: 'Available' },
      'occupied': { bg: 'bg-blue-600', text: 'Occupied' },
      'out-of-order': { bg: 'bg-red-600', text: 'Out of Order' },
      'maintenance': { bg: 'bg-yellow-600', text: 'Maintenance' },
    };

    const config = statusConfig[status] || { bg: 'bg-gray-400', text: status };
    return (
      <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${config.bg}`}>
        {config.text}
      </p>
    );
  };

  const tableColumns: TableColumn<RoomProps>[] = [
    { label: 'Room Number', key: 'roomNumber' },
    {
      label: 'Room Type',
      key: 'roomType',
      render: (value, row) => (
        <span>{row.roomType?.name || 'N/A'}</span>
      )
    },
    {
      label: 'Floor',
      key: 'floor',
      render: (value, row) => (
        <span>{row.floor !== undefined ? row.floor : 'N/A'}</span>
      )
    },
    {
      label: 'Status',
      key: 'status',
      render: (value, row) => getStatusBadge(row.status)
    },
    {
      label: 'Active',
      key: 'isActive',
      render: (value, row) => (
        <p
          className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${row.isActive ? 'bg-green-600' : 'bg-gray-400'}`}
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </p>
      )
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
            href={`/admin/room-management/room/edit?room_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.roomNumber)}
            title='Delete room'
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
          collectionName='rooms' 
          columns={tableColumns}
          jointTableData={(roomData?.success === true) && roomData?.data}  
        />
      </Suspense>
    </div>
  );
};

export default Rooms;

