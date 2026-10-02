'use client';

import { BackLink } from '../../../shared/pageHeader';
import React, { useState } from 'react';
import { Button } from '../../../shared/button';
import { FcPlus } from 'react-icons/fc';
import BootstrapModal from '../../../shared/modal';
import Properties from './components/properties';
import { FormComponent } from './components/createPropertyComponent';


export default function PropertyPage() {
  const [modalShow, setModalShow] = useState(false);
  // const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Properties</h1>
        <p className="text-gray-600">Add a property with +. Each property keeps its own rooms, staff, stock, and settings.</p>
      </div>
        <div className="flex items-center gap-3">
          <BackLink />
        <Button
          variant="light"
          className="cursor-pointer"
          circle
          onClick={() => setModalShow(true)}
        >
          <FcPlus className="w-8 h-8" />
        </Button>
      
        </div>
      </header>

      <Properties/>

      <ModalComponent
        modalShow={modalShow}
        setModalShow={setModalShow}
        onSuccess={() => {
          // setRefreshTrigger(prev => prev + 1);
          setModalShow(false);
        }}
      />
    </div>
  );
}

function ModalComponent(props: { modalShow: boolean; setModalShow: (show: boolean) => void; onSuccess: () => void }) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => props.setModalShow(false)}
      backdrop="static"
      keyboard={false}
      heading="Add New Property"
      body={<FormComponent onSuccess={props.onSuccess} onClose={() => props.setModalShow(false)} />}
    />
  );
}
