'use client'

import { Suspense } from 'react';
import { useQuery } from 'convex/react';
import PaginationComponent from '../../../../../shared/pagination';
import { TableColumn } from '../../../../../shared/table';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';

type PayrollRow = {
  _id: string;
  payPeriodStart: number;
  payPeriodEnd: number;
  payDate: number;
  status: string;
  statusLabel: string;
  totalGrossPay: number;
  totalNetPay: number;
};

function formatDate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export default function Payrolls({ propertyId }: { propertyId: string }) {
  const response = useQuery(api.payrolls.listPayrolls, {
    propertyId: propertyId as Id<'properties'>,
  });

  const tableColumns: TableColumn<PayrollRow>[] = [
    {
      label: 'Period',
      key: 'payPeriodStart',
      render: (_value, row) => `${formatDate(row.payPeriodStart)} – ${formatDate(row.payPeriodEnd)}`,
    },
    {
      label: 'Pay date',
      key: 'payDate',
      render: (value) => formatDate(value as number),
    },
    { label: 'Status', key: 'statusLabel' },
    { label: 'Gross', key: 'totalGrossPay' },
    { label: 'Net', key: 'totalNetPay' },
    {
      label: 'Action',
      key: '_id',
      render: (_value, row) => (
        <a href={`/admin/payroll-management/payroll/view?payroll_id=${row._id}`}>
          Open
        </a>
      ),
    },
  ];

  return (
    <div className="w-full h-full overflow-x-scroll lg:!overflow-x-hidden">
      <Suspense>
        <PaginationComponent
          collectionName="payrolls"
          columns={tableColumns}
          jointTableData={response?.success === true ? response.data : []}
        />
      </Suspense>
    </div>
  );
}
