'use client';

import React from 'react';
import { Spinner } from 'react-bootstrap';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { useSearchParams } from 'next/navigation';
import { FormComponent } from '../components/editGuestForm';

export default function Page() {
  const searchParams = useSearchParams();
  const id = searchParams.get("guest_id") ?? null;
  const response = useQuery(api.guests.getGuest, { guestId: id as Id<'guests'> });

  // Check response for data
  if (response === undefined) return <div className='w-full h-screen flex items-center justify-center'><Spinner animation="border" size='sm' variant="dark" /></div>;
  if (!response.success || !response.data) return <div>No data available!</div>;

  const guest = response.data;

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full border-b flex justify-between items-center'>
        <h3>Update {guest.firstName} {guest.lastName}</h3>
      </header>

      <FormComponent
        id={id as Id<'guests'>}
        firstName={guest.firstName}
        lastName={guest.lastName}
        email={guest.email}
        phone={guest.phone}
        address={guest.address}
        dateOfBirth={guest.dateOfBirth}
        loyaltyNumber={guest.loyaltyNumber}
      />
    </div>
  );
}
