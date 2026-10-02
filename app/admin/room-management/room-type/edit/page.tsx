'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import React, { useState } from 'react';
import { Button } from '../../../../../shared/button';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../../shared/modal';
import { EditFormComponent } from '../components/editRoomTypeForm';

export default function EditRoomTypePage() {
  const searchParams = useSearchParams();
  const roomTypeId = searchParams.get('roomTypeId');
  const [modalShow, setModalShow] = useState(true);

  const roomTypeData = useQuery(
    api.roomTypes.getRoomType, roomTypeId ? { roomTypeId: roomTypeId as Id<'roomTypes'> } : null
  );

  if (!roomTypeId) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">Room Type not found</h3>
          <a href="/admin/room-management/room-type" className="text-blue-600 hover:underline">
            Go back to Room Types
          </a>
        </div>
      </div>
    );
  }

  if (roomTypeData === undefined) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3>Loading...</h3>
        </div>
      </div>
    );
  }

  if (!roomTypeData.success || !roomTypeData.data) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">{roomTypeData.message || 'Room type not found'}</h3>
          <a href="/admin/room-management/room-type" className="text-blue-600 hover:underline">
            Go back to Room Types
          </a>
        </div>
      </div>
    );
  }

  const roomType = roomTypeData.data;

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Edit Room Type</h1>
        <p className="text-gray-600">Update the name, guest limit, base rate, and amenities. Rooms already using this type keep the link.</p>
      </div>
        <BackLink />
      </header>

      <ModalComponent
        roomTypeData={roomType}
        roomTypeId={roomTypeId}
        modalShow={modalShow}
        setModalShow={setModalShow}
        onSuccess={() => {
          setModalShow(false);
        }}
      />
    </div>
  );
}

function ModalComponent(props: {
  roomTypeData: any;
  roomTypeId: string;
  modalShow: boolean;
  setModalShow: (show: boolean) => void;
  onSuccess: () => void;
}) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => props.setModalShow(false)}
      backdrop="static"
      keyboard={false}
      heading="Edit Room Type"
      body={
        <EditFormComponent
          roomTypeData={props.roomTypeData}
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
          roomTypeId={props.roomTypeId}
        />
      }
    />
  );
}
