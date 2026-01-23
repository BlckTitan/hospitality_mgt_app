'use client';

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { EditSupplierForm } from '../components/editSupplierForm';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../../shared/modal';

export default function EditSupplierPage() {
  const searchParams = useSearchParams();
  const supplierId = searchParams.get('supplier_id');
  const [modalShow, setModalShow] = useState(true);

  const supplierResponse = useQuery(
    api.suppliers.getSupplier, 
    supplierId ? { supplierId: supplierId as Id<'suppliers'> } : null
  );

  if (!supplierId) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">Supplier not found</h3>
          <a href="/admin/inventory-management/supplier" className="text-blue-600 hover:underline">
            Go back to Suppliers
          </a>
        </div>
      </div>
    );
  }

  if (!supplierResponse?.success || !supplierResponse.data) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-gray-700">Loading...</h3>
        </div>
      </div>
    );
  }

  const supplier = supplierResponse.data;

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Edit Supplier</h3>
        <a href="/admin/inventory-management/supplier" className="text-blue-600 hover:underline">
          ← Back
        </a>
      </header>

      <ModalComponent
        supplierData={supplier}
        supplierId={supplierId}
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
  supplierData: any;
  supplierId: string;
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
      heading="Edit Supplier"
      body={
        <EditSupplierForm
          supplierData={props.supplierData}
          supplierId={props.supplierId}
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
        />
      }
    />
  );
}
