'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import Spinner from '../../../../../shared/spinner';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { EditSupplierForm } from '../components/editSupplierForm';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { InventoryPageGuide } from '../../components/inventoryPageGuide';

export default function Page() {
  const searchParams = useSearchParams();
  const supplierId = searchParams.get('supplier_id');
  const supplierResponse = useQuery(
    api.suppliers.getSupplier,
    supplierId ? { supplierId: supplierId as Id<'suppliers'> } : 'skip'
  );

  if (!supplierId) {
    return (
      <div className="w-full p-4 bg-white">
        <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-800">Edit Supplier</h1>
            <InventoryPageGuide page="suppliers-edit" />
          </div>
          <BackLink />
        </header>
        <p>Supplier not found.</p>
      </div>
    );
  }

  if (supplierResponse === undefined) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <Spinner  size="sm"  />
      </div>
    );
  }

  if (!supplierResponse.success || !supplierResponse.data) {
    return <div>No data available!</div>;
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Update {supplierResponse.data.name}</h1>
        <InventoryPageGuide page="suppliers-edit" />
      </div>
        <BackLink />
      </header>
      <EditSupplierForm
        supplierData={supplierResponse.data}
        supplierId={supplierId}
      />
    </div>
  );
}
