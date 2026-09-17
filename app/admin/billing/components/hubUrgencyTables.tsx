'use client';

import TableComponent, { TableColumn } from '../../../../shared/table';
import { billTypeLabel, formatDate, formatMoney } from './labels';

export type HubBillRow = {
  _id: string;
  accountName: string;
  billType: string;
  dueDate: number;
  amount?: number;
  status: string;
};

const columns: TableColumn<HubBillRow>[] = [
  { label: 'Account', key: 'accountName' },
  {
    label: 'Type',
    key: 'billType',
    render: (_value, row) => billTypeLabel(row.billType),
  },
  {
    label: 'Due',
    key: 'dueDate',
    render: (_value, row) => formatDate(row.dueDate),
  },
  {
    label: 'Amount',
    key: 'amount',
    render: (_value, row) => formatMoney(row.amount),
  },
];

function UrgencyPanel({
  title,
  emptyMessage,
  rows,
  tone,
}: {
  title: string;
  emptyMessage: string;
  rows: HubBillRow[];
  tone: 'overdue' | 'due';
}) {
  const isOverdue = tone === 'overdue';
  const panelClass = isOverdue
    ? 'border-red-600 bg-red-50'
    : 'border-amber-500 bg-amber-50';
  const badgeClass = isOverdue ? 'bg-red-600' : 'bg-amber-500';

  return (
    <section className={`min-w-0 border-2 p-3 ${panelClass}`}>
      <div className='flex items-center justify-between gap-2 mb-3'>
        <h4 className='mb-0'>{title}</h4>
        <p className={`w-fit px-2 py-1 text-white rounded-sm mb-0 ${badgeClass}`}>
          {rows.length}
        </p>
      </div>
      {rows.length === 0 ? (
        <p className='mb-0 text-sm text-slate-600'>{emptyMessage}</p>
      ) : (
        <div className='overflow-x-auto bg-white'>
          <TableComponent data={rows} columns={columns} />
        </div>
      )}
    </section>
  );
}

export function HubUrgencyTables({
  overdue,
  dueThisWeek,
}: {
  overdue: HubBillRow[];
  dueThisWeek: HubBillRow[];
}) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
      <UrgencyPanel
        title='Overdue'
        emptyMessage='No overdue bills.'
        rows={overdue}
        tone='overdue'
      />
      <UrgencyPanel
        title='Due this week'
        emptyMessage='Nothing due this week.'
        rows={dueThisWeek}
        tone='due'
      />
    </div>
  );
}
