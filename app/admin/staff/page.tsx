'use client'

import { BackLink } from '../../../shared/pageHeader';
import React, { useState } from 'react'
import { Button } from '../../../shared/button'
import { FcPlus} from "react-icons/fc";
import BootstrapModal from '../../../shared/modal'
import Staff from './components/staffs'
import 'react-datepicker/dist/react-datepicker.css';
import { FormComponent } from './components/createEmployeeForm';
import { usePermissions } from '../../../hooks/usePermissions';

 export default function Page() {
  
  const [modalShow, setModalShow] = useState(false);
  const { hasGranularPermission } = usePermissions();
  const canCreate = hasGranularPermission('staff.create');

  return (
    <div className='w-full p-4 bg-white'>
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Staffs</h1>
        <p className="text-gray-600">Add employees with +. Open a profile to link a login, assign a department, and keep job details current.</p>
      </div>
        <div className="flex items-center gap-3">
          <BackLink />
        {canCreate && (
        <Button 
          variant='light' 
          className='cursor-pointer' 
          circle
          onClick={() => setModalShow(true)}
        >
          <FcPlus className='w-8 h-8'/>
        </Button>
        )}
      
        </div>
      </header>
      
      <Staff/> 
      
      <ModalComponent modalShow={modalShow} setModalShow={setModalShow}/>

    </div>
  )

}
 
function ModalComponent(props: any) {

  return (
    <>
      <BootstrapModal
        show={props.modalShow}
        onHide={() => props.setModalShow(false)}
        backdrop="static"
        keyboard={false}
        heading="Add New Staff"
        body={
          FormComponent()
        }
      />
    </>
  );
}

