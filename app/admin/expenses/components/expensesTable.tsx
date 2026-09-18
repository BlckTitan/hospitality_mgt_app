'use client';

import { Suspense } from 'react';
import { Id } from '../../../../convex/_generated/dataModel';
import { TableColumn } from '../../../../shared/table';
import PaginationComponent from '../../../../shared/pagination';
import { formatDate, formatMoney } from '../../billing/components/labels';

const CATEGORY_LABELS: Record<string, string> = {
  utilities: 'Utilities',
  supplies: 'Supplies',
  staff: 'Staff',
  maintenance: 'Maintenance',
  other: 'Other',
};

type ExpenseRow = {
  _id: Id<'expenses'>;
  category: string;
  subcategory?: string;
  amount: number;
  expenseDate: number;
  vendor?: string;
  invoiceNumber?: string;
  status?: string;
  sourceType?: string;
  sourceLabel?: string;
  sourceHref?: string;
  description?: string;
};

export function ExpensesTable({ rows }: { rows: ExpenseRow[] }) {
  const columns: TableColumn<ExpenseRow>[] = [
    {
      label: 'Date',
      key: 'expenseDate',
      render: (_value, row) => formatDate(row.expenseDate),
    },
    { label: 'Vendor', key: 'vendor' },
    {
      label: 'Category',
      key: 'category',
      render: (_value, row) => CATEGORY_LABELS[row.category] ?? row.category,
    },
    {
      label: 'Detail',
      key: 'subcategory',
      render: (_value, row) => row.subcategory || row.description || '—',
    },
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
        row.sourceHref ? (
          <a href={row.sourceHref} className='text-blue-700 underline'>
            {row.sourceLabel ?? 'Open'}
          </a>
        ) : (
          (row.sourceLabel ?? '—')
        ),
    },
    { label: 'Invoice', key: 'invoiceNumber' },
  ];

  return (
    <div className='w-full overflow-x-scroll lg:!overflow-x-hidden'>
      <Suspense>
        <PaginationComponent
          collectionName='expenses'
          columns={columns}
          jointTableData={rows}
        />
      </Suspense>
    </div>
  );
}
