'use client';

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { FcPlus } from 'react-icons/fc';
import BootstrapModal from '../../../shared/modal';
import UserRoles from './components/userRoles';
import { FormComponent } from './components/createUserRoleForm';

export default function UserRolePage() {
  const [modalShow, setModalShow] = useState(false);

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>User Role Assignments</h3>
        <Button
          variant="light"
          className="cursor-pointer"
          style={{ width: 'fit', height: 'fit', padding: '0', borderRadius: '100%' }}
          onClick={() => setModalShow(true)}
        >
          <FcPlus className="w-8 h-8" />
        </Button>
      </header>

      <UserRoles/>

      <ModalComponent
        modalShow={modalShow}
        setModalShow={setModalShow}
        onSuccess={() => {
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
      heading="Assign Role to User"
      body={<FormComponent onSuccess={props.onSuccess} onClose={() => props.setModalShow(false)} />}
    />
  );
}

