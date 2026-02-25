'use client';

import { useState } from 'react';
import { Button } from 'react-bootstrap';
import { FormComponent } from './components/createTableForm';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import BootstrapModal from '../../../../shared/modal';
import { FcPlus } from 'react-icons/fc';
import { Tables } from './components/tables';

export default function TablePage() {
  const [modalShow, setModalShow] = useState(false);
  const [propertyId, setPropertyId] = useState<string>('');

  // Fetch properties to get the current property
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const properties = propertiesResponse?.data || [];
  const currentPropertyId = propertyId || properties?.[0]?._id || '';

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full border-b flex justify-between items-center'>
        <h3>Restaurant Tables</h3>
        <Button
          variant='light'
          className='cursor-pointer'
          style={{ width: 'fit', height: 'fit', padding: '0', borderRadius: '100%' }}
          onClick={() => setModalShow(true)}
        >
          <FcPlus className='w-8 h-8' />
        </Button>
      </header>

      <Tables currentPropertyId={currentPropertyId} />

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

function ModalComponent(props: any) {
  return (
    <>
      <BootstrapModal
        show={props.modalShow}
        onHide={() => props.setModalShow(false)}
        backdrop='static'
        keyboard={false}
        heading='Add New Table'
        body={
          <FormComponent
            onSuccess={props.onSuccess}
            onClose={() => props.setModalShow(false)}
            propertyId={props.propertyId}
          />
        }
      />
    </>
  );
}
