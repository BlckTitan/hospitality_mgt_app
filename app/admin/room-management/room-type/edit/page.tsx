'use client';

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
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
          <a href="/admin/roomType" className="text-blue-600 hover:underline">
            Go back to Room Types
          </a>
        </div>
      </div>
    );
  }

  if (!roomTypeData?.success) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">Loading...</h3>
        </div>
      </div>
    );
  }

  const roomType = roomTypeData.data;

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Edit Room Type</h3>
        <a href="/admin/roomType" className="text-blue-600 hover:underline">
          ← Back
        </a>
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
