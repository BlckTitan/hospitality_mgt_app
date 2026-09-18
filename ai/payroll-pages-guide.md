# Payroll pages — quick guide

Operator guide for the screens under **Payroll**. Schema and design rules live in [payroll-implementation.md](./payroll-implementation.md).

Sidebar: **Payroll** → Payroll, Time off, Payroll settings. **Shift Management** → Department shifts, Attendance Tracker, Cover, Shift, Hours, Punctuality.

---

## First-time setup

1. Set **Country** on the property (create, edit, or setup). `NG` seeds the Nigeria pack; anything else uses **generic**.
2. Open **Payroll settings**. If nothing is seeded, choose the country and click **Seed Payroll settings**.
3. Confirm there is a default **Pay cycle**. Add Time-off types, Pay item types, Holidays, and Extra pay rules as needed.
4. On **Staff**, each person who should be paid needs a `staffs` row (login is optional). New staff are scoped to the current property.

Then the usual cycle is: define department shifts, onboard staff, start/end shift (or finalize an ad-hoc Shift), approve **Hours** / **Time off** → **Start payroll** → **Prepare pay** → someone else **Approve payroll** → **Download payment files** → **Mark as paid**.

---

## Pages

### Payroll hub — `/admin/payroll-management`

Landing page with links to Payroll, Hours (Shift Management), Time off, and Payroll settings. Use the sidebar for day-to-day work.

### Payroll settings — `/admin/payroll-management/settings`

Who: HR / finance.

- Seed the country pack once per property.
- **Pay cycles**: how often you pay and the cutoff. A Payroll is started from a cycle.
- **Time-off types**: paid vs unpaid. Unpaid approved Time off prorates salary.
- **Pay item types**: housing, PAYE, pension, custom allowances. Statutory rows come from the pack.
- **Holidays** and **Extra pay rules**: used when Hours are classified (OT, weekend, public holiday).
- **Punctuality grace minutes**: how late a start can be and still count as on time (default 5). Does not change pay.

Country cannot change after an approved or paid Payroll.

### Department shifts — `/admin/shift-management/templates`

Who: HR / supervisors who can update staff.

- One default working-hours template per department (F&B also needs a default bar).
- New staff inherit the default template for their department. If none exists yet, create the shift first.

### Attendance Tracker — `/admin/shift-management/attendance`

Who: staff with a User login linked to their `staffs` row.

- Shows today’s expected department shift. Logging in does not start work.
- **Start shift** records actual clock time when you begin and whether you are on time or late. **End shift** finalizes the session and creates **draft** Hours.
- Staff whose login is not linked to Staff cannot start a shift.

### Cover — `/admin/shift-management/cover`

Who: supervisors who can update staff.

- Pick a date and assign someone else to work that roster day. This changes who should attend, not Hours.
- Blocked if the scheduled person already started a shift or has Hours for that date. The covering person cannot already have a started shift that day.

### Hours — `/admin/shift-management/hours`

Who: supervisors (approve) and staff with login (record).

- **+** records one day’s Hours for a staff member (no shift required).
- **Start shift** / **End shift** on Attendance Tracker, or finalizing an ad-hoc **Shift**, creates a **draft** Hours row (`source = shift`). Still **Approve** before those hours can be paid.
- After **Prepare pay**, included Hours show **Locked for payroll** and cannot be edited until Recalculate (while the Payroll is still Draft / Ready to review).

The old `/admin/payroll-management/hours` URL redirects here.

### Punctuality — `/admin/shift-management/punctuality`

Who: supervisors (`payroll.timesheet.read` or `staff.read`); staff see their own days on **My profile**.

- Week or month of started shifts, scored against the department shift expected start plus grace minutes.
- Team table plus each staff member’s Punctuality tab. This is a report, not a pay deduction.
- Days without a started shift are not scored (no-shows are out of scope until scheduled work days exist).

### Shift — `/admin/shift-management/shift`

Who: employees (own rows) and managers with `staff.read` (every staff member).

- Attendance Tracker Start shift and ad-hoc **+** both write the same `shifts` table. One session per staff per date.
- Employees see only their own shifts and cannot add, edit, delete, or Finalize.
- Managers see all property shifts. **Finalize** (or End shift) creates draft Hours.

### Time off — `/admin/payroll-management/time-off`

Who: supervisors (approve) and staff with login (record).

- **+** records Time off against a Time-off type.
- Only **approved** Time off affects pay.
- Approved **unpaid** Time off reduces salaried / mixed pay for that period.

### Payroll list — `/admin/payroll-management/payroll`

Who: HR / finance.

- Table of payrolls (period, pay date, status, totals).
- **+** is **Start payroll**: pick a Pay cycle. Period, cutoff, and pay date are copied. Only one open Payroll (Draft or Ready to review) may overlap a period.

Statuses: Draft → Ready to review → Approved → Payment files ready → Paid.

### Payroll (one period) — `/admin/payroll-management/payroll/view?payroll_id=`

Who: HR / finance. Approver must not be the person who started it or last prepared pay.

| Status | Buttons |
|---|---|
| Draft | **Prepare pay** |
| Ready to review | **Recalculate**, **Approve payroll** |
| Approved | **Download payment files**, **Mark as paid** |
| Payment files ready | **Download payment files**, **Mark as paid** |
| Paid | none |

**Staff pay** is one row per person: hours, gross, deductions, net, and Pay items. After approve, open **Payslip** on the row.

### Payslip — `/admin/payroll-management/payroll/payslip?payslip_id=`

Frozen summary created on Approve payroll. Staff with login may view their own.

### Payment files — `/admin/payroll-management/payroll/export?payroll_id=`

Bank CSV for `paymentMethod = bank`. Cash / mobile list for everyone else. Generated by **Download payment files**.

### Staff — `/admin/staff`, `/admin/staff/view?staff_id=`, `/admin/staff/myProfile`

People master (`staffs` only). New staff get the current property, an employee number, employment type, opening Pay history, onboarding checklist, and the default department shift. Change bank / pay type via Pay history before you rely on payment files. Link a User login to Staff before they can use Attendance Tracker or My profile. Terminate hides the row from the default list; it does not hard-delete. Supervisors do not see salary, tax ID, or bank.

---

## Who can do what

| Role | Typical access |
|---|---|
| Administrator, Director, GM, Finance, HR | Full payroll. Two different users still required to prepare vs approve. |
| Supervisor / Assistant Manager | Hours and Time off approve for **direct reports**; Department shifts and Cover (`staff.update`). No compensation fields. |
| Staff with a User login | My profile; Attendance Tracker Start/End shift; own Shift rows; own Hours / Time off create; own Payslip; propose contact/bank/emergency edits. |
| Other operational roles | No payroll screens. |

Permission keys stay technical (`payroll.run.approve`, `payroll.timesheet.read`). Screens use Payroll, Hours, Time off, Department shifts, Attendance Tracker, Cover, and Shift — never table identifiers like `staffPay`.
