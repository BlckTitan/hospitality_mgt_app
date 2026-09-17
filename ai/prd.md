# Hospitality Management Suite PRD

## Project Overview

- **Product name**: Hospitality Management Suite (working title)
- **Project Vision**: To develop a comprehensive software that empowers hospitality businesses (hotels, motels, resorts, B&Bs) to streamline operations, ensure profitability, maximize revenue and ultimately ensure efficient financial management. Hospitality manager will serve as a central hub for managing reservation, front-desk activities, housekeeping, organizational billing (utilities and subscriptions), and guest relations.
- **Purpose**: Provide a finance-first operations platform for hospitality businesses—especially small/medium hotels, guest houses, and boutique resorts—so they can monitor profitability, automate accounting workflows, and coordinate operational teams from a single source of truth.
- **Primary value props**: real-time financial visibility, user-friendly cross-platform experience, automated compliance-ready records, and streamlined integrations with POS, payroll, and booking channels.

## Problem Statement
 
Hospitality operators juggle siloed systems for reservations, POS, payroll, procurement, and accounting. Manual reconciliation leads to delayed insights, inaccurate cash-flow forecasting, compliance risk, and lost revenue opportunities. Existing suites tend to prioritize front-desk workflows rather than end-to-end financial stewardship.

## Goals & Success Metrics

- **G1**: Deliver live P&L dashboards and drill-down reports spanning rooms, Food & Beverage, maintenance, payroll, and utilities.
  - *KPI*: <2 minute latency between transaction ingest and dashboard update.
- **G2**: Reduce manual accounting workload.
  - *KPI*: ≥60% of journal entries auto-generated via rules and integrations.
- **G3**: Improve operational coordination.
  - *KPI*: 90% of tasks (housekeeping, maintenance, inventory restock/putaway) completed within SLA using in-app workflows. Skipped/cancelled tasks are excluded. See Task Assignment.
- **G4**: Ensure compliance & audit readiness.
  - *KPI*: Immutable audit logs for 100% financial events; SOC 2 aligned controls.
- **G5**: Accelerate onboarding & adoption.
  - *KPI*: New property live within 5 business days; ≥85% CSAT for support.7

## Target Users & Personas

- **Hotel Owners / General Managers**: need holistic business visibility, profitability tracking, and forecasting.
- **HR Managers**: own the staff directory, onboarding, employment lifecycle, contracts/IDs, and self-service approvals. They do not grant login Roles (that stays Users & Roles).
- **Finance & Accounting Teams**: own GL, AP/AR, payroll, taxes, vendor payments. They may view staff compensation (salary, tax ID, bank) but not necessarily edit identity.
- **Front Office & Reservations Leads**: manage room inventory, rates, promotions, upsell flows.
- **Housekeeping & Maintenance Supervisors**: schedule tasks, monitor completion, log expenses.
- **Food & Beverage Managers & Storekeepers**: track menu performance, inventory, restocking, wastage.
- **Vendors & External Auditors (view-only)**: require secure document access and status updates.

## Scope

### In Scope (MVP+)

1. **Room Management**
   - Native reservation management system for booking creation, modifications, cancellations, and check-in/check-out workflows (for businesses without existing PMS).
   - PMS integrations for reservation ingestion and synchronization (for businesses with existing PMS).
   - Room inventory, status, rates, occupancy forecasts.
   - Revenue tracking: room sales, discounts, net revPAR metrics.
   - Housekeeping assignments, checklists, supplies usage (lead + helpers; see Task Assignment).
2. **Food & Beverage Management**
   - Menu catalog, recipe costing, upsell recommendations.
   - Native POS functionality for order taking, payment processing, and sales tracking (for businesses without existing POS systems).
   - POS integrations for sales ingestion (for businesses with existing POS systems).
   - Inventory counts, reorder points, supplier management, restocking workflows (restock/putaway are assignable tasks; purchase orders stay procurement — see Task Assignment).
   - Document management for inventory purchases: supplier invoices, delivery receipts, and payment confirmations must be uploaded and linked to purchase orders.
3. **Staff Management**
   - Property-scoped people master (`staffs` only — no `employees` table). Existing `/admin/staff` and `Id<"staffs">` FKs stay.
   - Directory, onboard, terminate, optional User login link, employment type, manager line, documents, onboarding checklist, and self-service profile.
   - Compensation is edited as Pay history on the staff record; salary/tax/bank are visible only to Administrator, Director, General Manager, HR Manager, and Finance Manager.
4. **Payroll Management**
   - Pay types (hourly / salary / mixed), pay rates, Hours, configurable allowances and deductions.
   - Native Payroll: Prepare pay, Approve payroll, generate Payslips, Download payment files, post GL, Mark as paid.
   - Implementation decisions and target model: `ai/payroll-implementation.md`.
5. **Maintenance Management**
   - Asset registry, preventive schedules, work orders, cost tracking, and purchased parts (`maintenanceOrderParts`; staff lead + optional helpers and optional vendor; see Task Assignment).
6. **Billing, Expenses & Financial Management**
   - **Organizational billing** (`billAccounts` + `billPeriods`): admin configures recurring property bills (electricity, water, gas, internet, cable, waste, local government, other) with a cadence (`weekly` | `monthly` | `annually`). A daily cron opens the current expected period. Staff capture the invoice (amount, meters if metered, bill PDF). Mark as paid records a `Payment` (`referenceType = PropertyBill`) and inserts one `Expense` (`status = paid`) after a duplicate check. There is **no** separate `UtilityBill` table.
   - **Expenses this ship**: read-only list of paid expenses (including billed rows). Manual expense create/approve is later. Do not enter the same invoice as both a period bill and an ad-hoc expense.
   - **Documents**: bill PDF required before mark-paid; receipt stored on the period (`billDocuments`, Convex `_storage`).
   - General inventory (linen, amenities, cleaning supplies, spare parts).
   - **Purchase documentation**: All inventory purchases require supplier invoices, delivery notes, and payment receipts to be uploaded and linked.
7. **Reporting & Analytics**
   - Daily flash reports, monthly statements, yearly trend analysis.
   - Custom report builder with filters by department, cost center, channel.
   - Real-time dashboards for cash flow, occupancy, ADR, labor cost %, food cost %, etc.
8. **Platform Foundations**
   - Role-based access control, audit logs, SOC2-ready security controls.
   - **User onboarding**: new users are created only via Clerk invitation. The admin selects a defined Role and Property; on accept, the system writes a `UserRole` row. Existing users cannot be re-invited — additional roles or properties are assigned on the user record.
   - Multi-channel accessibility: responsive web, optimized tablet/mobile web, future native apps.
   - Native POS/PMS capabilities: built-in reservation management and point-of-sale functionality for businesses operating without existing systems.
   - Integrations: PMS (e.g., Cloudbeds), Online Travel Agencies, POS, accounting suites (QuickBooks, Xero), payment gateways (for businesses with existing systems).
   - **Document Management System**: Centralized storage for invoices, receipts, and payment evidence with OCR processing, verification workflows, and compliance-ready audit trails.
   - Support & onboarding: guided setup wizard, embedded help center, chat support queue.

### Out of Scope (initial release)

- Full-blown booking engine (only ingest existing reservations or use native reservation management).
- Event/conference management.
- Native mobile apps (web responsive only initially).
- Dynamic pricing engine (pull rates from external partners for now).
- Country payroll packs that are not implemented at launch (those properties use generic/custom components only). Changing `Property.country` after approved/paid payroll is blocked.
- Gratuity / tip pooling from POS or hours/points (manual gratuity on a pay line is in scope).
- Multi-property shared employees (one person employed at several properties). Extra UserRoles on other properties are access-only, not a second Staff row.
- GDPR anonymize/erase of staff with payroll history.
- Hardware / biometric time clocks.
- Direct payroll processor APIs (Gusto, ADP, Paychex) — bank/CSV export is the MVP path.
- Cycle counts as assignable tasks (stock takes stay inventory operations, not Task Assignment).
- A generic `Task` table as the work record (housekeeping, maintenance, and inventory keep separate work entities).
- Task duration posting to Hours / payroll (duration on the work record is productivity-only).
- SMS/WhatsApp task notifications (Twilio); in-app only this phase.
- Bar `reorderAlerts` / beverage restock as Task Assignment (bar keeps its own alert flow; restock tasks use `inventoryItems`).
- Guest folio / in-stay guest invoicing (organizational billing only this phase).
- Partial bill payments, refunds, and GL journal posting from billing (cash `Expense` + `Payment` only; `chartOfAccounts` is not live).
- Billing anomaly-alert and contract-reminder jobs (`contractEndDate` / `expectedAmount` are stored only).
- Manual expense create/approve UI (billed expenses appear read-only after mark-paid).
- Legacy `invoices` / `invoiceItems` / `receipts` / `sales` tables (unused; do not attach billing to them).

## Functional Requirements

### Room Management

- **Native Reservation Management** (for businesses without PMS):
  - Guest profile management and history.
  - Reservation creation, modification, cancellation workflows.
  - Check-in/check-out processes with payment collection.
  - Channel management for direct bookings.
  - Rate management and promotional pricing.
- **PMS Integration** (for businesses with existing PMS):
  - Automated reservation synchronization via API/webhooks.
  - Bidirectional data flow for rates and availability.
- CRUD for rooms, room types, amenities, rate plans.
- Calendar view of occupancy, maintenance blocks, housekeeping status.
- Revenue module aggregating bookings by source, promotions, taxes.
- Housekeeping workflow with task templates, productivity time tracking, and supply usage deduction from inventory. Assignment, SLA, auto-create, and completion rules: Task Assignment.
- Room status stays `available | occupied | out-of-order | maintenance`. Front desk infers unreadiness from **open housekeeping tasks** on the room (do not add `dirty` / `cleaning`). Completing a checkout-clean task sets `Room.lastCleanedAt`.

### Food & Beverage Management

- **Native POS Functionality** (for businesses without POS):
  - Order entry interface for table service, bar, room service, and takeout.
  - Payment processing integration (card, cash, digital wallets).
  - Receipt generation and printing.
  - Table management and order routing.
  - Real-time order status tracking.
- **POS Integration** (for businesses with existing POS):
  - Sales ingestion via API/webhooks with mapping to GL accounts.
  - Menu synchronization and price updates.
- Recipe builder linking ingredients to inventory SKUs, auto-cost updates.
- Inventory cycle counts, variance detection, reorder automation, supplier price history. Restock (below reorder point) and putaway (PO received) are assignable inventory tasks; the purchase order itself is not assigned — see Task Assignment.
- **Inventory Purchase Documentation**: All inventory purchases require:
  - Supplier invoices (original or digital copies)
  - Delivery notes/receipts
  - Payment confirmations (bank statements, payment receipts)
  - Documents must be linked to purchase orders for three-way matching (PO, invoice, receipt).
- Upsell prompts (e.g., breakfast add-ons) at check-in/checkout + F&B dashboards for attach rates.

### Staff Management

- **People master** (`staffs` only): property-scoped employment records. Job title is the staff `role` enum; optional free-text `position`. Platform **UserRole** is login permission and is not synced from job title.
- **User vs Staff**: a User is created only via Clerk invite. Linking a login requires an existing UserRole on that property. One Staff row per User globally; extra property logins are access-only. Casuals/contractors may have no login.
- **Employment type** (required): `full-time` | `part-time` | `casual` | `contractor`.
- **Employee number**: required, auto-generated per property (`{PREFIX}-{NNNN}`), immutable after create.
- **Status**: `active` | `terminated`. On-leave is derived from approved Time off overlapping today, not a stored status.
- **Terminate**: set status + date; hide from default lists; never hard-delete. Unlink `userId` so Attendance Tracker cannot start; the User and other UserRoles remain. Unassign that person from open `taskAssignments`; if they were lead, the work stays `pending` with no lead until a supervisor assigns.
- **Team**: `managerId` on Staff (same property, not self). Supervisors approve Hours and Time off for **direct reports** only.
- **Pay setup**: opening Pay history on create; later rate changes write a new Pay history row (denormalized `payType` / `baseSalary` / `hourlyRate`). Bank fields required only when `paymentMethod = bank`. This person’s pay items (`staffPayItems`) are assigned on the staff record.
- **HR files** (Staff-only, not the full DMS): contracts, ID copies, tax forms, bank letters, policies. Emergency contact and national ID on the profile.
- **Onboarding checklist**: seeded on create (personal details, emergency contact, ID, contract, payment method, tax ID, login link, department shift).
- **Self-service** (`/admin/staff/myProfile`): linked staff read own profile, Hours, Time off, Payslips; request Time off; propose contact/bank/emergency edits for HR approval. They cannot edit job, status, or pay.
- **PII**: salary, tax ID, and bank details are returned only to Administrator, Director, General Manager, HR Manager, and Finance Manager (`staff.compensation.read` / `update`). Supervisors see identity and roster fields only.

### Payroll

- Staff master is defined under Staff Management. Payroll consumes `staffs`, Pay history, Hours, Time off, and Pay item types.
- **Pay cycle**: payrolls are created from a cycle (period, cutoff, pay date). Hours and Time off approved after cutoff are excluded.
- Time tracking: department shifts (default hours per department, inherited on onboard), Attendance Tracker Start/End shift (actual clock; login does not start work), Cover for a roster day, ad-hoc Shift create/Finalize, plus manual Hours and CSV. Ending or finalizing a shift creates **draft** Hours. Only **unlocked, approved** Hours are paid. Prepare pay **locks** included Hours. Cover never rewrites Hours.
- **Time off**: Time-off types + Time off. Approved unpaid Time off prorates salary. Paid Time off counts as regular hours (not OT) unless the type allows OT.
- **Holidays + extra pay rules**: country pack seeds Holidays and extra pay rules (daily/weekly OT, night, weekend, public holiday). Single overtime multiplier is fallback daily OT only.
- **Jurisdiction from property setup**: admin must select `Property.country`. Seeds statutory Pay item types, default Pay cycle, Holidays, and extra pay rules. Unsupported countries use generic fallback.
- Optional **manual** gratuity amount on a Pay item. Tip pooling is out of scope.
- Payroll lifecycle: Draft → Ready to review → Approved → Payment files ready → Paid. **Maker ≠ checker**: approver must not be the creator or last calculator.
- Immutable rate snapshots (`payHistoryIdUsed`) on each Staff pay; Pay items instead of a deductions JSON blob.
- On Approve payroll: generate Payslips and post one balanced journal entry (`referenceType = Payroll`).
- On Download payment files: export bank/CSV for bank payees and a cash/mobile worksheet. On Mark as paid: record a `Payment` and optional bank confirmation document.
- Labor cost % uses approved / payment-files-ready / paid payrolls only (see ERD reporting notes).
- Full rules, uniqueness, GL template, and `staffs` migration: `ai/payroll-implementation.md`.

### Maintenance

- Asset registry with depreciation schedules.
- Work order intake (manual or schedule-driven preventive). Inspection-triggered intake is later.
- Manual create/edit requires a **description** of the work. Auto-created preventive orders may omit it.
- Cost tracking per work order: optional `estimatedCost` on create (falls back to purchased-items total when omitted); optional `actualCost` on edit (falls back to purchased-items total when omitted). The list Cost column shows actual, else `Est.` estimated, else parts total.
- Purchased items live on `maintenanceOrderParts` (not an array on the order): name, quantity, unit cost, optional `inventoryItemId` when the item is in inventory, or a custom name when it is a one-off purchase. Catalog picker uses `maintenance.order.read` so maintenance staff do not need `inventory.read`.
- Optional vendor (`Supplier`) **in addition to** the staff lead/helpers, SLA via `dueAt`. Assignment and completion: Task Assignment.
- **Maintenance Documentation**: Maintenance work orders must include:
  - Vendor invoices for maintenance services
  - Work completion certificates
  - Warranty documents (where applicable)
  - Payment receipts for maintenance expenses
  - Documents linked to maintenance orders for cost verification and warranty tracking.

### Task Assignment

Shared assignment, SLA, templates, and checklists across housekeeping, maintenance, and inventory restock/putaway. There is **no generic `Task` table** — each module keeps its own work record (`HousekeepingTask`, `MaintenanceOrder`, `InventoryTask`) and shares `taskAssignments`, `taskTemplates`, and `taskSlaDefaults`.

- **Assignees**: one **lead** plus optional **helpers** (`taskAssignments.role`). Any assignee may start the work. **Only the lead or a supervisor may complete.** Skip (housekeeping) and cancel (maintenance / inventory) are supervisor-only; reason goes in `notes`.
- **Lead requirement**: completion is blocked without a lead. Auto-created work gets the **department supervisor** as lead when one can be resolved; otherwise it stays `pending` with no lead on the supervisor board.
- **Department for default lead**: housekeeping → `housekeeping`; maintenance → `maintenance`; inventory restock/putaway → `fnb` (storekeeper / F&B). Resolution: active staff at the property in that department who have at least one direct report (`managerId`); if several, prefer the one with no `managerId`.
- **Assignee constraints**: `active`, same property. Manual create: lead defaults to the acting supervisor’s linked staff if they are in-department, else the department supervisor. Optional helpers. Maintenance may also name a `Supplier` (vendor does the physical work; the staff lead still owns in-app completion).
- **Status**: `pending` → `in-progress` → `completed`. Housekeeping may `skipped`; maintenance and inventory may `cancelled`.
- **SLA**: every work record has `dueAt` = trigger/create time + property `taskSlaDefaults.dueMinutes` for that module/`typeKey`. Snapshot; later default edits do not rewrite open work. Seeded defaults: checkout 45, stayover 180, emergency WO 120, restock 480, putaway 120, preventive 1440.
- **G3**: percent of **completed** housekeeping + maintenance + inventory tasks in the period with `completedAt <= dueAt`. Skipped/cancelled excluded.
- **Templates**: reusable checklists per property + module + `typeKey` (optional `roomTypeId` for housekeeping). At create, snapshot steps onto the work record as `{ id, label, isComplete }[]`. Putaway may seed checklist from PO lines (item + qty).
- **Auto-create**:
  - Reservation checkout → housekeeping `checkout` task (open checkout task is what blocks “room ready”; room status is not changed to dirty/cleaning).
  - Reservation check-in → housekeeping `stayover` task.
  - `inventoryItems.currentQuantity <= reorderPoint` → inventory `restock` task (`suggestedQuantity = reorderQuantity`). Completing restock does **not** create a purchase order.
  - Purchase order status `received` → inventory `putaway` task. Completing putaway does not change PO status beyond `received`.
  - Asset `nextMaintenanceDate` due → maintenance preventive work order; completing updates `lastMaintenanceDate` / `nextMaintenanceDate`.
- **Uniqueness (open work only)**: one checkout task per room; one stayover per room per calendar day; one restock per inventory item; one putaway per received PO; one preventive work order per asset.
- **Duration**: `estimatedDuration` / `actualDuration` on housekeeping are productivity-only; they do not post Hours.
- **Notifications**: in-app this phase.
- **Boards**: unassigned (no lead), mine (current user’s linked staff), overdue (`dueAt` passed, not completed).
- **Permissions**: `housekeeping.task.*`, `maintenance.order.*`, `inventory.task.*` with `read | assign | update | complete`. Staff: read/update assigned rows; complete only if lead. Supervisors: assign and complete any in module. Do not gate these screens on `system.admin`.

### Billing & Expenses

Organizational billing is the inbox and calendar for standing property obligations. Expenses is the paid ledger.

- **Bill types** (closed): `electricity` | `water` | `gas` | `internet` | `cable` | `waste` | `local_government` | `other`. Admin does not invent types; they configure **accounts**.
- **Bill account** (admin, per property): name, type, frequency, metered vs flat, provider, optional account number / supplier / expected amount / contract end / `glAccountCode` (string until COA exists), `isActive`. Deactivate stops new periods; paid history stays.
- **Period bill**: one cycle (`expected` → `pending` after capture → `paid` | `overdue`). Daily cron creates the current period for each active account (property timezone, else UTC). Due date defaults to period end. Uniqueness: one row per `(accountId, periodStart)` (application-enforced).
- **Capture**: amount (required before pay), optional invoice number, usage/meters if `isMetered`, bill document (`billDocuments.kind = bill`).
- **Mark as paid**: full amount only. Requires bill document and payment method. Inserts `Payment` (`paymentType` / `referenceType` = `PropertyBill`). Duplicate check then inserts `Expense` (`status = paid`, `expenseDate` = payment time, `sourceType = PropertyBill`, `sourceId` = period id). Confirm-paid **is** approval — no draft/submit on these rows. Journals/COA skipped this ship.
- **Duplicate check** (same mutation): (1) hard — period already has `expenseId`, or an expense with that `sourceType`/`sourceId` → no-op success; (2) soft — same property + invoice number + vendor + amount on another expense → fail (no merge UI).
- **Category mapping** on funnel: electricity/water/gas/internet/cable/waste → `utilities`; `local_government` / `other` → `other`.
- **Screens**: `/admin/billing` (due this week, overdue), `/admin/billing/accounts`, `/admin/billing/bills`, `/admin/expenses` (read-only). Permissions: `billing.account.read|create|update`, `billing.period.read|update`, `billing.pay`; list uses `expenses.read`.
- Later: multi-channel expense capture, OCR, approval matrix, anomaly alerts, contract reminder jobs, GL posting.

### Financial Core

- GL structure with chart of accounts templates.
- Journal rules from room/F&B/payroll events.
- Cash management: bank reconciliation, petty cash tracking.
- Budget vs actual comparison per department.

### Reporting & Analytics

- Dashboard widgets configurable per role.
- Export formats: PDF, Excel, CSV, scheduled email digests.
- Drill-down from summary KPIs to underlying transactions.

### Integrations & APIs

- **Native Functionality**: Built-in POS and PMS capabilities for businesses operating without existing systems, eliminating integration dependencies.
- **External Integrations**: RESTful + webhook APIs for ingesting reservations, POS sales, payroll data from existing systems.
- Pre-built connectors for major platforms (Cloudbeds, Square, Toast, etc.); generic SFTP/CSV import fallback.
- OAuth2 / API key management, usage monitoring.
- Seamless transition path: businesses can start with native features and migrate to integrations later, or vice versa.

### Document Management

- **Centralized Document Storage**: All payment evidence and transaction documents (invoices, receipts, contracts, delivery notes, payment confirmations) stored in a centralized document repository.
- **Mandatory Document Requirements**:
  - All expenses must include supporting documents (invoices, receipts) before approval.
  - All purchase orders must have supplier invoices, delivery notes, and payment receipts attached.
  - Period bills must have the original bill document before mark-paid; a receipt is stored on the period after payment (`billDocuments`).
  - All maintenance work orders must include vendor invoices and work completion certificates.
  - All payments must have payment receipts or bank confirmations linked.
  - Payrolls should have generated Payslips and, when marked paid, a bank confirmation or Payment file linked (`Payslip`, `Payroll`, `PaymentFile` as stored `referenceType` values).
- **Document Upload Methods**:
  - Direct file upload (drag-and-drop, file picker)
  - Mobile camera capture
  - Email forwarding with automatic document extraction
  - Bulk upload for multiple documents
- **Document Processing**:
  - OCR (Optical Character Recognition) for automatic data extraction from invoices and receipts (vendor name, amount, date, invoice number, tax amount).
  - Automatic document type detection (invoice, receipt, contract, etc.).
  - Document verification workflow with reviewer assignment and verification status tracking.
- **Document Linking**: DMS `Document` can link to Expense, PurchaseOrder, Payment, MaintenanceOrder, Payroll, Payslip, Payment file. Billing this ship uses `billDocuments` on the period (not the DMS `Document` table). Stored payroll `referenceType` values stay `Payroll`, `Payslip`, `PaymentFile`. Payment for a period bill uses `referenceType = PropertyBill`.
- **Document Security**:
  - Role-based access control for document viewing and downloading.
  - Encryption at rest and in transit.
  - Audit trail for all document access and modifications.
  - Document versioning for updated documents.
- **Document Lifecycle**:
  - Document retention policies based on compliance requirements.
  - Archive functionality for old documents.
  - Secure deletion with audit logging.
- **Document Search & Retrieval**:
  - Full-text search across document content (OCR-extracted text).
  - Filter by document type, date range, amount, vendor, linked entity.
  - Quick access from related entities (view documents from expense detail page, etc.).

## Non-Functional Requirements

- **Usability**: mobile-responsive, ADA-compliant UI, customizable dashboards.
- **Performance**: dashboards render within 3 seconds for datasets up to 5 years; background jobs scalable via queueing.
- **Scalability**: multi-property support, tenant isolation, horizontal scaling strategy.
- **Security & Compliance**: RBAC, SSO (SAML/OIDC), encryption at rest/in transit, audit logs, data retention policies, GDPR-ready.
- **Reliability**: 99.5% uptime target; graceful degradation for integrations; automated backups with point-in-time recovery.
- **Support & Training**: in-app guides, LMS-style onboarding modules, tiered support SLAs.

## Data & ERD Considerations

- Core entities: `Property` (includes required `country` for payroll jurisdiction), `User`, `Role`, `staffs` (Employee; no `employees` table), `staffDocuments`, `staffOnboardingItems`, `staffChangeRequests`, `Room`, `Reservation`, `HousekeepingTask`, `taskAssignments`, `taskTemplates`, `taskSlaDefaults`, `FnbMenuItem`, `InventoryItem`, `InventoryTask`, `Supplier`, `PurchaseOrder`, Department shift (`shiftTemplates`), Roster day (`rosterSlots`), Shift (`shifts`), Pay history, Pay cycle, Time-off type, Time off, Holidays, Extra pay rules, Hours, Payroll settings, Pay item type, Payroll, Staff pay, Pay item, Payslip, Payment file, `MaintenanceOrder`, `maintenanceOrderParts`, `Asset`, `Expense`, Bill account (`billAccounts`), Period bill (`billPeriods`), Bill document (`billDocuments`), `JournalEntry`, `Report`. There is **no** `UtilityBill` / `utilityBills` table. Schema table names stay `payHistory`, `payCycles`, `timeOffTypes`, `timeOff`, `holidayCalendars`, `extraPayRules`, `hours`, `payrollSettings`, `payItemTypes`, `payrolls`, `staffPay`, `payItems`, `payslips`, `paymentFiles`, plus live `shiftTemplates`, `rosterSlots`, `shifts`, `housekeepingTasks`, `taskAssignments`, `taskTemplates`, `taskSlaDefaults`, `maintenanceOrders`, `maintenanceOrderParts`, `inventoryTasks`, `billAccounts`, `billPeriods`, `billDocuments`.
- Relationships:
  - `Property` 1:N `staffs`, `Room`, `InventoryItem`, `Asset`.
  - User 1:1 Staff globally (optional). Staff `managerId` self-FK (direct reports).
  - `Reservation` links `Room`, `Guest`, and yields `JournalEntries`.
  - `HousekeepingTask` + `MaintenanceOrder` + `InventoryTask` share `taskAssignments` (lead + helpers). Room readiness is inferred from open housekeeping tasks; room status is not `dirty`/`cleaning`.
  - `MaintenanceOrder` 1:N `maintenanceOrderParts` (purchased/used items; optional `inventoryItemId`).
  - `FnbMenuItem` consumes `InventoryItems` via recipe lines.
  - Department shift → Employee (default on onboard); Roster day (Cover) → who should attend; Shift (Attendance Tracker or ad-hoc) → Hours on End shift / Finalize.
  - A Payroll is created from a Pay cycle, aggregates approved/unlocked Hours, Time off, Pay history, and Pay item types for `staffs` into Staff pay / Pay items, then posts a `JournalEntry` and produces Payslips + Payment files.
  - Property → Bill account → Period bill → Payment + Expense (on mark-paid). One invoice, one expense.
  - `Report` entities store configuration + cached snapshots for analytics.
- ERD deliverable: diagram showing above entities, primary keys, and cardinalities to be hosted in `docs/erd/` (format TBD—likely Draw.io or Mermaid).

## Dependencies & Integrations

- **Native Features**: Built-in POS/PMS functionality reduces dependency on third-party systems for new or small businesses.
- **Third-party Connectors**: PMS/POS/accounting connectors for businesses with existing systems (Cloudbeds, Square, Toast, QuickBooks, Xero, etc.).
- **Document Storage Service**: Cloud storage service (e.g., AWS S3, Azure Blob Storage, Google Cloud Storage) for secure document storage with encryption at rest.
- **Document OCR Service**: OCR service for automatic data extraction from invoices and receipts (e.g., AWS Textract, Azure Form Recognizer, Google Document AI, or third-party vendors like Tesseract, ABBYY).
- **Email Processing Service**: Email service for document ingestion via email forwarding (e.g., AWS SES, SendGrid, Mailgun).
- Messaging/email service for alerts and digests.
- Authentication provider for SSO.
- Payment gateway integration for native POS payment processing.

## Assumptions

- Properties may operate with or without existing PMS/POS systems:
  - **With existing systems**: Platform will integrate via APIs/webhooks/CSV imports.
  - **Without existing systems**: Platform provides native POS/PMS functionality as core features.
- Finance teams follow accrual accounting and require GAAP-compliant outputs. **This billing ship is cash-basis**: the expense is created when the period is marked paid (`expenseDate` = payment time). Accrual on bill capture is later.
- Recurring utilities and subscriptions are bill accounts; true one-offs stay as (future) manual `Expense` rows.
- Users tolerate web-first experience for MVP.
- Multi-currency support required for phase 2 (not MVP).

## Risks & Mitigations

- **Integration complexity**:
  - Provide native POS/PMS functionality for businesses without existing systems, reducing integration dependencies.
  - For businesses with existing systems, start with top 2 PMS + 1 POS + 1 accounting suite; provide CSV import fallback.
- **Data accuracy**: implement validation rules, reconciliation tools, audit logs.
- **Change management**: invest in onboarding playbooks, contextual tips, customer success team.
- **Security/compliance**: engage external audit partner early; maintain least-privilege defaults.

## Rollout Plan

1. **Discovery & Design (Weeks 0-4)**: validate workflows with pilot customers (both with and without existing systems), finalize ERD, UX prototypes.
2. **MVP Build (Weeks 5-16)**:
   - Prioritize native POS/PMS functionality for businesses without existing systems.
   - Build room + F&B financial flows, reporting dashboards.
   - Develop integrations with 1 PMS + 1 POS + 1 accounting suite for businesses with existing systems.
3. **Pilot Launch (Weeks 17-20)**: onboard 2-3 properties (mix of businesses with and without existing systems), collect feedback, close critical gaps.
4. **General Availability (Weeks 21-28)**: expand integrations, add payroll + maintenance automation, finalize compliance docs.
5. **Scale & Optimize (post GA)**: advanced analytics, mobile apps, marketplace integrations.

## Glossary

- **Bill account**: Standing property obligation (provider + cadence). Admin-configured; not seeded per vendor.

- **Period bill**: One billing cycle for an account (week, month, or year). Cron opens `expected` rows; staff capture the invoice; mark-paid posts `Payment` + `Expense`.

- **SLA (Service Level Agreement)**: Task completion window. Stored as `dueAt` on each work record from property `taskSlaDefaults`. G3 = percent of completed housekeeping, maintenance, and inventory restock/putaway tasks with `completedAt <= dueAt` (skipped/cancelled excluded).

- **SOC (System and Organization Controls)**: A framework for reporting on controls at service organizations, particularly SOC 2 which focuses on security, availability, processing integrity, confidentiality, and privacy. SOC 2 compliance demonstrates that the platform has robust security controls and audit trails.

- **CSAT (Customer Satisfaction Score)**: A metric measuring customer satisfaction with a product or service, typically on a scale (e.g., 1-5 or percentage). Used here to track user satisfaction with support and onboarding experiences.

- **GL (General Ledger)**: The core accounting record that contains all financial transactions of a business, organized by accounts. It serves as the foundation for financial statements and reporting.

- **AP/AR (Accounts Payable / Accounts Receivable)**:
  - **AP**: Money owed by the business to suppliers/vendors for goods or services purchased on credit.
  - **AR**: Money owed to the business by customers/guests for services rendered but not yet paid.

- **revPAR (Revenue Per Available Room)**: A key hospitality metric calculated as (Total Room Revenue / Total Available Rooms) or (Average Daily Rate × Occupancy Rate). Measures revenue-generating efficiency of room inventory.

- **SKU (Stock Keeping Unit)**: A unique identifier for each distinct product or item in inventory, used for tracking, ordering, and inventory management. In F&B context, each ingredient or menu item would have its own SKU.

- **CSV (Comma-Separated Values)**: A simple file format used to store tabular data (e.g., spreadsheets) where values are separated by commas. Used for importing/exporting data when direct API integrations aren't available.

- **ADA-compliant (Americans with Disabilities Act compliant)**: Refers to user interfaces that meet accessibility standards ensuring people with disabilities can use the software effectively, including screen reader support, keyboard navigation, color contrast, and other accessibility features.

- **RBAC (Role-Based Access Control)**: A security model where access permissions are assigned to roles rather than individual users. Users are assigned roles (e.g., "Finance Manager", "Housekeeping Supervisor"), and roles determine what data and functions they can access.

- **SSO (Single Sign-On)**: An authentication process that allows users to access multiple applications or systems with a single set of login credentials, improving user experience and security.

- **SAML/OIDC (Security Assertion Markup Language / OpenID Connect)**:
  - **SAML**: An XML-based standard for exchanging authentication and authorization data between parties, commonly used for enterprise SSO.
  - **OIDC**: A modern authentication protocol built on OAuth 2.0 that provides identity verification and user information exchange, often preferred for web and mobile applications.

- **GDPR (General Data Protection Regulation)**: European Union regulation governing data protection and privacy. Requires businesses to implement data protection measures, provide user rights (access, deletion, portability), and maintain privacy-by-design principles.

## Open Questions

- Which specific PMS/POS/accounting systems must be supported at launch?
- Do properties require multi-language interfaces at MVP?
- Should we embed a booking engine or rely entirely on integrations long term?
- Which country payroll packs ship at launch besides `NG` and `generic`?
- Bank export format beyond generic CSV (local NUBAN/NACHA templates, driven by country pack)?

