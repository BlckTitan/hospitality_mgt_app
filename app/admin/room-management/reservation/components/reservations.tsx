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

interface ReservationProps {
  _id: string;
  propertyId: string;
  roomId: string;
  guestId: string;
  confirmationNumber: string;
  checkInDate: number;
  checkOutDate: number;
  numberOfGuests: number;
  rate: number;
  totalAmount: number;
  depositAmount?: number;
  status: string;
  source?: string;
  specialRequests?: string;
  checkedInAt?: number;
  checkedOutAt?: number;
  createdAt: number;
  updatedAt: number;
  guest?: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  room?: {
    _id: string;
    roomNumber: string;
    roomType?: {
      name: string;
    };
  };
}

const Reservations = () => {
  const removeReservation = useMutation(api.reservations.deleteReservation);

  const handleDelete = async (id: string, confirmationNumber: string) => {
    if (!confirm('Are you sure you want to delete reservation: ' + confirmationNumber + '?')) return;
    try {
      const response = await removeReservation({ reservationId: id as Id<'reservations'> });

      if (response.success === true) {
        toast.success(response.message);
        setTimeout(() => {
          window.location.href = "/admin/room-management/reservation";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete reservation! ${error}`);
      toast.error("Failed to delete reservation. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      'pending': { bg: 'bg-yellow-600', text: 'Pending' },
      'confirmed': { bg: 'bg-blue-600', text: 'Confirmed' },
      'checked-in': { bg: 'bg-green-600', text: 'Checked In' },
      'checked-out': { bg: 'bg-gray-600', text: 'Checked Out' },
      'cancelled': { bg: 'bg-red-600', text: 'Cancelled' },
    };

    const config = statusConfig[status] || { bg: 'bg-gray-400', text: status };
    return (
      <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${config.bg}`}>
        {config.text}
      </p>
    );
  };

  const tableColumns: TableColumn<ReservationProps>[] = [
    { label: 'Confirmation #', key: 'confirmationNumber' },
    {
      label: 'Guest',
      key: 'guest',
      render: (value, row) => (
        <span>{row.guest ? `${row.guest.firstName} ${row.guest.lastName}` : 'N/A'}</span>
      )
    },
    {
      label: 'Room',
      key: 'room',
      render: (value, row) => (
        <span>{row.room ? `${row.room.roomNumber}${row.room.roomType ? ` (${row.room.roomType.name})` : ''}` : 'N/A'}</span>
      )
    },
    {
      label: 'Check-in',
      key: 'checkInDate',
      render: (value, row) => (
        <span>{formatDate(row.checkInDate)}</span>
      )
    },
    {
      label: 'Check-out',
      key: 'checkOutDate',
      render: (value, row) => (
        <span>{formatDate(row.checkOutDate)}</span>
      )
    },
    {
      label: 'Guests',
      key: 'numberOfGuests',
    },
    {
      label: 'Total Amount',
      key: 'totalAmount',
      render: (value, row) => (
        <span>${row.totalAmount.toFixed(2)}</span>
      )
    },
    {
      label: 'Status',
      key: 'status',
      render: (value, row) => getStatusBadge(row.status)
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
            href={`/admin/room-management/reservation/edit?reservation_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.confirmationNumber)}
            title='Delete reservation'
            disabled={row.status === 'checked-in' || row.status === 'checked-out'}
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
        <PaginationComponent collectionName='reservations' columns={tableColumns} />
      </Suspense>
    </div>
  );
};

export default Reservations;
