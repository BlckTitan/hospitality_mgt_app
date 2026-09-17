'use client';

import { Suspense } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { TableColumn } from '../../../../shared/table';
import PaginationComponent from '../../../../shared/pagination';
import { formatDate, formatMoney } from '../../billing/components/labels';

type ExpenseRow = {
  _id: Id<'expenses'>;
  category: string;
  amount: number;
  expenseDate: number;
  vendor?: string;
  invoiceNumber?: string;
  status?: string;
  sourceType?: string;
  sourceLabel?: string;
  description?: string;
};

export function ExpensesTable({ currentPropertyId }: { currentPropertyId: Id<'properties'> }) {
  const expenses = useQuery(api.expenses.listExpenses, { propertyId: currentPropertyId });

  const columns: TableColumn<ExpenseRow>[] = [
    {
      label: 'Date',
      key: 'expenseDate',
      render: (_value, row) => formatDate(row.expenseDate),
    },
    { label: 'Vendor', key: 'vendor' },
    { label: 'Category', key: 'category' },
    {
      label: 'Amount',
      key: 'amount',
      render: (_value, row) => formatMoney(row.amount),
    },
    {
      label: 'Status',
      key: 'status',
      render: (_value, row) => row.status ?? '—',
    },
    {
      label: 'Source',
      key: 'sourceLabel',
      render: (_value, row) =>
        row.sourceType === 'PropertyBill' ? (row.sourceLabel ?? 'Bill') : '—',
    },
    { label: 'Invoice', key: 'invoiceNumber' },
  ];

  return (
    <div className='w-full overflow-x-scroll lg:!overflow-x-hidden'>
      <Suspense>
        <PaginationComponent
          collectionName='expenses'
          columns={columns}
          jointTableData={expenses?.data ?? []}
        />
      </Suspense>
    </div>
  );
}
