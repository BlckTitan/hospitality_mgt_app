'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import React, { useState } from 'react';
import { Button } from '../../../../../shared/button';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { EditRoomForm } from '../components/editRoomForm';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../../shared/modal';

export default function EditRoomPage() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room_id');
  const [modalShow, setModalShow] = useState(true);

  const roomResponse = useQuery(
    api.rooms.getRoom, roomId ? { roomId: roomId as Id<'rooms'> } : null
  );

  if (!roomId) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">Room not found</h3>
          <a href="/admin/room-management/room" className="text-blue-600 hover:underline">
            Go back to Rooms
          </a>
        </div>
      </div>
    );
  }

  if (!roomResponse?.success || !roomResponse.data) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-gray-700">Loading...</h3>
        </div>
      </div>
    );
  }

  const room = roomResponse.data;

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Edit Room</h1>
        <p className="text-gray-600">Update room number, floor, type, and status. Occupied is set by check-in, not by this form.</p>
      </div>
        <BackLink />
      </header>

      <ModalComponent
        roomData={room}
        roomId={roomId}
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
  roomData: any;
  roomId: string;
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
      heading="Edit Room"
      body={
        <EditRoomForm
          roomData={props.roomData}
          roomId={props.roomId}
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
        />
      }
    />
  );
}

