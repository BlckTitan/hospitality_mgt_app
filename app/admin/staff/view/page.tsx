'use client'

import { useQuery } from 'convex/react';
import React from 'react'
import { Button, Spinner } from 'react-bootstrap';
import { api } from '../../../../convex/_generated/api';
import { useSearchParams } from 'next/navigation';
import { Id } from '../../../../convex/_generated/dataModel';

interface StaffProps {
    id: string;
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

    const query = useSearchParams()
    const id = query.get('staff_id')

  return (
    <div>
        <header className='w-full  h-16 lg:h-24 bg-white p-2 rounded-md mb-4 flex justify-between items-center'>
        <h3>View staffs</h3>
        <a 
            href='/admin/staff'
            className='cursor-pointer' 
        >
            <i></i>
            <span>Back</span>
        </a>
        </header>
        <Staff id={id}/> 
    </div>
  )
}

const Staff = ({ id }: { id: string | null }) => {
    // fetches all the data from user table to display it in a table
    const staffData = useQuery(api.staff.getStaff, id ? { staff_id: id as Id<"staffs"> } : "skip" );
    
    if (staffData === undefined) {
        return (
            <div className='w-full h-full flex items-center justify-center p-2 bg-white rounded-md'>
                <Spinner animation="border" variant="primary" />
            </div>
        );
      }else if(!staffData){
        return <div className='w-full h-fit flex items-center justify-center p-2 bg-white rounded-md'>
                <h3 className='text-xl font-bold'>No data available</h3>
               </div>
    }else{
       
      return(
        <div className='w-full h-full p-2 bg-white rounded-md'>
          {staffData?.employment_status}
        </div>
      )
    }


 }
