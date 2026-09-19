'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import { Spinner } from 'react-bootstrap';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { EditInventoryItemForm } from '../components/editInventoryItemForm';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { InventoryPageGuide } from '../../components/inventoryPageGuide';

export default function Page() {
  const searchParams = useSearchParams();
  const inventoryItemId = searchParams.get('inventory_item_id');
  const inventoryItemResponse = useQuery(
    api.inventoryItems.getInventoryItem,
    inventoryItemId ? { inventoryItemId: inventoryItemId as Id<'inventoryItems'> } : 'skip'
  );

  if (!inventoryItemId) {
    return (
      <div className="w-full p-4 bg-white">
        <header className="w-full border-b flex justify-between items-center mb-4">
          <h3>Edit Inventory Item</h3>
          <BackLink />
        </header>
        <p>Inventory item not found.</p>
      </div>
    );
  }

  if (inventoryItemResponse === undefined) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <Spinner animation="border" size="sm" variant="dark" />
      </div>
    );
  }

  if (!inventoryItemResponse.success || !inventoryItemResponse.data) {
    return <div>No data available!</div>;
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Update {inventoryItemResponse.data.name}</h3>
        <BackLink />
      </header>
      <InventoryPageGuide page="items-edit" />
      <EditInventoryItemForm
        inventoryItemData={inventoryItemResponse.data}
        inventoryItemId={inventoryItemId}
      />
    </div>
  );
}
