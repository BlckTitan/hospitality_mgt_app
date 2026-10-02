'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import React from 'react';
import Spinner from '../../../../../shared/spinner';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { useSearchParams } from 'next/navigation';
import { FormComponent } from '../components/editReservationForm';

export default function Page() {
  const searchParams = useSearchParams();
  const id = searchParams.get("reservation_id") ?? null;
  const response = useQuery(api.reservations.getReservation, { reservationId: id as Id<'reservations'> });

  // Check response for data
  if (response === undefined) return <div className='w-full h-screen flex items-center justify-center'><Spinner  size='sm'  /></div>;
  if (!response.success || !response.data) return <div>No data available!</div>;

  const reservation = response.data;

  return (
    <div className='w-full p-4 bg-white'>
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Update Reservation - {reservation.confirmationNumber}</h1>
        <p className="text-gray-600">Update dates, room, or guest count. Confirm, check in, check out, or cancel from the reservation actions.</p>
      </div>
        <BackLink />
      </header>

      <FormComponent
        id={id as Id<'reservations'>}
        roomId={reservation.roomId}
        checkInDate={reservation.checkInDate}
        checkOutDate={reservation.checkOutDate}
        numberOfGuests={reservation.numberOfGuests}
        rate={reservation.rate}
        totalAmount={reservation.totalAmount}
        depositAmount={reservation.depositAmount}
        status={reservation.status}
        source={reservation.source}
        specialRequests={reservation.specialRequests}
        propertyId={reservation.propertyId}
        paidTotal={reservation.paidTotal ?? 0}
        payments={reservation.payments ?? []}
        bookedBy={reservation.bookedBy ?? null}
      />
    </div>
  );
}
