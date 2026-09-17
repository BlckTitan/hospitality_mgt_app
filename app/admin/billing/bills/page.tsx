'use client';

import { BackLink } from '../../../../shared/pageHeader';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { BillsTable } from '../components/billsTable';
import { BillingPageGuide } from '../components/billingPageGuide';

export default function BillsPage() {
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const currentPropertyId = propertiesResponse?.data?.[0]?._id;

  if (!propertiesResponse?.data) {
    return (
      <div className='w-full h-full flex justify-center items-center'>Loading...</div>
    );
  }

  if (!currentPropertyId) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        <p className='text-xl'>No properties yet!</p>
      </div>
    );
  }

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full border-b flex justify-between items-center mb-4'>
        <h3>Bills</h3>
        <BackLink />
      </header>
      <BillingPageGuide page='bills' />
      <BillsTable currentPropertyId={currentPropertyId} />
    </div>
  );
}
