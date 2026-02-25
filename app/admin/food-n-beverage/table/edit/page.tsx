'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import BootstrapModal from '../../../../../shared/modal';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { EditTableForm } from '../components/editTableForm';
import { useState } from 'react';

export default function EditTablePage() {
  const searchParams = useSearchParams();
  const tableId = searchParams.get('tableId');
  const [propertyId, setPropertyId] = useState<string>('');

  // Fetch the table details
  const tableResponse = useQuery(api.tables.getTable, {
    tableId: tableId as any,
  });

  const table = tableResponse?.data;
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const properties = propertiesResponse?.data || [];
  const currentPropertyId = propertyId || properties?.[0]?._id || '';

  if (!table) {
    return (
      <div className='w-full p-4 bg-white'>
        <p className='text-gray-500'>Table not found</p>
        <Link href='/admin/food-n-beverage/table' className='text-blue-600'>
          Back to Tables
        </Link>
      </div>
    );
  }

  return (
    <div className='w-full p-4 bg-white'>
      <Link href='/admin/food-n-beverage/table' className='text-blue-600 mb-4 inline-block'>
        ← Back to Tables
      </Link>

      <BootstrapModal
        show={true}
        onHide={() => {}}
        backdrop='static'
        keyboard={false}
        heading={`Edit Table - ${table.tableNumber}`}
        body={
          <EditTableForm
            table={table}
            propertyId={currentPropertyId}
            onSuccess={() => {
              window.location.href = '/admin/food-n-beverage/table';
            }}
          />
        }
      />
    </div>
  );
}
