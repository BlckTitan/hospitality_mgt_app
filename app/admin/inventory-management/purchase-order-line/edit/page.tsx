'use client';

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { EditFormComponent } from '../components/editPurchaseOrderLineForm';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../../shared/modal';

export default function EditPurchaseOrderLinePage() {
  const searchParams = useSearchParams();
  const purchaseOrderLineId = searchParams.get('purchase_order_line_id');
  const [modalShow, setModalShow] = useState(true);

  const purchaseOrderLineResponse = useQuery(
    api.purchaseOrderLines.getPurchaseOrderLine, 
    purchaseOrderLineId ? { purchaseOrderLineId: purchaseOrderLineId as Id<'purchaseOrderLines'> } : null
  );

  if (!purchaseOrderLineId) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">Purchase Order Line not found</h3>
          <a href="/admin/inventory-management/purchase-order-line" className="text-blue-600 hover:underline">
            Go back to Purchase Order Lines
          </a>
        </div>
      </div>
    );
  }

  if (!purchaseOrderLineResponse?.success || !purchaseOrderLineResponse.data) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-gray-700">Loading...</h3>
        </div>
      </div>
    );
  }

  const purchaseOrderLineData = purchaseOrderLineResponse.data;

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Edit Purchase Order Line</h3>
        <a href="/admin/inventory-management/purchase-order-line" className="text-blue-600 hover:underline">
          ← Back
        </a>
      </header>

      <ModalComponent
        purchaseOrderLineData={purchaseOrderLineData}
        purchaseOrderLineId={purchaseOrderLineId}
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
  purchaseOrderLineData: any;
  purchaseOrderLineId: string;
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
      heading="Edit Purchase Order Line"
      body={
        <EditFormComponent
          purchaseOrderLineData={props.purchaseOrderLineData}
          purchaseOrderLineId={props.purchaseOrderLineId}
        />
      }
    />
  );
}
