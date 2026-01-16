'use client';

import React from 'react';
import { Spinner } from 'react-bootstrap';
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
  if (response === undefined) return <div className='w-full h-screen flex items-center justify-center'><Spinner animation="border" size='sm' variant="dark" /></div>;
  if (!response.success || !response.data) return <div>No data available!</div>;

  const reservation = response.data;

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full border-b flex justify-between items-center'>
        <h3>Update Reservation - {reservation.confirmationNumber}</h3>
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
      />
    </div>
  );
}
