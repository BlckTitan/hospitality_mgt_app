'use client'

import { useQuery } from 'convex/react'
import React, { Suspense, useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { Button, Spinner } from 'react-bootstrap'
import TableComponent, { TableColumn } from '../../../shared/table'
import { FcEmptyTrash, FcDocument, FcPlus} from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import BootstrapModal from '../../../shared/modal'
interface StaffProps {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  DoB: string;
  state_of_origin: string;
  LGA: string;
  employment_status: string;
  address: string;
  date_recruited: string;
  date_terminated?: string;
  role: string;
}

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

 const Staff = () =>{
    // fetches all the data from user table to display it in a table

    const handleDelete = (id: string, name: string) =>{
      confirm('Are you sure you want to delete records for '+name)
      console.log(id);
    }

    const tableColumns: TableColumn <StaffProps>[] = [
      { label: 'First Name', key: 'firstName' },
      { label: 'Last Name', key: 'lastName' },
      { label: 'Phone', key: 'phone' },
      { label: 'Role', key: 'role' },
      { label: 'Employment Status', key: 'employment_status' },
      { 
        label: 'Action', 
        key: '_id',
        render: (value, row) => (
          <div className='flex justify-evenly lg:justify-start items-center gap-1'>

            <a 
              href={`/admin/staff/view?staff_id=${row._id}`} 
              className='!mr-2 !no-underline' 
            >
              <i className='icon'><FcDocument /></i>
            </a>

            <a 
              href={`/admin/staff/edit?staff_id=${row._id}`} 
              className='!no-underline !text-amber-400'
            >
              <i className='icon'><MdEditDocument /></i>
            </a>

            <Button 
              variant='white'
              onClick={() => handleDelete(row._id, row.firstName)} 
            >
              <i className='icon'><FcEmptyTrash /></i>
            </Button>
          </div>
        ),
      },
    ]

    const staffData = useQuery(api.staff.getAllStaffs)  || []

    if(staffData === undefined){
        return <div className='w-full h-full flex items-center justify-center p-2 bg-white rounded-sm'>
                <Spinner animation="border" variant="primary" />
               </div>
    }else if(staffData.length === 0){
        return <div className='w-full h-fit flex items-center justify-center p-2 bg-white rounded-sm'>
                <h3 className='text-xl font-bold'>No data available</h3>
               </div>
    }else{
       
        return(
          <div className='w-full h-full overflow-x-scroll'>
            <Suspense fallback={<p>Please wait...</p>}>
              <TableComponent data={staffData} columns={tableColumns}/>
            </Suspense>
          </div>
        )
    }


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
