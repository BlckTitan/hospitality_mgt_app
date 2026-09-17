'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { EditAccountForm } from '../../components/editAccountForm';
import { BillingPageGuide } from '../../components/billingPageGuide';

export default function EditBillAccountPage() {
  const searchParams = useSearchParams();
  const accountId = searchParams.get('account_id');
  const accountResponse = useQuery(
    api.billing.getAccount,
    accountId ? { accountId: accountId as Id<'billAccounts'> } : 'skip',
  );

  if (!accountId) {
    return (
      <div className='w-full p-4 bg-white'>
        <h3 className='text-red-600'>Account not found</h3>
        <a href='/admin/billing/accounts'>Back to accounts</a>
      </div>
    );
  }

  if (!accountResponse?.data) {
    return (
      <div className='w-full p-4 bg-white'>
        <header className='w-full border-b flex justify-between items-center mb-4'>
          <h3>Edit bill account</h3>
          <BackLink />
        </header>
        <BillingPageGuide page='accounts-edit' />
        Loading...
      </div>
    );
  }

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full border-b flex justify-between items-center mb-4'>
        <h3>Edit bill account</h3>
        <BackLink />
      </header>
      <BillingPageGuide page='accounts-edit' />
      <EditAccountForm
        account={accountResponse.data}
        onClose={() => {
          window.location.href = '/admin/billing/accounts';
        }}
      />
    </div>
  );
}
