'use client'

import { useQuery } from 'convex/react';
import { useSearchParams } from 'next/navigation';
import React from 'react'
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Spinner } from 'react-bootstrap';
import { FormComponent } from '../components/editRoleForm';

export default function Page() {
  const searchParams = useSearchParams();
  const id = searchParams.get("role_id") ?? null;
  const response = useQuery(api.roles.getRole, { role_id: id as Id<'roles'> });

  // check response for data
  if (response === undefined) return <div className='w-full h-screen flex items-center justify-center'><Spinner animation="border" size='sm' variant="dark" /></div>;
  if (!response || !response.success || !response.data) return <div>No data available!</div>;

  const role = response.data;

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full border-b flex justify-between items-center mb-4'>
        <h3>Update {role.name}</h3>
      </header>

      <FormComponent
        id={role._id}
        name={role.name}
        description={role.description}
        permissions={role.permissions}
        isSystemRole={role.isSystemRole}
      />
    </div>
  );
}

