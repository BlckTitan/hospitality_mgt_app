'use client'

import { useQuery } from 'convex/react'
import { useSearchParams } from 'next/navigation'
import React from 'react'
import { api } from '../../../../../convex/_generated/api'
import { Spinner } from 'react-bootstrap'
import Image from 'next/image'
import { Id } from '../../../../../convex/_generated/dataModel';
import Avatar from '../../../../../public/profileAvatar.webp'

// interface StaffProps {
//     id: string;
//     firstName: string;
//     lastName: string;
//     phone: string;
//     DoB: string;
//     stateOfOrigin: string;
//     LGA: string;
//     employmentStatus: string;
//     address: string;
//     dateRecruited: string;
//     dateTerminated?: string;
//     role: string;
// }

export default function StaffViewComponent(){

  const query = useSearchParams()
  const id = query.get('staff_id')

    const staffData = useQuery(
      api.staff.getStaff, 
      id ? { staff_id: id as Id<"staffs"> } : "skip" 
    );
    
    if (staffData === undefined) {
      return (
        <div className='w-full h-full flex items-center justify-center'>
          <Spinner animation="border" variant="primary" />
        </div>
      );
    }else if(!staffData){
      return(
        <div className='w-full h-fit flex items-center justify-center'>
          <h3 className='text-xl font-bold'>No data available</h3>
        </div>
      )
    }else{
       
      return(
        <div className='w-full h-full'>
          <div className='w-full h-full flex flex-col justify-start items-start'>

            <div className='w-full h-40 flex justify-center lg:justify-start items-center'>
              <Image
                src={Avatar}
                alt='profile avatar format: webp'
                width={100}
                height={100}
                className='w-24 h-24 rounded-full object-cover object-center'
              />
            </div>

            <div className='w-full h-full px-2 [&_div]:w-full [&_div]:h-fit [&_div]:flex lg:[&_div]:justify-start [&_div]:items-center [&_div]:gap-2'>
              
              <div>
                <p className='!font-semibold'>Name:</p>
                <p>{`${staffData?.lastName} ${staffData?.firstName}`}</p>
              </div> 

              <div>
                <p className='!font-semibold'>Date of Birth:</p>
                <p>{staffData?.DoB.substring(0, 10)}</p>
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
                <p>{staffData?.stateOfOrigin}</p>
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
                <p>{staffData?.employmentStatus}</p>
              </div>

              <div>
                <p className='!font-semibold'>Date Recruited:</p>
                <p>
                  {staffData?.dateRecruited.substring(0, 10)}
                </p>
              </div>

              <div>
                <p className='!font-semibold'>Date Terminated:</p>
                <p>
                  {(staffData.employmentStatus === 'employed') ? 'Actively employed' : staffData?.dateTerminated}
                </p>
              </div>

            </div>
          </div>
      </div>
    )
  }

}
