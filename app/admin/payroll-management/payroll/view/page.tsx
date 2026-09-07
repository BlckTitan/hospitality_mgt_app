'use client'

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Button, Spinner } from 'react-bootstrap';
import { toast } from 'sonner';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { PayrollPageGuide } from '../../components/payrollPageGuide';

function formatDate(ms?: number) {
  if (!ms) return '—';
  return new Date(ms).toISOString().slice(0, 10);
}

function PayrollViewInner() {
  const searchParams = useSearchParams();
  const payrollId = searchParams.get('payroll_id') as Id<'payrollRuns'> | null;
  const payroll = useQuery(
    api.payrollRuns.getPayroll,
    payrollId ? { payrollRunId: payrollId } : 'skip'
  );
  const preparePay = useMutation(api.payrollRuns.preparePay);
  const approvePayroll = useMutation(api.payrollRuns.approvePayroll);
  const downloadPaymentFiles = useMutation(api.payrollRuns.downloadPaymentFiles);
  const markAsPaid = useMutation(api.payrollRuns.markAsPaid);

  if (!payrollId) return <p className="p-4">Missing payroll id.</p>;
  if (payroll === undefined) {
    return <div className="p-4"><Spinner animation="border" size="sm" /></div>;
  }
  if (!payroll.success || !payroll.data) {
    return <p className="p-4">{payroll.message ?? 'Payroll not found'}</p>;
  }

  const run = payroll.data;

  const runAction = async (
    action: () => Promise<{ success: boolean; message?: string }>,
    successHref?: string
  ) => {
    const response = await action();
    if (response.success === false) {
      toast.error(response.message);
      return;
    }
    toast.success(response.message ?? 'Done');
    if (successHref) window.location.href = successHref;
  };

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4">
        <h3>
          Payroll {formatDate(run.payPeriodStart)} – {formatDate(run.payPeriodEnd)}
        </h3>
        <p>Status: {run.statusLabel}</p>
        <p>Gross {run.totalGrossPay} · Deductions {run.totalDeductions} · Net {run.totalNetPay}</p>
      </header>
      <PayrollPageGuide page="payroll-view" />

      <div className="flex flex-wrap gap-2 mb-4">
        {(run.status === 'draft' || run.status === 'calculated') && (
          <Button variant="dark" onClick={() => runAction(() => preparePay({ payrollRunId: run._id }))}>
            {run.status === 'calculated' ? 'Recalculate' : 'Prepare pay'}
          </Button>
        )}
        {run.status === 'calculated' && (
          <Button variant="dark" onClick={() => runAction(() => approvePayroll({ payrollRunId: run._id }))}>
            Approve payroll
          </Button>
        )}
        {(run.status === 'approved' || run.status === 'processed') && (
          <Button
            variant="dark"
            onClick={() =>
              runAction(
                () => downloadPaymentFiles({ payrollRunId: run._id }),
                `/admin/payroll-management/payroll/export?payroll_id=${run._id}`
              )
            }
          >
            Download payment files
          </Button>
        )}
        {(run.status === 'processed' || run.status === 'approved') && (
          <Button variant="dark" onClick={() => runAction(() => markAsPaid({ payrollRunId: run._id }))}>
            Mark as paid
          </Button>
        )}
        <a href="/admin/payroll-management/payroll">Back to Payroll</a>
      </div>

      <h4 className="mb-2">Staff pay</h4>
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Staff</th>
            <th>Hours</th>
            <th>Gross</th>
            <th>Deductions</th>
            <th>Net</th>
            <th>Pay items</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {run.staffPay.map((line) => (
            <tr key={line._id}>
              <td>{line.staffName}</td>
              <td>{line.regularHours} + OT {line.overtimeHours}</td>
              <td>{line.grossPay}</td>
              <td>{line.totalDeductions}</td>
              <td>{line.netPay}</td>
              <td>
                {line.items.map((item) => (
                  <div key={item._id}>{item.label}: {item.amount}</div>
                ))}
              </td>
              <td>
                {line.payslipId && (
                  <a href={`/admin/payroll-management/payroll/payslip?payslip_id=${line.payslipId}`}>
                    Payslip
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PayrollViewPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <PayrollViewInner />
    </Suspense>
  );
}
