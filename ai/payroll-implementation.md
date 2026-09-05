# Payroll Implementation

Source of truth for payroll design decisions and the target data model. ERD, PRD, `ai/schema.ts`, and `ai/base.md` should match this document.

Related: [prd.md](./prd.md), [ERD.md](./ERD.md), [schema.ts](./schema.ts), [base.md](./base.md), [pageSetup.md](./pageSetup.md), [helper-Functions.md](./helper-Functions.md).

---

## Decisions (locked)

| Topic | Decision |
|---|---|
| Jurisdiction / tax | Driven by **`Property.country`** (required ISO 3166-1 alpha-2 on property setup). Creating a property seeds that country’s statutory pack into `PropertyPayrollSettings` + `PayComponent` rows. Countries without a pack get the generic/configurable fallback. |
| MVP mode | **Native full cycle**: calculate pay, generate payslips, export a bank file, post GL, mark paid. |
| Who is paid | `staffs` rows only (this is the Employee entity). A linked `User` is optional. Casuals and contractors are staff without system access. There is **no** `employees` table. |
| Gratuity / tips | Defer pooling. Optional **manual** gratuity amount on a pay line. No POS tip pull, no hours/points pool. |
| Bar shifts vs timesheets | When a bar `Shift` is finalized, create a **draft** `Timesheet` for supervisor approval. Payroll hours still come only from **approved** timesheets. |
| People table | **`staffs` is the only people table.** Live app, housekeeping, POs, and inventory already use `Id<"staffs">`. Widen `staffs`; never create `employees`. Payroll FKs (`timesheets.employeeId`, etc.) are `v.id("staffs")`. |
| Leave | `LeaveType` + `LeaveEntry`. Approved **unpaid** leave prorates salaried period pay. Paid leave counts as regular hours (not OT) unless the type sets `countsTowardOvertime`. |
| Pay schedule | First-class `PaySchedule`. A `PayrollRun` is created from a schedule (period, cutoff, pay date). |
| Payment method | On Employee: `bank` \| `cash` \| `mobile_money` \| `check`. Bank fields required only when method is `bank`. |
| Holidays + premiums | `HolidayCalendar` + `Holiday` + `PremiumRule` (daily/weekly OT, night, weekend, public holiday). Single `overtimeMultiplier` is the fallback daily-OT rule only. |
| Compensation history | `EmployeeCompensation` with `effectiveFrom` / `effectiveTo`. Calculate reads the row effective on each day / period end. Employee rate fields are the current denormalized copy. |
| Maker ≠ checker | `PayrollRun.createdBy` and last calculator must not equal `approvedBy`. |
| Timesheet lock | Calculate locks included sheets (`lockedAt`, `lockedByRunId`). Edits rejected until the run returns to draft/recalculate (unlock then relock). |

---

## Scope

### In this phase

1. Employee master (pay type, payment method, bank fields when needed, optional User).
2. `PaySchedule`, holiday calendar, premium rules, and compensation history.
3. Timesheets (manual / CSV / draft-from-shift) with lock after calculate; leave types and entries.
4. Configurable + country-pack statutory `PayComponent`s.
5. Payroll run from a schedule: draft → calculated → approved → processed → paid, with maker ≠ checker.
6. Payslips, bank/CSV (and cash/mobile worksheet), balanced GL.
7. Labor cost % from **posted** payroll only.

### Deferred

- Country packs beyond those implemented at launch (unlisted countries use the generic fallback).
- Changing country after approved/paid payroll exists (blocked; requires a migration).
- Gratuity / tip pooling from POS or hours/points.
- Multi-property shared employees (one employee works at several properties).
- Hardware / biometric clocks.
- Processor APIs (Gusto, ADP, Paychex) — bank/CSV export is the MVP integration.
- Full PTO accrual engines (balances can be added later; MVP leave is typed entries that calculation honors).
- Split bank deposits / garnishments / loan ledgers.

---

## Target model

### Staff (Convex table `staffs`)

Required additions beyond today’s `staffs` row:

- `propertyId` (required; tenant scope)
- `userId` (optional)
- `employeeNumber` (unique per property)
- `payType`, `baseSalary`, `hourlyRate`: **current** denormalized copy of the open `EmployeeCompensation` row
- `payScheduleId` (optional; default is the property’s default `PaySchedule`)
- `paymentMethod`: `bank` | `cash` | `mobile_money` | `check` (bank fields required only for `bank`)
- `department`: closed set — `front-office` | `housekeeping` | `fnb` | `maintenance` | `finance` | `admin` | `other`
- `position`
- `employmentStatus`: `active` | `terminated` | `on-leave` (map current `employed` → `active`)
- Structured bank: `bankName`, `accountName`, `accountNumber` (encrypted), `routingCode`
- `taxId` (employee tax identifier; required when the country pack has statutory deductions)
- Keep existing locale fields (`stateOfOrigin`, `LGA`) as optional
- Soft delete: never hard-delete if timesheets or pay lines exist

`payType` rules:

- `hourly`: `hourlyRate` required; pay = approved hours × rates (+ components).
- `salary`: period pay from the compensation row(s) covering the period, prorated for mid-period changes and **approved unpaid leave**. Timesheets optional unless `mixed`.
- `mixed`: salary for the period plus overtime/hourly extras from approved timesheets.

### EmployeeCompensation

Dated pay record. Application-level: no overlapping open intervals per employee.

- `payType`, `baseSalary`, `hourlyRate`, optional `payScheduleId`
- `effectiveFrom` (required), `effectiveTo` (null = current)
- `changedBy` (User)
- Writing a new current row closes the previous (`effectiveTo = new.effectiveFrom`) and updates Employee’s denormalized rates
- Calculate snapshots `compensationIdUsed` on the pay line (use period-end row if one row covers the whole period; if rates change mid-period, blend by days)

### PaySchedule

- `propertyId`, `name`, `frequency` (`weekly` | `bi-weekly` | `monthly`)
- `anchorDate` (used to generate period start/end and pay date)
- `cutoffDaysBeforePayDate` (timesheets and leave approved after cutoff are excluded from this run)
- `isDefault`, `isActive`
- Country pack seeds one default schedule; admins may add more
- `PayrollRun` is created **from** a schedule (copies period, pay date, frequency, cutoff)

### LeaveType / LeaveEntry

- `LeaveType`: `code`, `name`, `paid` (bool), `countsTowardOvertime` (default false), `isActive`
- `LeaveEntry`: employee, type, `startDate` / `endDate`, `days` (or hours), `status` (`pending` | `approved` | `rejected`), `approvedBy` (User)
- Only **approved** entries affect pay
- Unpaid days reduce salaried / mixed salary portion (working-days in period)
- Paid leave: treat as regular hours for hourly/mixed; do not apply OT/premiums unless `countsTowardOvertime`

### HolidayCalendar / Holiday / PremiumRule

- One `HolidayCalendar` per property, seeded from the country pack (admins can add dates)
- `Holiday`: `date`, `name`, `isPaid`
- `PremiumRule`: `kind` (`daily_overtime` | `weekly_overtime` | `night` | `weekend` | `public_holiday`), `multiplier`, optional `startTime` / `endTime` (night window)
- Hour classification order: public holiday → night/weekend premium → daily/weekly OT. `PropertyPayrollSettings.overtimeMultiplier` is used only if no `daily_overtime` rule exists
- Premium pay is stored as `PayrollLineItem` kinds `overtime` or a `PREMIUM_*` earning code

### Timesheet

- One row per employee per work date in MVP (single clock-in/out).
- Application-level unique `(employeeId, workDate)`.
- `source`: `manual` | `csv` | `shift`
- `shiftId` optional (set when drafted from a bar shift)
- `payrollRunLineId` optional (set when included in a calculated run)
- `lockedAt`, `lockedByRunId`: set on calculate; mutations reject edits/status changes while locked
- Recalculate (run still `draft`/`calculated`): unlock those sheets, recompute, relock
- Returning a run to draft (before approve) unlocks
- Hours: classify with premium rules + OT at submit/approve time
- Only **unlocked, approved** sheets in the schedule cutoff window are pulled into a run
- Finalizing a bar shift creates a draft sheet (if none exists); does not overwrite submitted/approved/locked sheets

### Country → jurisdiction (property setup)

`Property.country` is **required** when an admin creates or first configures a property (ISO 3166-1 alpha-2, e.g. `NG`, `US`, `GB`).

On create:

1. Resolve a **jurisdiction pack** from a code catalog keyed by country (`NG` → Nigeria statutory pack, `US` → US federal pack, unknown → `generic`).
2. Insert `PropertyPayrollSettings` with the pack’s overtime limits, multiplier, and bank export format. Store `country` and `jurisdictionPack` as snapshots.
3. Seed default `PaySchedule`, `HolidayCalendar` + holidays, `PremiumRule`s, and `PayComponent` rows (`source = statutory`).
4. Admins may still add custom components, holidays, and extra schedules.

Country change after setup:

- Allowed only if the property has **no** `PayrollRun` in `approved` / `processed` / `paid`.
- If allowed: deactivate old statutory components, re-seed the new pack, update settings snapshots.
- If paid history exists: block the change in UI and mutation.

Pack catalog lives in application code (versioned), not a Convex table. Each pack can include `pack_formula` components (e.g. graduated PAYE) whose rates/bands sit on `params`. First launch packs: **`NG`** and **`generic`**; add others as needed. A property in an unsupported country still runs payroll with custom components only.

### Property payroll config

Per-property settings row, created during property setup:

- `country`, `jurisdictionPack` (snapshots from setup)
- Regular hours limit (daily and/or weekly) — pack default, overridable
- Overtime multiplier — fallback daily OT if no `PremiumRule` exists
- `defaultPayScheduleId`
- Bank export format (`generic_csv` MVP; pack may later specify a local layout)

### PayComponent

Named, reusable earning or deduction:

- `code` (e.g. `HOUSING`, `PAYE`, `PENSION`)
- `name`
- `kind`: `earning` | `allowance` | `deduction`
- `source`: `statutory` | `custom`
- `calculation`: `flat` | `percent_of_gross` | `pack_formula`
- `formulaKey` (when `pack_formula`, e.g. `ng_paye`)
- `params` (JSON: rates, bands — from the pack, updatable)
- `defaultAmount` / `defaultRate` (flat / percent)
- `glAccountId` (optional until chart of accounts is live)
- `isActive`

`EmployeePayComponent` overrides amount/rate or disables a component for one employee. Statutory rows cannot be deleted.

### PayrollRun

- Scoped to `propertyId`; created from a `PaySchedule` (`payScheduleId` required)
- Copies `payPeriodStart`, `payPeriodEnd`, `payDate`, `payFrequency`, cutoff from the schedule
- `runType`: `regular` (MVP; off-cycle/correction later)
- `status`: `draft` | `calculated` | `approved` | `processed` | `paid`
- `calculatedBy` (User) set on calculate
- `createdBy` / `approvedBy` are **User** ids
- **Maker ≠ checker**: `approvedBy` must not equal `createdBy` or `calculatedBy`
- Application-level: only one **open** run (`draft` or `calculated`) per property + overlapping period
- After `approved`, lines and amounts are immutable except via a reversal + new run

### PayrollRunLine

One employee per run. Application-level unique `(payrollRunId, employeeId)`.

Snapshot fields (so later employee edits do not rewrite history):

- `compensationIdUsed`, `payTypeUsed`, `hourlyRateUsed`, `baseSalaryUsed`, `overtimeMultiplierUsed`
- Hours and pay: `regularHours`, `overtimeHours`, `regularPay`, `overtimePay`
- `gratuityAmount` (manual only)
- `grossPay`, `totalDeductions`, `netPay`

Do **not** store deductions as JSON.

### PayrollLineItem

Child of `PayrollRunLine`:

- `kind`: `earning` | `allowance` | `overtime` | `gratuity` | `deduction`
- `code`, `label`, `amount`
- `payComponentId` optional
- `glAccountId` optional

Gross = sum of earning/allowance/overtime/gratuity items.  
Deductions = sum of deduction items.  
Net = gross − deductions.

### Payslip

- One per `PayrollRunLine`
- Immutable snapshot payload (amounts, items, employee name, period)
- `documentId` optional (generated PDF in Document storage)
- Generated on transition to `approved` (or `processed` if generation is async)

### PayrollExport

- `payrollRunId`, `format` (`generic_csv` | `bank_file` | `cash_sheet`)
- Bank/CSV includes `paymentMethod = bank` only; cash and mobile_money go on `cash_sheet`
- `status`: `pending` | `generated` | `downloaded` | `failed`
- `fileUrl` / `documentId`
- One or more exports allowed; the run can still be marked `paid` after a successful export

---

## Run lifecycle

Enforce in mutations, not only in UI:

1. **Create (draft)** — from a `PaySchedule`. Reject if another open run overlaps the period for the property.
2. **Calculate** — include employees on this schedule who are `active` (or `terminated`/`on-leave` with approved hours or unpaid leave) in the period. Pull **unlocked, approved** timesheets and **approved** leave in range **on or before cutoff**. Apply compensation history, unpaid-leave proration, premium/OT rules, then pay components. Write lines + items; set `payrollRunLineId` and **lock** included timesheets. Set `calculatedBy`. Idempotent while `draft` or `calculated`.
3. **Approve** — reject if `approvedBy === createdBy` or `approvedBy === calculatedBy`. Freeze lines. Create `Payslip` rows. Create one balanced `JournalEntry`. Status → `approved`. Locked timesheets stay locked.
4. **Process** — generate `PayrollExport` bank/CSV + cash_sheet. Status → `processed`.
5. **Paid** — record `Payment` (`paymentType = payroll`) and optional bank confirmation `Document`. Status → `paid`.

Recalculate only in `draft` / `calculated`: unlock included sheets, recompute, relock. After approve, timesheet edits stay rejected.

---

## GL posting (balanced template)

Use run totals, not invented extras. If the country pack includes **employer** contributions (e.g. employer pension), add matching debit-to-expense and credit-to-payable lines from those line items.

Example (employee-only withholdings): gross `45000`, deductions `9000`, net `36000`.

| Account | Debit | Credit |
|---|---:|---:|
| Labor expense (by department if accounts exist, else one labor account) | 45000 | |
| Employee deductions payable (or a single withholdings liability) | | 9000 |
| Wages payable (or Cash if paid immediately) | | 36000 |

Debits must equal credits. Do not debit a payable for withholdings.

Labor Cost % for reports: sum `PayrollRun.totalGrossPay` where status is `approved`, `processed`, or `paid` and the period overlaps the report. Draft/calculated runs are excluded. After posting, GL labor expense and these totals should match; GL is the audit source if they diverge.

---

## Bar shift → timesheet

When `shifts.isFinalized` becomes true:

1. Resolve `Employee` by `userId` (skip if the shift user has no employee record).
2. Compute work date from property timezone + shift start.
3. If no timesheet exists for `(employeeId, workDate)`, insert `source = shift`, `status = draft`, clock times from the shift, hours from start/end minus a default break if configured.
4. If a draft from this shift already exists, update hours from the finalized shift.
5. If a submitted/approved/rejected/**locked** sheet already exists for that date, do not overwrite; leave a note or skip.

Supervisors still approve the timesheet before it can be paid.

---

## Existing code migration

Live Convex `staffs` today: no `propertyId`, single `salary`, `employed`/`terminated`, hard delete, `role` as a free-text string.

Widen-migrate-narrow **`staffs` only**. Do not add an `employees` table. Payroll field names like `employeeId` store `Id<"staffs">`.

1. Add `country` on existing properties (admin must set it before first payroll run; then seed the pack).
2. Add new fields on `staffs` as **optional**; backfill `propertyId` (single-property default if needed).
3. Keep `employed` in the status union until rows are mapped to `active`; then drop `employed`.
4. Map `salary` → `baseSalary`; set `payType = salary` unless an hourly rate is later entered. Keep `salary` optional until backfill.
5. Stop `removeStaff` hard deletes; set `terminated` + `terminationDate`.
6. Keep `/admin/staff` and `api.staff.*`. New payroll modules query `staffs`.
7. Index `(propertyId, employeeNumber)` and `(propertyId, employmentStatus)`.

---

## Build order

1. Require `Property.country` on create/setup; seed settings, default `PaySchedule`, holiday calendar, premium rules, and statutory `PayComponent`s (`NG` + `generic` first).
2. Widen `staffs` (property, payment method, compensation history, soft delete). No `employees` table.
3. Timesheets + approval + CSV + draft-from-shift + **lock on calculate**.
4. Leave types/entries; custom pay components.
5. Payroll run from schedule + lines/items (compensation + premium snapshots).
6. Approve with **maker ≠ checker** → payslip + GL.
7. Bank/CSV + cash_sheet export → mark paid.

UI pages: see [pageSetup.md](./pageSetup.md) payroll section.

---

## Permissions

New granular permissions (see [RBAC.md](./RBAC.md)):

- `payroll.employee.read` / `create` / `update`
- `payroll.timesheet.read` / `create` / `update` / `approve`
- `payroll.leave.read` / `create` / `approve`
- `payroll.run.read` / `create` / `calculate` / `approve` / `export` / `mark_paid`
- `payroll.payslip.read`
- `payroll.settings.update`

`payroll.run.approve` must be enforced as maker ≠ checker in the mutation, not only in the UI.

HR Manager and Finance Manager: full payroll (two different users still required to create/calculate vs approve). Supervisors: own-team timesheet and leave approve. Employees with login: own timesheet/leave create and own payslip read. Operational staff: none on runs.
