'use client';

import React from 'react';
import { Spinner } from 'react-bootstrap';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useSearchParams } from 'next/navigation';
import { FormComponent } from '../components/editUserForm';

export default function Page() {
  const searchParams = useSearchParams();
  const id = searchParams.get("user_id") ?? null;
  const response = useQuery(api.user.getUser, { userId: id as Id<'users'> });

  // Check response for data
  if (response === undefined) return <div className='w-full h-screen flex items-center justify-center'><Spinner animation="border" size='sm' variant="dark" /></div>;
  if (!response.success || !response.data) return <div>No data available!</div>;

  const user = response.data;

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full border-b flex justify-between items-center'>
        <h3>Update {user.name}</h3>
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
    </div>
  );
}

