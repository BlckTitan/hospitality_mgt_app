'use client';

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { EditPurchaseOrderForm } from '../components/editPurchaseOrderForm';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../../shared/modal';

export default function EditPurchaseOrderPage() {
  const searchParams = useSearchParams();
  const purchaseOrderId = searchParams.get('purchase_order_id');
  const [modalShow, setModalShow] = useState(true);

  const purchaseOrderResponse = useQuery(
    api.purchaseOrders.getPurchaseOrder, 
    purchaseOrderId ? { purchaseOrderId: purchaseOrderId as Id<'purchaseOrders'> } : null
  );

  const suppliersResponse = useQuery(api.suppliers.getAllSuppliers, { 
    propertyId: purchaseOrderResponse?.data?.propertyId,
    activeOnly: true 
  });
  const suppliers = suppliersResponse?.data || [];

  if (!purchaseOrderId) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">Purchase order not found</h3>
          <a href="/admin/inventory-management/purchase-order" className="text-blue-600 hover:underline">
            Go back to Purchase Orders
          </a>
        </div>
      </div>
    );
  }

  if (!purchaseOrderResponse?.success || !purchaseOrderResponse.data) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-gray-700">Loading...</h3>
        </div>
      </div>
    );
  }

  const purchaseOrder = purchaseOrderResponse.data;

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Edit Purchase Order</h3>
        <a href="/admin/inventory-management/purchase-order" className="text-blue-600 hover:underline">
          ← Back
        </a>
      </header>

      <ModalComponent
        purchaseOrderData={purchaseOrder}
        purchaseOrderId={purchaseOrderId}
        suppliers={suppliers}
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
  purchaseOrderData: any;
  purchaseOrderId: string;
  suppliers: any[];
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
      heading="Edit Purchase Order"
      body={
        <EditPurchaseOrderForm
          purchaseOrderData={props.purchaseOrderData}
          purchaseOrderId={props.purchaseOrderId}
          suppliers={props.suppliers}
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
        />
      }
    />
  );
}
