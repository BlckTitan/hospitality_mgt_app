'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import Spinner from '../../../../../shared/spinner';
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
        <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-800">Edit Inventory Item</h1>
            <InventoryPageGuide page="items-edit" />
          </div>
          <BackLink />
        </header>
        <p>Inventory item not found.</p>
      </div>
    );
  }

  if (inventoryItemResponse === undefined) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <Spinner  size="sm"  />
      </div>
    );
  }

  if (!inventoryItemResponse.success || !inventoryItemResponse.data) {
    return <div>No data available!</div>;
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Update {inventoryItemResponse.data.name}</h1>
        <InventoryPageGuide page="items-edit" />
      </div>
        <BackLink />
      </header>
      <EditInventoryItemForm
        inventoryItemData={inventoryItemResponse.data}
        inventoryItemId={inventoryItemId}
      />
    </div>
  );
}
