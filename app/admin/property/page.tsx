'use client';

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { FcPlus } from 'react-icons/fc';
import BootstrapModal from '../../../shared/modal';
import Properties from './components/properties';
import { FormComponent } from './components/createPropertyComponent';


export default function PropertyPage() {
  const [modalShow, setModalShow] = useState(false);
  // const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Properties</h3>
        <Button
          variant="light"
          className="cursor-pointer"
          style={{ width: 'fit', height: 'fit', padding: '0', borderRadius: '100%' }}
          onClick={() => setModalShow(true)}
        >
          <FcPlus className="w-8 h-8" />
        </Button>
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
