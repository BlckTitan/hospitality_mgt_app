'use client'

import { useQuery } from 'convex/react';
import React, { Suspense } from 'react'
import { Spinner } from 'react-bootstrap';
import { api } from '../../../../convex/_generated/api';
import { useSearchParams } from 'next/navigation';
import { Id } from '../../../../convex/_generated/dataModel';
import Avatar from '../../../../public/profileAvatar.webp'
import Image from 'next/image';
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
    <div className='w-full p-4 bg-white'>
      <header className='w-full mb-4 border-b flex justify-between items-center'>
        <h4 className=''>Profile</h4>
        <a 
          href='/admin/staff'
          className='flex items-center gap-1 !no-underline cursor-pointer' 
        >
          Back
        </a>
      </header>
      
      <Suspense fallback={<Spinner/>}>
        <Staff id={id}/> 
      </Suspense>

    </div>
  )
}

const Staff = ({ id }: { id: string | null }) => {
    // fetches all the data from user table to display it in a table
    const staffData = useQuery(api.staff.getStaff, id ? { staff_id: id as Id<"staffs"> } : "skip" );
    
    if (staffData === undefined) {
        return (
            <div className='w-full h-full flex items-center justify-center'>
                <Spinner animation="border" variant="primary" />
            </div>
        );
      }else if(!staffData){
        return <div className='w-full h-fit flex items-center justify-center'>
                <h3 className='text-xl font-bold'>No data available</h3>
               </div>
    }else{
       
    return(
      <div className='w-full h-full'>
        <div className='w-full h-full flex flex-col lg:flex-row lg:justify-between lg:items-start'>

          <div className='w-4/12 h-fit flex justify-end border-r px-2'>
            <Image
              src={Avatar}
              alt='profile avatar format: webp'
              width={100}
              height={100}
              className='w-24 h-24 rounded-full object-cover object-center'
            />
          </div>

          <div className='w-8/12 h-full px-2 [&_div]:w-full [&_div]:h-fit [&_div]:flex [&_div]:justify-start [&_div]:items-center [&_div]:gap-1'>
            
            <div>
              <p className='!font-semibold'>Name:</p>
              <p>{`${staffData?.lastName} ${staffData?.firstName}`}</p>
            </div> 

            <div>
              <p className='!font-semibold'>Date of Birth:</p>
              <p>{staffData?.DoB}</p>
            </div>

            <div>
              <p className='!font-semibold'>Phone:</p>
              <p>{staffData?.phone}</p>
            </div>

            <div>
              <p className='!font-semibold'>Address:</p>
              <p>Address: {staffData?.address}</p>
            </div>

            <div>
              <p className='!font-semibold'>State of Origin:</p>
              <p>{staffData?.state_of_origin}</p>
            </div>

            <div>
              <p className='!font-semibold'>LGA:</p>
              <p>{staffData?.LGA}</p>
            </div>

            <div>
              <p className='!font-semibold'>Role:</p>
              <p>{staffData?.role}</p>
            </div>

            <div>
              <p className='!font-semibold'>Salary:</p>
              <p>{`#${staffData?.salary} (Naira)`}</p>
            </div>

            <div>
              <p className='!font-semibold'>Employment Status:</p>
              <p>{staffData?.employment_status}</p>
            </div>

            <div>
              <p className='!font-semibold'>Date Recruited:</p>
              <p>
                {staffData?.date_recruited}
              </p>
            </div>

            <div>
              <p className='!font-semibold'>Date Terminated:</p>
              <p>
                {(staffData.employment_status === 'employed') ? 'Actively employed' : staffData?.date_terminated}
              </p>
            </div>

          </div>
        </div>
      </div>
    )
  }
 }
