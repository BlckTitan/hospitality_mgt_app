'use client'

import { useQuery } from 'convex/react';
import { useSearchParams } from 'next/navigation';
import React from 'react'
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Spinner } from 'react-bootstrap';
import { FormComponent } from '../components/editUserRoleForm';

export default function Page() {
  const searchParams = useSearchParams();
  const id = searchParams.get("userRole_id") ?? null;
  const response = useQuery(api.userRoles.getUserRole, { userRole_id: id as Id<'userRoles'> });

  // check response for data
  if (response === undefined) return <div className='w-full h-screen flex items-center justify-center'><Spinner animation="border" size='sm' variant="dark" /></div>;
  if (!response || !response.success || !response.data) return <div>No data available!</div>;

  const userRole = response.data;

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full border-b flex justify-between items-center mb-4'>
        <h3>Update Role Assignment: {userRole.userName} - {userRole.roleName}</h3>
      </header>

      <FormComponent
        id={userRole._id}
        userId={userRole.userId}
        roleId={userRole.roleId}
        propertyId={userRole.propertyId}
        assignedBy={userRole.assignedBy}
      />
    </div>
  );
}

