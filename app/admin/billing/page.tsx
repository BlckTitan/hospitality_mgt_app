'use client';

import { BackLink } from '../../../shared/pageHeader';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { usePermissions } from '../../../hooks/usePermissions';
import { BillingPageGuide } from './components/billingPageGuide';
import { HubUrgencyTables } from './components/hubUrgencyTables';

export default function BillingHubPage() {
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const currentPropertyId = propertiesResponse?.data?.[0]?._id;
  const dashboard = useQuery(
    api.billing.listDashboard,
    currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  );
  const { hasGranularPermission } = usePermissions();
  const canAccessExpenses = hasGranularPermission('expenses.read');
  const canReadAccounts = hasGranularPermission('billing.account.read');

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

  const overdue = dashboard?.data?.overdue ?? [];
  const dueThisWeek = dashboard?.data?.dueThisWeek ?? [];

  return (
    <div className='w-full p-4 bg-white'>
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Billing</h1>
        <BillingPageGuide page='hub' />
      </div>
        <BackLink />
      </header>
      <div className='flex flex-wrap gap-3 mb-6'>
        {canReadAccounts && (
          <Link href='/admin/billing/accounts' className='border px-3 py-2'>
            Bill accounts
          </Link>
        )}
        <Link href='/admin/billing/bills' className='border px-3 py-2'>
          Bills
        </Link>
        {canAccessExpenses && (
          <Link href='/admin/expenses' className='border px-3 py-2'>
            Expenses
          </Link>
        )}
      </div>

      <p className='mb-4 text-sm text-slate-600'>
        {dashboard?.data?.accountCount ?? 0} active accounts.
        {' '}
        <span className='text-red-600 font-medium'>Overdue {overdue.length}</span>.
        {' '}
        <span className='text-amber-600 font-medium'>Due this week {dueThisWeek.length}</span>.
      </p>

      <HubUrgencyTables overdue={overdue} dueThisWeek={dueThisWeek} />
    </div>
  );
}
