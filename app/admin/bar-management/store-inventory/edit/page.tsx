'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { EditFormComponent } from '../components/editStoreInventoryForm';
import BootstrapModal from '../../../../../shared/modal';

export default function EditStoreInventoryPage() {
  const [modalShow, setModalShow] = useState(true);
  const [inventoryId, setInventoryId] = useState<string>('');
  const searchParams = useSearchParams();

  useEffect(() => {
    const inventory_id = searchParams.get('inventory_id');
    if (inventory_id) {
      setInventoryId(inventory_id);
    } else {
      // Redirect back if no inventory_id is provided
      window.location.href = '/admin/bar-management/store-inventory';
    }
  }, [searchParams]);

  const handleSuccess = () => {
    setModalShow(false);
    // Redirect back to store inventory list
    window.location.href = '/admin/bar-management/store-inventory';
  };

  const handleClose = () => {
    setModalShow(false);
    // Redirect back to store inventory list
    window.location.href = '/admin/bar-management/store-inventory';
  };

  if (!inventoryId) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        Loading...
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-white">
      <BootstrapModal
        show={modalShow}
        onHide={handleClose}
        backdrop="static"
        keyboard={false}
        heading="Edit Store Inventory"
        body={
          <EditFormComponent
            onSuccess={handleSuccess}
            onClose={handleClose}
            inventoryId={inventoryId}
          />
        }
      />
    </div>
  );
}
