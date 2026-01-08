'use client';

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../shared/modal';
import { EditRoomForm } from '../components/editRoomForm';

export default function EditRoomPage() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room_id');
  const [modalShow, setModalShow] = useState(true);

  const roomResponse = useQuery(
    roomId ? api.rooms.getRoom({ roomId: roomId as Id<'rooms'> }) : null
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
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Edit Room</h3>
        <a href="/admin/room-management/room" className="text-blue-600 hover:underline">
          ← Back
        </a>
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

