'use client';

import { Suspense } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { MdEditDocument } from 'react-icons/md';
import { toast } from 'sonner';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { TableColumn } from '../../../../shared/table';
import PaginationComponent from '../../../../shared/pagination';
import { usePermissions } from '../../../../hooks/usePermissions';
import { billTypeLabel, frequencyLabel } from './labels';

type AccountRow = {
  _id: Id<'billAccounts'>;
  name: string;
  billType: string;
  frequency: string;
  provider: string;
  isMetered: boolean;
  isActive: boolean;
};

export function BillAccounts({ currentPropertyId }: { currentPropertyId: Id<'properties'> }) {
  const accounts = useQuery(api.billing.listAccounts, { propertyId: currentPropertyId });
  const ensurePeriod = useMutation(api.billing.ensureCurrentPeriod);
  const { hasGranularPermission } = usePermissions();
  const canOpenPeriod = hasGranularPermission('billing.period.update');

  const columns: TableColumn<AccountRow>[] = [
    { label: 'Name', key: 'name' },
    {
      label: 'Type',
      key: 'billType',
      render: (_value, row) => billTypeLabel(row.billType),
    },
    {
      label: 'Frequency',
      key: 'frequency',
      render: (_value, row) => frequencyLabel(row.frequency),
    },
    { label: 'Provider', key: 'provider' },
    {
      label: 'Metered',
      key: 'isMetered',
      render: (_value, row) => (row.isMetered ? 'Yes' : 'No'),
    },
    {
      label: 'Active',
      key: 'isActive',
      render: (_value, row) => (
        <p className={`w-fit px-2 py-1 text-white rounded-sm ${row.isActive ? 'bg-green-600' : 'bg-gray-400'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </p>
      ),
    },
    {
      label: 'Action',
      key: '_id',
      render: (_value, row) => (
        <div className='flex items-center gap-2'>
          <a
            href={`/admin/billing/accounts/edit?account_id=${row._id}`}
            className='!no-underline !text-amber-400'
          >
            <MdEditDocument />
          </a>
          {row.isActive && canOpenPeriod && (
            <button
              type='button'
              className='text-sm underline'
              onClick={async () => {
                const result = await ensurePeriod({ accountId: row._id });
                result.success ? toast.success(result.message) : toast.error(result.message);
              }}
            >
              Open period
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className='w-full overflow-x-scroll lg:!overflow-x-hidden'>
      <Suspense>
        <PaginationComponent
          collectionName='billAccounts'
          columns={columns}
          jointTableData={accounts?.data ?? []}
        />
      </Suspense>
    </div>
  );
}
