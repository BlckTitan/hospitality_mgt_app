'use client';

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { FcPlus } from 'react-icons/fc';
import PurchaseOrders from './components/purchaseOrders';
import { FormComponent } from './components/createPurchaseOrderForm';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import BootstrapModal from '../../../../shared/modal';

export default function PurchaseOrderPage() {
  const [modalShow, setModalShow] = useState(false);
  const [propertyId, setPropertyId] = useState<string>('');

  // Fetch properties to get the current property
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const properties = propertiesResponse?.data || [];
  const currentPropertyId = propertyId || properties?.[0]?._id || '';

  // Fetch suppliers for the dropdown
  const suppliersResponse = useQuery(api.suppliers.getAllSuppliers, { 
    propertyId: currentPropertyId, 
    activeOnly: true 
  });
  const suppliers = suppliersResponse?.data || [];

  // Get current user (staff) for createdBy
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Purchase Orders</h3>
        <Button
          variant="light"
          className="cursor-pointer"
          style={{ width: 'fit', height: 'fit', padding: '0', borderRadius: '100%' }}
          onClick={() => setModalShow(true)}
        >
          <FcPlus className="w-8 h-8" />
        </Button>
      </header>

      <PurchaseOrders currentPropertyId={currentPropertyId}/>

      <ModalComponent
        modalShow={modalShow}
        setModalShow={setModalShow}
        onSuccess={() => {
          setModalShow(false);
        }}
        propertyId={currentPropertyId}
        suppliers={suppliers}
        createdBy={currentUserId}
      />
    </div>
  );
}

function ModalComponent(props: {
  modalShow: boolean;
  setModalShow: (show: boolean) => void;
  onSuccess: () => void;
  propertyId: string;
  suppliers: any[];
  createdBy: string;
}) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => props.setModalShow(false)}
      backdrop="static"
      keyboard={false}
      heading="Add New Purchase Order"
      body={
        <FormComponent
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
          propertyId={props.propertyId}
          suppliers={props.suppliers}
          createdBy={props.createdBy}
        />
      }
    />
  );
}
