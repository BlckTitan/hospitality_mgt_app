'use client';
import { goToList } from '../../../../../shared/goToList';

import { FcEmptyTrash } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from '../../../../../shared/button';
import { Suspense, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { TableColumn } from "../../../../../shared/table";
import PaginationComponent from "../../../../../shared/pagination";
import { Id } from "../../../../../convex/_generated/dataModel";
import { ReservationLifecycleActions, ReservationStatusBadge } from "./reservationLifecycle";
import { useDeskOperator } from "../../components/deskOperator";
import { formatPropertyMoney, usePropertyCurrency } from "../../../inventory-management/components/money";
import { formatPropertyWhen } from "../../stayDates";

const RESERVATION_STATUSES = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked-in', label: 'Checked in' },
  { value: 'checked-out', label: 'Checked out' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

type ReservationStatusFilter = (typeof RESERVATION_STATUSES)[number]['value'];

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
  stayKind?: 'overnight' | 'short';
  durationHours?: number;
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
  bookedBy?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  room?: {
    _id: string;
    roomNumber: string;
    roomType?: {
      name: string;
    };
  };
}

const Reservations = ({ propertyId, timeZone }: { propertyId: string; timeZone?: string }) => {
  const [status, setStatus] = useState<ReservationStatusFilter>('all');
  const currency = usePropertyCurrency(propertyId);
  const desk = useDeskOperator();
  const removeReservation = useMutation(api.reservations.deleteReservation);

  const handleDelete = async (id: string, confirmationNumber: string) => {
    if (!confirm('Are you sure you want to delete reservation: ' + confirmationNumber + '?')) return;
    try {
      const response = await removeReservation({ reservationId: id as Id<'reservations'>, ...desk.userArgs });

      if (response.success === true) {
        toast.success(response.message);
        goToList("/admin/room-management/reservation");
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

  const tableColumns: TableColumn<ReservationProps>[] = [
    {
      label: 'Action',
      key: '_id',
      pin: 'left',
      render: (value, row) => (
        <ReservationLifecycleActions
          reservationId={row._id as Id<'reservations'>}
          status={row.status}
          totalAmount={row.totalAmount}
          depositAmount={row.depositAmount ?? 0}
          currency={currency}
          layout="compact"
          rowActions={
            <>
              <a
                href={`/admin/room-management/reservation/edit?reservation_id=${row._id}`}
                className="!no-underline !text-amber-400"
                title="Edit booking details"
                aria-label="Edit booking details"
              >
                <i className="icon"><MdEditDocument /></i>
              </a>
              <Button
                variant="white"
                onClick={() => handleDelete(row._id, row.confirmationNumber)}
                title="Delete reservation"
                aria-label="Delete reservation"
                disabled={desk.blocked || row.status === 'checked-in' || row.status === 'checked-out'}
              >
                <i className="icon">
                  <FcEmptyTrash />
                </i>
              </Button>
            </>
          }
        />
      ),
    },
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
    { label: 'Confirmation #', key: 'confirmationNumber' },
    {
      label: 'Stay',
      key: 'stayKind',
      render: (_value, row) => (
        <span>{row.stayKind === 'short' ? `Short${row.durationHours ? ` · ${row.durationHours}h` : ''}` : 'Overnight'}</span>
      ),
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
      render: (_value, row) => (
        <span>
          {formatPropertyWhen(row.checkOutDate, timeZone, row.stayKind !== "short")}
        </span>
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
        <span>{formatPropertyMoney(row.totalAmount, currency)}</span>
      )
    },
    {
      label: 'Status',
      key: 'status',
      render: (value, row) => <ReservationStatusBadge status={row.status} />
    },
    {
      label: 'Booked by',
      key: 'bookedBy',
      render: (_value, row) => (
        <span>{row.bookedBy?.name || '—'}</span>
      )
    },
    {
      label: 'Created At',
      key: 'createdAt',
      render: (value, row) => (
        <span>{formatDateTime(row.createdAt)}</span>
      )
    },
  ];

  return (
    <div className='w-full h-full overflow-x-scroll lg:!overflow-x-hidden'>
      <Suspense>
        <PaginationComponent
          collectionName='reservations'
          columns={tableColumns}
          showIndex={false}
          propertyId={propertyId}
          filterKey={status}
          reservationStatus={status === 'all' ? undefined : status}
          emptyLabel={status === 'all' ? undefined : 'No reservations with this status.'}
          searchLeading={
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <span>Status</span>
              <select
                aria-label="Reservation status"
                className="rounded border border-neutral-300 bg-white px-2 py-1"
                value={status}
                onChange={(event) => setStatus(event.target.value as ReservationStatusFilter)}
              >
                {RESERVATION_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          }
        />
      </Suspense>
    </div>
  );
};

export default Reservations;
