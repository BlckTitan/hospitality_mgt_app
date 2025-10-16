'use client'

import { useQuery } from 'convex/react'
import React from 'react'
import { api } from '../../../convex/_generated/api'
import { Button, Spinner } from 'react-bootstrap'
import { isAccordionItemSelected } from 'react-bootstrap/esm/AccordionContext'
import TableComponent, { TableColumn } from '../../../shared/table'
 
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

  return (
    <div>
      <Staff/>
    </div>
  )

 }

 const Staff = () =>{
    // fetches all the data from user table to display it in a table

    const handleView = (id: string) =>{
      console.log(id)
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
          <>          
            <Button className='!mr-2' onClick={() => handleView(row._id)}>view</Button>
            <Button variant='secondary' onClick={() => handleView(row._id)}>Edit</Button>
          </>
        ),
      },
    ]

    const staffData = useQuery(api.staff.getAllStaffs)  || []

    if(!staffData){
        return <div className='w-full h-full flex items-center justify-center'>
                <Spinner animation="border" variant="primary" />
               </div>
    }else if(staffData.length === 0){
        return <div className='w-full h-fit flex items-center justify-center'>
                <h3 className='text-xl font-bold'>No data available</h3>
               </div>
    }else{
       
        return(
            <TableComponent data={staffData} columns={tableColumns}/>
        )
    }


 }
 