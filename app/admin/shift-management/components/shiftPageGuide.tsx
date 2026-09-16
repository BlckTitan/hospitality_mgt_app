'use client'

type GuidePage =
  | 'hub'
  | 'templates'
  | 'templates-edit'
  | 'attendance'
  | 'cover'
  | 'shift'
  | 'shift-edit'
  | 'hours';

const DESCRIPTIONS: Record<GuidePage, string> = {
  hub: 'Define department shifts, then onboard staff into that department. Staff start and end their shift on Attendance Tracker. Use Cover when someone else works the day. Ad-hoc Shifts remain available. Finalize or sign out creates draft Hours for payroll.',
  templates: 'Define default working hours per department. New staff in that department inherit this shift. Employees start and end their shift on Attendance Tracker; use Cover when someone else works the day.',
  'templates-edit': 'Change default hours for this department. New staff inherit the update. Existing attendance and Hours already recorded are not rewritten.',
  attendance: 'Logging in does not start your shift. Open this page, then click Start shift when you begin work and End shift when you finish. Hours are recorded when you end the shift and still need supervisor approval before payroll.',
  cover: 'Reassign a day when someone cannot report. This changes who should attend, not Hours already recorded. Cover is blocked if the scheduled person already started a shift or has Hours for that date.',
  shift: 'Create an ad-hoc Shift with + when someone is not on a department template. Finalize a shift to create draft Hours for payroll.',
  'shift-edit': 'Change times or finalize this ad-hoc shift. Finalize creates draft Hours that still need approval before they can be paid.',
  hours: 'Record a day’s Hours with +, end a shift on Attendance Tracker, or finalize an ad-hoc Shift to create a draft. Approve Hours before they can be paid. After Prepare pay, included Hours are locked until Recalculate (while the Payroll is still Draft or Ready to review).',
};

export function ShiftPageGuide({ page }: { page: GuidePage }) {
  return (
    <p className="mb-4 text-sm text-gray-600">
      {DESCRIPTIONS[page]}
    </p>
  );
}
