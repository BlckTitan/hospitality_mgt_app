'use client';

import { BackLink } from '../../../../shared/pageHeader';
import { useState } from 'react';
import { Button } from '../../../../shared/button';
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
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Bill accounts</h1>
        <BillingPageGuide page='accounts' />
      </div>
        <div className='flex items-center gap-3'>
          <BackLink />
          {canCreate && (
            <Button
              variant='light'
              className='cursor-pointer'
              circle
              onClick={() => setModalShow(true)}
            >
              <FcPlus className='w-8 h-8' />
            </Button>
          )}
        </div>
      </header>
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
