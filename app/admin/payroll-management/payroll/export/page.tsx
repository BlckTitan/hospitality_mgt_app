'use client'

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { Spinner } from 'react-bootstrap';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { PayrollPageGuide } from '../../components/payrollPageGuide';

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function ExportInner() {
  const searchParams = useSearchParams();
  const payrollId = searchParams.get('payroll_id') as Id<'payrollRuns'> | null;
  const payroll = useQuery(
    api.payrollRuns.getPayroll,
    payrollId ? { payrollRunId: payrollId } : 'skip'
  );

  if (!payrollId) return <p className="p-4">Missing payroll id.</p>;
  if (payroll === undefined) return <div className="p-4"><Spinner animation="border" size="sm" /></div>;
  if (!payroll.success || !payroll.data) return <p className="p-4">{payroll.message}</p>;

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4">
        <h3>Payment files</h3>
      </header>
      <PayrollPageGuide page="export" />
      {payroll.data.exports.length === 0 && <p>No payment files yet. Use Download payment files on the Payroll.</p>}
      {payroll.data.exports.map((file) => (
        <div key={file._id} className="mb-3">
          <p>{file.format === 'cash_sheet' ? 'Cash / mobile pay list' : 'Bank file'} — {file.status}</p>
          {file.content && (
            <button
              type="button"
              onClick={() => download(`${file.format}-${payrollId}.csv`, file.content ?? '')}
            >
              Download CSV
            </button>
          )}
          {file.content && <pre className="mt-2 p-2 bg-gray-50 overflow-x-auto">{file.content}</pre>}
        </div>
      ))}
      <a href={`/admin/payroll-management/payroll/view?payroll_id=${payrollId}`}>Back to Payroll</a>
    </div>
  );
}

export default function PaymentFilesPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <ExportInner />
    </Suspense>
  );
}
