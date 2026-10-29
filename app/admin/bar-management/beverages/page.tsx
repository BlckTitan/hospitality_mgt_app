'use client';

import { BackLink } from '../../../../shared/pageHeader';
import React, { useState } from 'react';
import { Button } from '../../../../shared/button';
import { FcPlus } from 'react-icons/fc';
import Beverages from './components/beverages';
import { FormComponent } from './components/createBeverageForm';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../shared/modal';
import { BarManagementPageGuide } from '../components/barManagementPageGuide';
import { usePermissions } from '../../../../hooks/usePermissions';

export default function BeveragePage() {
  const [modalShow, setModalShow] = useState(false);
  const { hasGranularPermission } = usePermissions();
  const canCreate = hasGranularPermission('fnb.create');

  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {});
  const properties = propertiesResponse?.data ?? [];
  const currentPropertyId = (properties[0]?._id || '') as Id<'properties'> | '';

  if (!propertiesResponse?.data) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        Loading...
      </div>
    );
  }

  if (propertiesResponse.data?.length === 0 || !currentPropertyId) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        <p className='text-xl'>No properties yet!</p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Beverages</h1>
        <BarManagementPageGuide page="beverages" />
      </div>
        <div className="flex items-center gap-3">
          <BackLink />
        {canCreate && currentPropertyId && (
        <Button
          variant="light"
          className="cursor-pointer"
          circle
          onClick={() => setModalShow(true)}
        >
          <FcPlus className="w-8 h-8" />
        </Button>
        )}
      
        </div>
      </header>
      <Beverages currentPropertyId={currentPropertyId}/>

      <ModalComponent
        modalShow={modalShow}
        setModalShow={setModalShow}
        onSuccess={() => {
          setModalShow(false);
        }}
        propertyId={currentPropertyId}
      />
    </div>
  );
}

function ModalComponent(props: {
  modalShow: boolean;
  setModalShow: (show: boolean) => void;
  onSuccess: () => void;
  propertyId: string;
}) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => props.setModalShow(false)}
      backdrop="static"
      keyboard={false}
      heading="Add New Beverage"
      body={
        <FormComponent
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
          propertyId={props.propertyId}
        />
      }
    />
  );
}
