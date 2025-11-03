'use client'

import { useQuery } from 'convex/react'
import React, { Suspense, useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { Button, Spinner } from 'react-bootstrap'
import TableComponent, { TableColumn } from '../../../shared/table'
import { FcEmptyTrash, FcDocument, FcPlus} from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import BootstrapModal from '../../../shared/modal'
import Staff from './components/staffs'

 export default function Page() {
  
  const [modalShow, setModalShow] = useState(false);

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full border-b mb-4 flex justify-between items-center'>
        <h3>Staffs</h3>
        <Button 
          variant='light' 
          className='cursor-pointer' 
          style={{width: 'fit', height: 'fit', padding: '0', borderRadius: '100%'}}
          onClick={() => setModalShow(true)}
        >
          <FcPlus className='w-8 h-8'/>
        </Button>
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
      />
    </>
  );
}
