# Payroll Implementation

Source of truth for payroll design decisions and the target data model. ERD, PRD, `ai/schema.ts`, and `ai/base.md` should match this document.

Related: [prd.md](./prd.md), [ERD.md](./ERD.md), [schema.ts](./schema.ts), [base.md](./base.md), [pageSetup.md](./pageSetup.md), [helper-Functions.md](./helper-Functions.md), [payroll-pages-guide.md](./payroll-pages-guide.md).

---

## Decisions (locked)

| Topic | Decision |
|---|---|
| Jurisdiction / tax | Driven by **`Property.country`** (required ISO 3166-1 alpha-2 on property setup). Creating a property seeds that country’s statutory pack into Payroll settings + Pay item types. Countries without a pack get the generic/configurable fallback. |
| MVP mode | **Native full cycle**: Prepare pay, generate Payslips, Download payment files, post GL, Mark as paid. |
| Who is paid | `staffs` rows only (this is the Employee entity). A linked `User` is optional. Casuals and contractors are staff without system access. There is **no** `employees` table. |
| Gratuity / tips | Defer pooling. Optional **manual** gratuity amount on a Pay item. No POS tip pull, no hours/points pool. |
| Shifts vs Hours | Department shifts define default hours. Attendance Tracker sign-out (or finalizing an ad-hoc `Shift`) creates a **draft** Hours row (`hours`, `source = shift`). Cover changes who should attend that day and never rewrites Hours. Hours screens live under Shift Management. Payroll still pays only **approved** Hours. |
| People table | **`staffs` is the only people table.** Live app, housekeeping, POs, and inventory already use `Id<"staffs">`. Widen `staffs`; never create `employees`. Payroll FKs (`hours.employeeId`, etc.) are `v.id("staffs")`. |
| Time off | Time-off type + Time off. Approved **unpaid** Time off prorates salaried period pay. Paid Time off counts as regular hours (not OT) unless the type sets `countsTowardOvertime`. |
| Pay cycle | First-class Pay cycle. A Payroll is created from a cycle (period, cutoff, pay date). |
| Payment method | On Employee: `bank` \| `cash` \| `mobile_money` \| `check`. Bank fields required only when method is `bank`. |
| Holidays + extra pay rules | Holidays + extra pay rules (daily/weekly OT, night, weekend, public holiday). Single `overtimeMultiplier` is the fallback daily-OT rule only. |
| Pay history | Pay history with `effectiveFrom` / `effectiveTo`. Prepare pay reads the row effective on each day / period end. Employee rate fields are the current denormalized copy. |
| Maker ≠ checker | Payroll `createdBy` and last calculator must not equal `approvedBy`. |
| Hours lock | Prepare pay locks included Hours (`lockedAt`, `lockedByPayrollId`). Edits rejected until the payroll returns to Draft / Recalculate (unlock then relock). |
| User-facing names | Screens, docs, and Convex tables use the names in [User-facing names](#user-facing-names). |

---

## User-facing names

Use these labels in navigation, headings, buttons, and empty states. Do not show table identifiers (`staffPay`, `payItems`, `timeOff`) to users.

| In the app, say | Convex table | Interface |
|---|---|---|
| **Payroll** | `payrolls` | `Payroll` |
| **Staff pay** | `staffPay` | `StaffPay` |
| **Pay item** | `payItems` | `PayItem` |
| **Payslip** | `payslips` | `Payslip` |
| **Payment file** | `paymentFiles` | `PaymentFile` |
| **Pay item type** | `payItemTypes` | `PayItemType` |
| **This person’s pay items** | `staffPayItems` | `StaffPayItem` |
| **Pay cycle** | `payCycles` | `PayCycle` |
| **Pay rate** / **Pay history** | `payHistory` | `PayHistory` |
| **Payroll settings** | `payrollSettings` | `PayrollSettings` |
| **Hours** | `hours` | `Hours` |
| **Department shift** | `shiftTemplates` | `ShiftTemplate` |
| **Roster day** | `rosterSlots` | `RosterSlot` |
| **Time off** | `timeOff` | `TimeOff` |
| **Time-off type** | `timeOffTypes` | `TimeOffType` |
| **Extra pay rules** | `extraPayRules` | `ExtraPayRule` |
| **Holidays** | `holidays` / `holidayCalendars` | `Holiday` / `HolidayCalendar` |

**Payroll statuses** (user copy):

| Status | Show as |
|---|---|
| draft | Draft |
| calculated | Ready to review |
| approved | Approved |
| processed | Payment files ready |
| paid | Paid |

**Buttons / actions:**

| Mutation | Button |
|---|---|
| create run | Start payroll |
| calculate | Prepare pay |
| recalculate | Recalculate |
| approve | Approve payroll |
| process / export | Download payment files |
| mark paid | Mark as paid |

Example heading: “Payroll 1–14 July” with a table of **Staff pay**, not `payrolls` / `staffPay`.

---

## Scope

### In this phase

1. Employee master (pay type, payment method, bank fields when needed, optional User).
2. Pay cycle, Holidays, extra pay rules, and Pay history.
3. Hours (manual / CSV / draft-from-shift) with lock after Prepare pay; Time-off types and Time off.
4. Configurable + country-pack statutory Pay item types.
5. Payroll from a Pay cycle: Draft → Ready to review → Approved → Payment files ready → Paid, with maker ≠ checker.
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
- `payType`, `baseSalary`, `hourlyRate`: **current** denormalized copy of the open Pay history row
- `payCycleId` (optional; default is the property’s default Pay cycle)
- `paymentMethod`: `bank` | `cash` | `mobile_money` | `check` (bank fields required only for `bank`)
- `department`: closed set — `front-office` | `housekeeping` | `fnb` | `maintenance` | `finance` | `admin` | `other`
- `position`
- `employmentStatus`: `active` | `terminated` | `on-leave` (map current `employed` → `active`)
- Structured bank: `bankName`, `accountName`, `accountNumber` (encrypted), `routingCode`
- `taxId` (employee tax identifier; required when the country pack has statutory deductions)
- Keep existing locale fields (`stateOfOrigin`, `LGA`) as optional
- Soft delete: never hard-delete if Hours or Staff pay exist

`payType` rules:

- `hourly`: `hourlyRate` required; pay = approved Hours × rates (+ Pay item types).
- `salary`: period pay from the Pay history row(s) covering the period, prorated for mid-period changes and **approved unpaid Time off**. Hours optional unless `mixed`.
- `mixed`: salary for the period plus overtime/hourly extras from approved Hours.

### Pay history
Schema table: `payHistory`. Interface: `PayHistory`.

Dated pay record. Application-level: no overlapping open intervals per employee.

- `payType`, `baseSalary`, `hourlyRate`, optional `payCycleId`
- `effectiveFrom` (required), `effectiveTo` (null = current)
- `changedBy` (User)
- Writing a new current row closes the previous (`effectiveTo = new.effectiveFrom`) and updates Employee’s denormalized rates
- Prepare pay snapshots `payHistoryIdUsed` on Staff pay (use period-end row if one row covers the whole period; if rates change mid-period, blend by days)

### Pay cycle
Schema table: `payCycles`. Interface: `PayCycle`.

- `propertyId`, `name`, `frequency` (`weekly` | `bi-weekly` | `monthly`)
- `anchorDate` (used to generate period start/end and pay date)
- `cutoffDaysBeforePayDate` (Hours and Time off approved after cutoff are excluded from this payroll)
- `isDefault`, `isActive`
- Country pack seeds one default Pay cycle; admins may add more
- A Payroll is created **from** a Pay cycle (copies period, pay date, frequency, cutoff)

### Time-off type / Time off
Schema tables: `timeOffTypes`, `timeOff`. Interfaces: `TimeOffType`, `TimeOff`.

- Time-off type: `code`, `name`, `paid` (bool), `countsTowardOvertime` (default false), `isActive`
- Time off: employee, type, `startDate` / `endDate`, `days` (or hours), `status` (`pending` | `approved` | `rejected`), `approvedBy` (User)
- Only **approved** Time off affects pay
- Unpaid days reduce salaried / mixed salary portion (working-days in period)
- Paid Time off: treat as regular hours for hourly/mixed; do not apply OT / extra pay rules unless `countsTowardOvertime`

### Holidays / Extra pay rules
Schema tables: `holidayCalendars`, `holidays`, `extraPayRules`. Interfaces: `HolidayCalendar`, `Holiday`, `ExtraPayRule`.

- One Holidays calendar per property, seeded from the country pack (admins can add dates)
- Holiday: `date`, `name`, `isPaid`
- Extra pay rule: `kind` (`daily_overtime` | `weekly_overtime` | `night` | `weekend` | `public_holiday`), `multiplier`, optional `startTime` / `endTime` (night window)
- Hour classification order: public holiday → night/weekend extra pay → daily/weekly OT. Payroll settings `overtimeMultiplier` is used only if no `daily_overtime` rule exists
- Extra pay is stored as Pay item kinds `overtime` or a `PREMIUM_*` earning code

### Hours
Schema table: `hours`. Interface: `Hours`.

- One row per employee per work date in MVP (single clock-in/out).
- Application-level unique `(employeeId, workDate)`.
- `source`: `manual` | `csv` | `shift`
- `shiftId` optional (set when drafted from a bar shift)
- `staffPayId` optional (set when included in a payroll after Prepare pay)
- `lockedAt`, `lockedByPayrollId`: set on Prepare pay; mutations reject edits/status changes while locked
- Recalculate (payroll still `draft`/`calculated`): unlock those Hours, recompute, relock
- Returning a payroll to Draft (before Approve payroll) unlocks
- Hours: classify with extra pay rules + OT at submit/approve time
- Only **unlocked, approved** Hours in the Pay cycle cutoff window are pulled into a payroll
- Finalizing a shift creates a draft Hours row (if none exists); does not overwrite submitted/approved/locked Hours

### Country → jurisdiction (property setup)

`Property.country` is **required** when an admin creates or first configures a property (ISO 3166-1 alpha-2, e.g. `NG`, `US`, `GB`).

On create:

1. Resolve a **jurisdiction pack** from a code catalog keyed by country (`NG` → Nigeria statutory pack, `US` → US federal pack, unknown → `generic`).
2. Insert Payroll settings with the pack’s overtime limits, multiplier, and bank export format. Store `country` and `jurisdictionPack` as snapshots.
3. Seed default Pay cycle, Holidays, extra pay rules, and Pay item types (`source = statutory`).
4. Admins may still add custom components, holidays, and extra schedules.

Country change after setup:

- Allowed only if the property has **no** Payroll in `approved` / `processed` / `paid`.
- If allowed: deactivate old statutory components, re-seed the new pack, update settings snapshots.
- If paid history exists: block the change in UI and mutation.

Pack catalog lives in application code (versioned), not a Convex table. Each pack can include `pack_formula` components (e.g. graduated PAYE) whose rates/bands sit on `params`. First launch packs: **`NG`** and **`generic`**; add others as needed. A property in an unsupported country still runs payroll with custom components only.

### Payroll settings
Schema table: `payrollSettings`. Interface: `PayrollSettings`.

Per-property settings row, created during property setup:

- `country`, `jurisdictionPack` (snapshots from setup)
- Regular hours limit (daily and/or weekly) — pack default, overridable
- Overtime multiplier — fallback daily OT if no extra pay rule exists
- `defaultPayCycleId`
- Bank export format (`generic_csv` MVP; pack may later specify a local layout)

### Pay item type
Schema table: `payItemTypes`. Interface: `PayItemType`.

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

This person’s pay items override amount/rate or disable a Pay item type for one employee. Statutory rows cannot be deleted.

### Payroll
Schema table: `payrolls`. Interface: `Payroll`.

- Scoped to `propertyId`; created from a Pay cycle (`payCycleId` required)
- Copies `payPeriodStart`, `payPeriodEnd`, `payDate`, `payFrequency`, cutoff from the schedule
- `runType`: `regular` (MVP; off-cycle/correction later)
- `status`: `draft` | `calculated` | `approved` | `processed` | `paid`
- `calculatedBy` (User) set on Prepare pay
- `createdBy` / `approvedBy` are **User** ids
- **Maker ≠ checker**: `approvedBy` must not equal `createdBy` or `calculatedBy`
- Application-level: only one **open** payroll (`draft` or `calculated`) per property + overlapping period
- After `approved`, lines and amounts are immutable except via a reversal + new run

### Staff pay
Schema table: `staffPay`. Interface: `StaffPay`.

One employee per payroll. Application-level unique `(payrollId, employeeId)`.

Snapshot fields (so later employee edits do not rewrite history):

- `payHistoryIdUsed`, `payTypeUsed`, `hourlyRateUsed`, `baseSalaryUsed`, `overtimeMultiplierUsed`
- Hours and pay: `regularHours`, `overtimeHours`, `regularPay`, `overtimePay`
- `gratuityAmount` (manual only)
- `grossPay`, `totalDeductions`, `netPay`

Do **not** store deductions as JSON.

### Pay item
Schema table: `payItems`. Interface: `PayItem`.

Child of Staff pay:

- `kind`: `earning` | `allowance` | `overtime` | `gratuity` | `deduction`
- `code`, `label`, `amount`
- `payItemTypeId` optional
- `glAccountId` optional

Gross = sum of earning/allowance/overtime/gratuity items.  
Deductions = sum of deduction items.  
Net = gross − deductions.

### Payslip
Schema table: `payslips`. Interface: `Payslip`.

- One per Staff pay
- Immutable snapshot payload (amounts, items, employee name, period)
- `documentId` optional (generated PDF in Document storage)
- Generated on transition to `approved` (or `processed` if generation is async)

### Payment file
Schema table: `paymentFiles`. Interface: `PaymentFile`.

- `payrollId`, `format` (`generic_csv` | `bank_file` | `cash_sheet`)
- Bank/CSV includes `paymentMethod = bank` only; cash and mobile_money go on `cash_sheet`
- `status`: `pending` | `generated` | `downloaded` | `failed`
- `fileUrl` / `documentId`
- One or more exports allowed; the run can still be marked `paid` after a successful export

---

## Payroll lifecycle

Enforce in mutations, not only in UI. Buttons: Start payroll → Prepare pay → Recalculate → Approve payroll → Download payment files → Mark as paid.

1. **Start payroll (Draft)** — from a Pay cycle. Reject if another open payroll overlaps the period for the property.
2. **Prepare pay** — include employees on this Pay cycle who are `active` (or `terminated`/`on-leave` with approved Hours or unpaid Time off) in the period. Pull **unlocked, approved** Hours and **approved** Time off in range **on or before cutoff**. Apply Pay history, unpaid Time off proration, extra pay / OT rules, then Pay item types. Write Staff pay + Pay items; set `staffPayId` and **lock** included Hours. Set `calculatedBy`. Idempotent while `draft` or `calculated`.
3. **Approve payroll** — reject if `approvedBy === createdBy` or `approvedBy === calculatedBy`. Freeze Staff pay. Create Payslip rows. Create one balanced `JournalEntry`. Status → `approved`. Locked Hours stay locked.
4. **Download payment files** — generate Payment files (bank/CSV + cash_sheet). Status → `processed`.
5. **Mark as paid** — record `Payment` (`paymentType = payroll`) and optional bank confirmation `Document`. Status → `paid`.

Recalculate only in `draft` / `calculated`: unlock included Hours, recompute, relock. After Approve payroll, Hours edits stay rejected.

---

## GL posting (balanced template)

Use payroll totals, not invented extras. If the country pack includes **employer** contributions (e.g. employer pension), add matching debit-to-expense and credit-to-payable lines from those Pay items.

Example (employee-only withholdings): gross `45000`, deductions `9000`, net `36000`.

| Account | Debit | Credit |
|---|---:|---:|
| Labor expense (by department if accounts exist, else one labor account) | 45000 | |
| Employee deductions payable (or a single withholdings liability) | | 9000 |
| Wages payable (or Cash if paid immediately) | | 36000 |

Debits must equal credits. Do not debit a payable for withholdings.

Labor Cost % for reports: sum Payroll `totalGrossPay` where status is `approved`, `processed`, or `paid` and the period overlaps the report. Draft / Ready to review payrolls are excluded. After posting, GL labor expense and these totals should match; GL is the audit source if they diverge.

---

## Shift → Hours

Department **shift templates** define default hours per department. On onboard, staff inherit the department default. **Attendance Tracker** Start shift / End shift creates the day’s `shifts` row from that assignment (actual clock time, not template start). Logging in does not start the shift. **Cover** changes `rosterSlots.workingEmployeeId` for that date only and never rewrites Hours. Cover is rejected if the scheduled person already has a started shift or Hours that day, or if the covering person already started a shift.

Ad-hoc Shifts remain available for unscheduled sessions. `barId` is required only for F&B. Hours screens live under Shift Management; payroll still pays only **approved** Hours.

When `shifts.isFinalized` becomes true (via Attendance Tracker End shift or `finalizeShift`):

1. Resolve `Employee` from `employeeId` (or `userId` on older rows). If there is no staff record, finalize the shift but return a warning — do not silently skip.
2. Compute work date from the shift calendar date (`YYYY-MM-DD` as UTC midnight). Overnight shifts (end ≤ start) add 24 hours.
3. If no Hours exist for `(employeeId, workDate)`, insert `source = shift`, `status = draft`, clock times from the shift, hours from start/end minus a 30-minute default break, split with the daily OT limit.
4. If a draft Hours row from a shift already exists and is unlocked, update hours from the finalized shift.
5. If a submitted/approved/rejected/**locked** Hours row already exists for that date, do not overwrite; tell the operator.
6. F&B shifts also finalize that shift’s `userStockLogs`.

Supervisors still approve the Hours before they can be paid. Manual Hours (no shift) remain allowed.

---

## Existing code migration

Live Convex `staffs` today: no `propertyId`, single `salary`, `employed`/`terminated`, hard delete, `role` as a free-text string.

Widen-migrate-narrow **`staffs` only**. Do not add an `employees` table. Payroll field names like `employeeId` store `Id<"staffs">`.

1. Add `country` on existing properties (admin must set it before first Payroll; then seed the pack).
2. Add new fields on `staffs` as **optional**; backfill `propertyId` (single-property default if needed).
3. Keep `employed` in the status union until rows are mapped to `active`; then drop `employed`.
4. Map `salary` → `baseSalary`; set `payType = salary` unless an hourly rate is later entered. Keep `salary` optional until backfill.
5. Stop `removeStaff` hard deletes; set `terminated` + `terminationDate`.
6. Keep `/admin/staff` and `api.staff.*`. New payroll modules query `staffs`.
7. Index `(propertyId, employeeNumber)` and `(propertyId, employmentStatus)`.

---

## Build order

1. Require `Property.country` on create/setup; seed Payroll settings, default Pay cycle, Holidays, extra pay rules, and statutory Pay item types (`NG` + `generic` first).
2. Widen `staffs` (property, payment method, Pay history, soft delete). No `employees` table.
3. Hours + approval + CSV + draft-from-shift (property-wide) + **lock on Prepare pay**.
4. Time-off types / Time off; custom Pay item types.
5. Payroll from a Pay cycle + Staff pay / Pay items (Pay history + extra pay snapshots).
6. Approve payroll with **maker ≠ checker** → Payslip + GL.
7. Download payment files (bank/CSV + cash_sheet) → Mark as paid.

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

HR Manager and Finance Manager: full payroll (two different users still required to Start payroll / Prepare pay vs Approve payroll). Supervisors: own-team Hours and Time off approve. Employees with login: own Hours / Time off create and own Payslip read. Operational staff: none on payrolls.
