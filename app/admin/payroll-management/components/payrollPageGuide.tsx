'use client'

type GuidePage =
  | 'hub'
  | 'settings'
  | 'hours'
  | 'time-off'
  | 'payroll'
  | 'payroll-view'
  | 'payslip'
  | 'export';

const DESCRIPTIONS: Record<GuidePage, string> = {
  hub: 'Prepare, approve, and pay staff. Seed Payroll settings first, then approve Hours (under Shift Management) and Time off. Start payroll from a Pay cycle, Prepare pay, have another user Approve payroll, Download payment files, and Mark as paid.',
  settings: 'Configure how this property pays people. Seed the country pack (NG or generic) if settings are empty. Keep one default Pay cycle — Start payroll copies its period, cutoff, and pay date. Unpaid Time-off types prorate salary. Statutory Pay item types such as PAYE and pension come from the pack and should not be deleted.',
  hours: 'Hours live under Shift Management. Staff sign out on Attendance Tracker (or you finalize an ad-hoc Shift) to create a draft, or record a day with +. Approve before they can be paid. After Prepare pay, included Hours are locked. Recalculate unlocks them only while the Payroll is Draft or Ready to review.',
  'time-off': 'Record Time off against a Time-off type with +, then Approve. Only approved Time off affects the next Payroll. Approved unpaid Time off reduces salaried or mixed pay for that period.',
  payroll: 'Start payroll from a Pay cycle with +. Only one open Payroll may overlap a period. Open a row to Prepare pay, have another user Approve payroll, download Payment files, and Mark as paid. Statuses move from Draft to Ready to review, Approved, Payment files ready, then Paid.',
  'payroll-view': 'Prepare pay locks approved Hours and writes Staff pay and Pay items. A different user must Approve payroll — that creates Payslips and posts the GL. Then Download payment files (bank CSV and cash list) and Mark as paid.',
  payslip: 'This summary is frozen when the Payroll is approved. Amounts will not change if the staff record is edited later.',
  export: 'The bank CSV lists staff paid by bank. The cash and mobile list is everyone else. Mark as paid on the Payroll after you pay them.',
};

export function PayrollPageGuide({ page }: { page: GuidePage }) {
  return (
    <p className="mb-4 text-sm text-gray-600">
      {DESCRIPTIONS[page]}
    </p>
  );
}
