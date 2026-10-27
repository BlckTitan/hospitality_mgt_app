'use client';

import { BackLink } from '../../../../shared/pageHeader';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { InventoryPageGuide } from '../components/inventoryPageGuide';
import { InventoryCount } from './components/inventoryCount';

export default function Page() {
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const currentPropertyId = propertiesResponse?.data?.[0]?._id;

  if (!propertiesResponse?.data) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        Loading...
      </div>
    );
  }

  if (propertiesResponse.data.length === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <p className="text-xl">No properties yet!</p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Stock count</h1>
          <InventoryPageGuide page="count" />
        </div>
        <BackLink />
      </header>
      {currentPropertyId && <InventoryCount propertyId={currentPropertyId} />}
    </div>
  );
}
