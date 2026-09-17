'use client';

import { BackLink } from '../../../../shared/pageHeader';
import { useState } from 'react';
import { Button } from 'react-bootstrap';
import { FcPlus } from 'react-icons/fc';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { usePermissions } from '../../../../hooks/usePermissions';
import BootstrapModal from '../../../../shared/modal';
import { BillAccounts } from '../components/billAccounts';
import { CreateAccountForm } from '../components/createAccountForm';
import { BillingPageGuide } from '../components/billingPageGuide';

export default function BillAccountsPage() {
  const [modalShow, setModalShow] = useState(false);
  const { hasGranularPermission } = usePermissions();
  const canCreate = hasGranularPermission('billing.account.create');
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const currentPropertyId = propertiesResponse?.data?.[0]?._id;

  if (!propertiesResponse?.data) {
    return (
      <div className='w-full h-full flex justify-center items-center'>Loading...</div>
    );
  }

  if (!currentPropertyId) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        <p className='text-xl'>No properties yet!</p>
      </div>
    );
  }

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full border-b flex justify-between items-center mb-4'>
        <h3>Bill accounts</h3>
        <div className='flex items-center gap-3'>
          <BackLink />
          {canCreate && (
            <Button
              variant='light'
              className='cursor-pointer'
              style={{ width: 'fit', height: 'fit', padding: '0', borderRadius: '100%' }}
              onClick={() => setModalShow(true)}
            >
              <FcPlus className='w-8 h-8' />
            </Button>
          )}
        </div>
      </header>
      <BillingPageGuide page='accounts' />
      <BillAccounts currentPropertyId={currentPropertyId} />
      <BootstrapModal
        show={modalShow}
        onHide={() => setModalShow(false)}
        backdrop='static'
        keyboard={false}
        heading='Add bill account'
        body={
          <CreateAccountForm
            propertyId={currentPropertyId}
            onClose={() => setModalShow(false)}
          />
        }
      />
    </div>
  );
}
