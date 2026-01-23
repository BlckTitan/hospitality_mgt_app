'use client';

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { EditInventoryItemForm } from '../components/editInventoryItemForm';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../../shared/modal';

export default function EditInventoryItemPage() {
  const searchParams = useSearchParams();
  const inventoryItemId = searchParams.get('inventory_item_id');
  const [modalShow, setModalShow] = useState(true);

  const inventoryItemResponse = useQuery(
    api.inventoryItems.getInventoryItem, 
    inventoryItemId ? { inventoryItemId: inventoryItemId as Id<'inventoryItems'> } : null
  );

  if (!inventoryItemId) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">Inventory item not found</h3>
          <a href="/admin/inventory-management/inventory-item" className="text-blue-600 hover:underline">
            Go back to Inventory Items
          </a>
        </div>
      </div>
    );
  }

  if (!inventoryItemResponse?.success || !inventoryItemResponse.data) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-gray-700">Loading...</h3>
        </div>
      </div>
    );
  }

  const inventoryItem = inventoryItemResponse.data;

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Edit Inventory Item</h3>
        <a href="/admin/inventory-management/inventory-item" className="text-blue-600 hover:underline">
          ← Back
        </a>
      </header>

      <ModalComponent
        inventoryItemData={inventoryItem}
        inventoryItemId={inventoryItemId}
        modalShow={modalShow}
        setModalShow={setModalShow}
        onSuccess={() => {
          setModalShow(false);
        }}
      />
    </div>
  );
}

function ModalComponent(props: {
  inventoryItemData: any;
  inventoryItemId: string;
  modalShow: boolean;
  setModalShow: (show: boolean) => void;
  onSuccess: () => void;
}) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => props.setModalShow(false)}
      backdrop="static"
      keyboard={false}
      heading="Edit Inventory Item"
      body={
        <EditInventoryItemForm
          inventoryItemData={props.inventoryItemData}
          inventoryItemId={props.inventoryItemId}
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
        />
      }
    />
  );
}
