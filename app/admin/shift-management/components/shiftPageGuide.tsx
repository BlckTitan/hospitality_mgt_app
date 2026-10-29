'use client'

type GuidePage =
  | 'hub'
  | 'templates'
  | 'templates-edit'
  | 'attendance'
  | 'cover'
  | 'shift'
  | 'shift-edit'
  | 'hours'
  | 'punctuality';

const DESCRIPTIONS: Record<GuidePage, string> = {
  hub: 'A department shift is the hours a department works. A shift is one person working on a date. Only a food & beverage shift is at a bar. Staff with Self clock start and end on My duty. Supervisors use Today’s floor to clock people on site. Use Cover when someone else works the day. Finalize or End shift creates draft Hours for payroll. Punctuality compares the live start to the department shift.',
  templates: 'Hours for one department, such as Housekeeping morning. New staff in that department inherit these hours. This is not a person, a date, or a bar.',
  'templates-edit': 'Change the hours for this department. New staff inherit the update. Existing attendance, Hours, and punctuality already recorded are not rewritten.',
  attendance: 'Logging in does not start a shift. Staff who may self-clock use My duty. Supervisors use Today’s floor to Start for / End for people on site — the time recorded is when the button is pressed. Staff without a phone are clocked by a supervisor. Hours still need approval before payroll.',
  cover: 'Reassign a day when someone cannot report. This changes who should attend, not Hours already recorded. Cover is blocked if the scheduled person already started a shift or has Hours for that date.',
  shift: 'One person on one date. Use + when they were not clocked in from Attendance. Choose a bar only for food & beverage. Finalize a shift to create draft Hours for payroll.',
  'shift-edit': 'Change the person, date, or times for this worked shift. A bar is only for food & beverage. Saving does not finalize the shift.',
  hours: 'Record a day’s Hours with +, end a shift on Attendance Tracker, or finalize an ad-hoc Shift to create a draft. Approve Hours before they can be paid. After Prepare pay, included Hours are locked until Recalculate (while the Payroll is still Draft or Ready to review).',
  punctuality: 'Started shifts in the selected week or month, scored against the department shift expected start (plus grace minutes from Payroll settings). Staff appear only for days they started a shift. This is a report, not a pay deduction.',
};

export function ShiftPageGuide({ page }: { page: GuidePage }) {
  return (
    <p className="text-gray-600">
      {DESCRIPTIONS[page]}
    </p>
  );
}
