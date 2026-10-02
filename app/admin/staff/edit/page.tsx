'use client'

import { BackLink } from '../../../../shared/pageHeader';
import React from 'react'
import Spinner from '../../../../shared/spinner';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useSearchParams } from 'next/navigation';
import { FormComponent } from '../components/editEmployeeForm';

export default function Page() {
  const { isAuthenticated } = useConvexAuth()
  const searchParams = useSearchParams();
  const id = searchParams.get("staff_id") ?? null
  const response = useQuery(
    api.staff.getStaff,
    isAuthenticated && id ? {staff_id: id as Id<'staffs'>} : 'skip'
  )

  if(response === undefined) return <div className='w-full h-screen flex justify-center items-center'><Spinner  size='sm'  /></div>
  if(!response) return <div>No data available!</div>

  return (
    <div className='w-full p-4 bg-white'>
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Update {`${response.lastName}`}</h1>
        <p className="text-gray-600">Update this employee’s name, job, department, and contact details.</p>
      </div>
        <BackLink />
      </header>

      <FormComponent
        id={response._id}
        firstName={response.firstName}
        lastName={response.lastName}
        phone={response.phone}
        DoB={response.DoB}
        stateOfOrigin={response.stateOfOrigin}
        LGA={response.LGA}
        address={response.address}
        salary={response.salary}
        email={response.email}
        employmentStatus={response.employmentStatus}
        role={response.role}
        dateRecruited={response.dateRecruited}
        dateTerminated={response.dateTerminated}
        department={response.department}
        userId={response.userId}
        clockMethod={response.clockMethod}
        employmentType={response.employmentType}
        managerId={response.managerId}
        position={response.position}
        employeeNumber={response.employeeNumber}
        nationalId={response.nationalId}
        idType={response.idType}
        emergencyName={response.emergencyName}
        emergencyPhone={response.emergencyPhone}
        emergencyRelationship={response.emergencyRelationship}
        contractStartDate={response.contractStartDate}
        contractEndDate={response.contractEndDate}
        probationEndDate={response.probationEndDate}
        payType={response.payType}
        paymentMethod={response.paymentMethod}
        hourlyRate={response.hourlyRate}
        taxId={response.taxId}
        bankName={response.bankName}
        accountName={response.accountName}
        accountNumber={response.accountNumber}
        routingCode={response.routingCode}
        imageUrl={response.imageUrl}
      />
    </div>
  )
}
