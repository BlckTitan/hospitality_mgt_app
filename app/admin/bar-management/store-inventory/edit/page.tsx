'use client';

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { FcPlus } from 'react-icons/fc';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import BootstrapModal from '../../../../../shared/modal';
import { useSearchParams } from 'next/navigation';
import StoreInventory from '../components/storeInventory';

export default function EditStoreInventoryPage() {
  const [modalShow, setModalShow] = useState(false);
  const [propertyId, setPropertyId] = useState<string>('');
  const searchParams = useSearchParams();
  const inventoryId = searchParams.get('inventory_id');

  // Fetch properties to get the current property
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const properties = propertiesResponse?.data || [];
  const currentPropertyId = propertyId || properties?.[0]?._id || '';

  // Get the inventory data to pre-fill the form
  const inventoryResponse = useQuery(api.storeInventories.getStoreInventory, {
    inventoryId: inventoryId as any
  });

  const finalPropertyId = inventoryResponse?.data?.propertyId || currentPropertyId;

  const handleSuccess = () => {
    setModalShow(false);
    window.location.href = '/admin/bar-management/store-inventories';
  };

  const handleClose = () => {
    setModalShow(false);
    window.location.href = '/admin/bar-management/store-inventories';
  };

  // check if property is loading
  if (!propertiesResponse?.data) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        Loading...
      </div>
    );
  }

  if (propertiesResponse.data?.length === 0) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        <p className='text-xl'>No properties yet!</p>
      </div>
    );
  }

  if (!inventoryId) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        <p className='text-xl text-red-600'>Invalid inventory ID</p>
      </div>
    );
  }

  if (inventoryResponse?.success === false) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        <p className='text-xl text-red-600'>{inventoryResponse.message}</p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Store Inventory</h3>
        <Button
          variant="light"
          className="cursor-pointer"
          style={{ width: 'fit', height: 'fit', padding: '0', borderRadius: '100%' }}
          onClick={() => setModalShow(true)}
        >
          <FcPlus className="w-8 h-8" />
        </Button>
      </header>

      <StoreInventory currentPropertyId={finalPropertyId} />

      <BootstrapModal
        show={modalShow}
        onHide={() => setModalShow(false)}
        onSuccess={() => {
          setModalShow(false);
        }}
        propertyId={finalPropertyId}
      />
    </div>
  );
}
