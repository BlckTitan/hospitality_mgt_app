'use client';

import { BackLink } from '../../../../shared/pageHeader';
import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { FcPlus } from 'react-icons/fc';
import PurchaseOrders from './components/purchaseOrders';
import { FormComponent } from './components/createPurchaseOrderForm';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import BootstrapModal from '../../../../shared/modal';
import { usePermissions } from '../../../../hooks/usePermissions';
import { InventoryPageGuide } from '../components/inventoryPageGuide';

export default function Page() {
  const [modalShow, setModalShow] = useState(false);
  const { hasGranularPermission } = usePermissions();
  const canCreate = hasGranularPermission('inventory.create');
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const currentPropertyId = propertiesResponse?.data?.[0]?._id || '';
  const suppliersResponse = useQuery(
    api.suppliers.getAllSuppliers,
    currentPropertyId ? { propertyId: currentPropertyId, activeOnly: true } : 'skip'
  );
  const suppliers = suppliersResponse?.data || [];

  if (!propertiesResponse?.data) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        Loading...
      </div>
    );
  }

  if (propertiesResponse.data.length === 0) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        <p className='text-xl'>No properties yet!</p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Purchase Orders</h3>
        <div className="flex items-center gap-3">
          <BackLink />
          {canCreate && (
            <Button
              variant="light"
              className="cursor-pointer"
              style={{ width: 'fit', height: 'fit', padding: '0', borderRadius: '100%' }}
              onClick={() => setModalShow(true)}
            >
              <FcPlus className="w-8 h-8" />
            </Button>
          )}
        </div>
      </header>

      <InventoryPageGuide page="orders" />
      <PurchaseOrders currentPropertyId={currentPropertyId} />

      <ModalComponent
        modalShow={modalShow}
        setModalShow={setModalShow}
        propertyId={currentPropertyId}
        suppliers={suppliers}
      />
    </div>
  );
}

function ModalComponent(props: {
  modalShow: boolean;
  setModalShow: (show: boolean) => void;
  propertyId: string;
  suppliers: any[];
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
          onSuccess={() => props.setModalShow(false)}
          onClose={() => props.setModalShow(false)}
          propertyId={props.propertyId}
          suppliers={props.suppliers}
        />
      }
    />
  );
}
