'use client';

import { BackLink } from '../../../../shared/pageHeader';
import React, { useState } from 'react';
import { Button } from '../../../../shared/button';
import { FcPlus } from 'react-icons/fc';
import BootstrapModal from '../../../../shared/modal';
import Roles from './components/roles';
import { FormComponent } from './components/createRoleForm';

export default function RolePage() {
  const [modalShow, setModalShow] = useState(false);

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Roles</h1>
        <p className="text-gray-600">Create a role with + and choose what that role is allowed to do. Invite users with a role from User Management.</p>
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

      <Roles/>

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
      heading="Add New Role"
      body={<FormComponent onSuccess={props.onSuccess} onClose={() => props.setModalShow(false)} />}
    />
  );
}

