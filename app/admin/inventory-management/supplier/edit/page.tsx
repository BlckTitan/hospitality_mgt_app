'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import { Spinner } from 'react-bootstrap';
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
        <header className="w-full border-b flex justify-between items-center mb-4">
          <h3>Edit Supplier</h3>
          <BackLink />
        </header>
        <p>Supplier not found.</p>
      </div>
    );
  }

  if (supplierResponse === undefined) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <Spinner animation="border" size="sm" variant="dark" />
      </div>
    );
  }

  if (!supplierResponse.success || !supplierResponse.data) {
    return <div>No data available!</div>;
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Update {supplierResponse.data.name}</h3>
        <BackLink />
      </header>
      <InventoryPageGuide page="suppliers-edit" />
      <EditSupplierForm
        supplierData={supplierResponse.data}
        supplierId={supplierId}
      />
    </div>
  );
}
