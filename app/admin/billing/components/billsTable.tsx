'use client';

import { Suspense, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { TableColumn } from '../../../../shared/table';
import PaginationComponent from '../../../../shared/pagination';
import BootstrapModal from '../../../../shared/modal';
import { usePermissions } from '../../../../hooks/usePermissions';
import { toast } from 'sonner';
import { billTypeLabel, formatDate, formatMoney, frequencyLabel } from './labels';
import { CaptureBillForm } from './captureBillForm';
import { PayBillForm } from './payBillForm';

type PeriodRow = {
  _id: Id<'billPeriods'>;
  accountName: string;
  billType: string;
  frequency: string;
  provider: string;
  isMetered: boolean;
  status: string;
  amount?: number;
  dueDate: number;
  periodStart: number;
  periodEnd: number;
  documents: Array<{ kind: string; url?: string | null; fileName: string }>;
  invoiceNumber?: string;
  usageAmount?: number;
  unitRate?: number;
  meterReading?: number;
  previousMeterReading?: number;
};

export function BillsTable({ currentPropertyId }: { currentPropertyId: Id<'properties'> }) {
  const periods = useQuery(api.billing.listPeriods, { propertyId: currentPropertyId });
  const { hasGranularPermission } = usePermissions();
  const canCapture = hasGranularPermission('billing.period.update');
  const canPay = hasGranularPermission('billing.pay');
  const [captureRow, setCaptureRow] = useState<PeriodRow | null>(null);
  const [payRow, setPayRow] = useState<PeriodRow | null>(null);

  const columns: TableColumn<PeriodRow>[] = [
    { label: 'Account', key: 'accountName' },
    {
      label: 'Type',
      key: 'billType',
      render: (_value, row) => billTypeLabel(row.billType),
    },
    {
      label: 'Cadence',
      key: 'frequency',
      render: (_value, row) => frequencyLabel(row.frequency),
    },
    {
      label: 'Period',
      key: 'periodStart',
      render: (_value, row) => `${formatDate(row.periodStart)} – ${formatDate(row.periodEnd)}`,
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
    {
      label: 'Status',
      key: 'status',
      render: (_value, row) => {
        const tone =
          row.status === 'paid'
            ? 'bg-green-600'
            : row.status === 'overdue'
              ? 'bg-red-600'
              : row.status === 'pending'
                ? 'bg-amber-500'
                : 'bg-gray-400';
        return (
          <p className={`w-fit px-2 py-1 text-white rounded-sm ${tone}`}>
            {row.status}
          </p>
        );
      },
    },
    {
      label: 'Documents',
      key: 'documents',
      render: (_value, row) => (
        <span>
          {row.documents.map((doc) => (
            <a key={`${doc.kind}-${doc.fileName}`} href={doc.url ?? '#'} target='_blank' rel='noreferrer' className='mr-2'>
              {doc.kind}
            </a>
          ))}
        </span>
      ),
    },
    {
      label: 'Action',
      key: '_id',
      render: (_value, row) => (
        <div className='flex gap-2'>
          {canCapture && row.status !== 'paid' && (
            <button type='button' className='underline text-sm' onClick={() => setCaptureRow(row)}>
              Capture
            </button>
          )}
          {canPay && row.status !== 'paid' && (
            <button
              type='button'
              className='underline text-sm'
              onClick={() => {
                if (!row.documents.some((doc) => doc.kind === 'bill')) {
                  toast.error('Attach the original bill before marking paid');
                  return;
                }
                setPayRow(row);
              }}
            >
              Pay
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
          collectionName='billPeriods'
          columns={columns}
          jointTableData={periods?.data ?? []}
        />
      </Suspense>
      <BootstrapModal
        show={Boolean(captureRow)}
        onHide={() => setCaptureRow(null)}
        backdrop='static'
        keyboard={false}
        heading='Capture bill'
        body={
          captureRow ? (
            <CaptureBillForm
              period={captureRow}
              propertyId={currentPropertyId}
              onClose={() => setCaptureRow(null)}
            />
          ) : null
        }
      />
      <BootstrapModal
        show={Boolean(payRow)}
        onHide={() => setPayRow(null)}
        backdrop='static'
        keyboard={false}
        heading='Mark bill paid'
        body={
          payRow ? (
            <PayBillForm
              periodId={payRow._id}
              propertyId={currentPropertyId}
              onClose={() => setPayRow(null)}
            />
          ) : null
        }
      />
    </div>
  );
}
