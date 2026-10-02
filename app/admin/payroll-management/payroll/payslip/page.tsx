'use client'

import { BackLink } from '../../../../../shared/pageHeader';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import Spinner from '../../../../../shared/spinner';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { PayrollPageGuide } from '../../components/payrollPageGuide';

function PayslipInner() {
  const searchParams = useSearchParams();
  const payslipId = searchParams.get('payslip_id') as Id<'payslips'> | null;
  const response = useQuery(
    api.payrolls.getPayslip,
    payslipId ? { payslipId } : 'skip'
  );

  if (!payslipId) return <p className="p-4">Missing payslip id.</p>;
  if (response === undefined) return <div className="p-4"><Spinner  size="sm" /></div>;
  if (!response.success || !response.data) return <p className="p-4">{response.message}</p>;

  const { payslip, run, staff } = response.data;
  const snapshot = payslip.snapshot as {
    staffName?: string;
    periodStart?: number;
    periodEnd?: number;
    grossPay?: number;
    totalDeductions?: number;
    netPay?: number;
    items?: Array<{ label: string; amount: number }>;
  };

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payslip</h1>
        <PayrollPageGuide page="payslip" />
          <p className="text-gray-600">{snapshot.staffName ?? `${staff?.firstName ?? ''} ${staff?.lastName ?? ''}`}</p>
          <p className="text-gray-600">
            Period {snapshot.periodStart ? new Date(snapshot.periodStart).toISOString().slice(0, 10) : ''}
            {' – '}
            {snapshot.periodEnd ? new Date(snapshot.periodEnd).toISOString().slice(0, 10) : ''}
          </p>
        </div>
        <BackLink />
      </header>
      <p>Gross {snapshot.grossPay} · Deductions {snapshot.totalDeductions} · Net {snapshot.netPay}</p>
      <ul>
        {(snapshot.items ?? []).map((item) => (
          <li key={item.label}>{item.label}: {item.amount}</li>
        ))}
      </ul>
      {run && (
        <a href={`/admin/payroll-management/payroll/view?payroll_id=${run._id}`}>Back to Payroll</a>
      )}
    </div>
  );
}

export default function PayslipPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <PayslipInner />
    </Suspense>
  );
}
