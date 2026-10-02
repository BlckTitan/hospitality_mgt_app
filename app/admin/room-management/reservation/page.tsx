'use client';

import { BackLink } from '../../../../shared/pageHeader';
import React, { Suspense, useEffect, useState } from 'react';
import { Button } from '../../../../shared/button';
import { FcPlus } from 'react-icons/fc';
import Reservations from './components/reservations';
import { FormComponent } from './components/createReservationForm';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import BootstrapModal from '../../../../shared/modal';
import { RoomPageGuide } from '../components/roomPageGuide';
import { useSearchParams } from 'next/navigation';

export default function ReservationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center">Loading...</div>
      }
    >
      <ReservationPageInner />
    </Suspense>
  );
}

function ReservationPageInner() {
  const searchParams = useSearchParams();
  const guestIdFromUrl = searchParams.get('guest_id');
  const [modalShow, setModalShow] = useState(false);
  const [initialGuestId, setInitialGuestId] = useState<string | null>(null);

  const propertiesResponse = useQuery(api.property.getAllProperties);
  const properties = propertiesResponse?.data || [];
  const currentPropertyId = properties?.[0]?._id || '';

  useEffect(() => {
    if (!guestIdFromUrl) return;
    setInitialGuestId(guestIdFromUrl);
    setModalShow(true);
  }, [guestIdFromUrl]);

  if (!propertiesResponse?.data) {
    return (
      <div className="flex h-full w-full items-center justify-center">Loading...</div>
    );
  }

  if (propertiesResponse.data?.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-xl">No properties yet!</p>
      </div>
    );
  }

  const closeModal = () => {
    setModalShow(false);
    setInitialGuestId(null);
    if (guestIdFromUrl && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('guest_id');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  };

  return (
    <div className="w-full bg-white p-4">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Reservations</h1>
        <RoomPageGuide page="reservations" />
      </div>
        <div className="flex items-center gap-3">
          <BackLink />
          <Button
            variant="light"
            className="cursor-pointer"
            circle
            onClick={() => {
              setInitialGuestId(null);
              setModalShow(true);
            }}
          >
            <FcPlus className="h-8 w-8" />
          </Button>
        </div>
      </header>
      <Reservations propertyId={currentPropertyId} />

      <BootstrapModal
        show={modalShow}
        onHide={closeModal}
        backdrop="static"
        keyboard={false}
        heading="Add New Reservation"
        body={
          <FormComponent
            key={initialGuestId ?? 'new-reservation'}
            onSuccess={closeModal}
            onClose={closeModal}
            propertyId={currentPropertyId}
            initialGuestId={initialGuestId}
          />
        }
      />
    </div>
  );
}
