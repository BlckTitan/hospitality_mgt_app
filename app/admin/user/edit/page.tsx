'use client';

import { BackLink } from '../../../../shared/pageHeader';
import React from 'react';
import Spinner from '../../../../shared/spinner';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useSearchParams } from 'next/navigation';
import { FormComponent } from '../components/editUserForm';
import { UserAccessAssignments } from '../components/userAccessAssignments';

export default function Page() {
  const searchParams = useSearchParams();
  const id = searchParams.get("user_id") ?? null;
  const response = useQuery(
    api.users.getUser,
    id ? { userId: id as Id<'users'> } : 'skip',
  );

  if (!id) return <div>No data available!</div>;
  if (response === undefined) return <div className='w-full h-screen flex items-center justify-center'><Spinner  size='sm'  /></div>;
  if (!response.success || !response.data) return <div>No data available!</div>;

  const user = response.data;

  return (
    <div className='w-full p-4 bg-white'>
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Update {user.name}</h1>
        <p className="text-gray-600">Change this person’s name, role, and which properties they can access.</p>
      </div>
        <BackLink />
      </header>

      <FormComponent
        id={id as Id<'users'>}
        externalId={user.externalId}
        email={user.email}
        name={user.name}
        phone={user.phone}
        isActive={user.isActive}
        lastLoginAt={user.lastLoginAt}
      />

      <UserAccessAssignments userId={id as Id<'users'>} />
    </div>
  );
}

