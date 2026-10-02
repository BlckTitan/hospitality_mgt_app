'use client'

import { BackLink } from '../../../../../shared/pageHeader';
import { useQuery } from 'convex/react';
import { useSearchParams } from 'next/navigation';
import React from 'react'
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import Spinner from '../../../../../shared/spinner';
import { FormComponent } from '../components/editRoleForm';

export default function Page() {
  const searchParams = useSearchParams();
  const id = searchParams.get("role_id") ?? null;
  const response = useQuery(api.roles.getRole, { role_id: id as Id<'roles'> });

  // check response for data
  if (response === undefined) return <div className='w-full h-screen flex items-center justify-center'><Spinner  size='sm'  /></div>;
  if (!response || !response.success || !response.data) return <div>No data available!</div>;

  const role = response.data;

  return (
    <div className='w-full p-4 bg-white'>
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Update {role.name}</h1>
        <p className="text-gray-600">Update this role’s name, description, and permissions. People with this role pick up the change on their next request.</p>
      </div>
        <BackLink />
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

