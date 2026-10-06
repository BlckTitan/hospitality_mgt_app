# Hospitality Management Software - RBAC Model

## Overview
This document defines a comprehensive Role-Based Access Control (RBAC) model for a hospitality management system.

---

## Roles

### Executive Roles
- Administrator
- Director

### Management Roles
- General Manager
- Operations Manager
- Finance Manager
- HR Manager
- IT Manager

### Mid-Level Roles
- Manager
- Assistant Manager
- Supervisor

### Operational Staff
Canonical **role names** stored on `roles.name` (must match `ROLE_PERMISSION_MATRIX` keys exactly):

- Receptionist
- Concierge
- Housekeeping *(display may say Housekeeping Staff)*
- Waiter *(display may say Waiter / Server)*
- Bartender
- Cook / Chef
- Kitchen Assistant
- Maintenance Staff
- Security Officer

---

## Permissions

### Core Modules
1. Users & Roles
2. Properties
3. Staff Management
4. Shift Management (Department shifts, Attendance Tracker, Cover, Shift, Hours)
5. Payroll
6. Reservations & Rooms
7. Beverages (live bar / beverage POS)
8. Restaurant (live; kitchen + grill are stations under Restaurant)
9. Inventory Management
10. Financial Management
11. Billing (bill accounts, period bills, mark-paid → expense)
12. Reports & Analytics (includes the operational dashboard page)
13. System Settings
14. Maintenance & Facilities
15. Security & Access Logs
16. Task Assignment (housekeeping, maintenance orders, inventory restock/putaway)

---

## RBAC Matrix

Legend:
- FULL = Full Access (Create, Read, Update, Delete)
- LIMITED = Partial Access
- VIEW = Read-only
- NONE = No Access

| Role | Users | Properties | Staff | Reservations | Beverages | Restaurant | Inventory | Finance | Reports | System | Maintenance | Security |
|------|------|------------|-------|--------------|-----------|------------|-----------|---------|---------|--------|------------|----------|
| Administrator | FULL | FULL | FULL | FULL | FULL | FULL | FULL | FULL | FULL | FULL | FULL | FULL |
| Director | NONE | FULL | FULL | FULL | FULL | FULL | FULL | FULL | FULL | LIMITED | VIEW | VIEW |
| General Manager | NONE | LIMITED | FULL | FULL | FULL | FULL | FULL | FULL | FULL | NONE | LIMITED | VIEW |
| Operations Manager | NONE | LIMITED | LIMITED | FULL | FULL | FULL | FULL | LIMITED | FULL | NONE | FULL | VIEW |
| Finance Manager | NONE | NONE | LIMITED | VIEW | VIEW | VIEW | VIEW | FULL | FULL | NONE | NONE | VIEW |
| HR Manager | LIMITED | NONE | FULL | NONE | NONE | NONE | NONE | LIMITED | LIMITED | NONE | NONE | NONE |
| IT Manager | FULL | LIMITED | LIMITED | LIMITED | LIMITED | LIMITED | LIMITED | LIMITED | FULL | FULL | FULL | FULL |
| Manager | NONE | LIMITED | FULL | FULL | FULL | FULL | FULL | LIMITED | FULL | NONE | LIMITED | NONE |
| Assistant Manager | NONE | NONE | LIMITED | FULL | FULL | FULL | LIMITED | NONE | LIMITED | NONE | NONE | NONE |
| Supervisor | NONE | NONE | LIMITED | LIMITED | FULL | FULL | LIMITED | NONE | LIMITED | NONE | NONE | NONE |
| Receptionist | NONE | NONE | NONE | FULL | LIMITED | LIMITED | NONE | LIMITED | LIMITED | NONE | NONE | NONE |
| Concierge | NONE | NONE | NONE | LIMITED | NONE | NONE | NONE | NONE | VIEW | NONE | NONE | NONE |
| Housekeeping | NONE | NONE | NONE | LIMITED | NONE | NONE | NONE | NONE | NONE | NONE | LIMITED | NONE |
| Waiter | NONE | NONE | NONE | NONE | LIMITED | LIMITED | NONE | NONE | NONE | NONE | NONE | NONE |
| Bartender | NONE | NONE | NONE | NONE | FULL | NONE | LIMITED | NONE | NONE | NONE | NONE | NONE |
| Cook / Chef | NONE | NONE | NONE | NONE | NONE | FULL | LIMITED | NONE | NONE | NONE | NONE | NONE |
| Kitchen Assistant | NONE | NONE | NONE | NONE | NONE | LIMITED | LIMITED | NONE | NONE | NONE | NONE | NONE |
| Maintenance Staff | NONE | NONE | NONE | NONE | NONE | NONE | NONE | NONE | NONE | NONE | FULL | NONE |
| Security Officer | NONE | NONE | NONE | NONE | NONE | NONE | NONE | NONE | NONE | NONE | NONE | FULL |

**Role notes (Beverages vs Restaurant):**
- **Bartender** → Beverages (`beverages.*`); no Restaurant by default.
- **Cook / Chef**, **Kitchen Assistant** (and Griller when used as a station role) → Restaurant (`restaurant.*`); kitchen + grill are stations under Restaurant, not separate modules.
- **Waiter** may hold both LIMITED Beverages and LIMITED Restaurant (serves bar and dining).
- Live Convex permissions may still be named `fnb.*` until the Beverages rename migration; AI docs use `beverages.*` as the target.

---

## Granular Permission Examples

### Reservations & Rooms
- reservations.view
- reservations.create
- reservations.update
- reservations.checkin
- reservations.checkout
- reservations.cancel

### Financial Management
- finance.view
- finance.charge
- finance.refund
- finance.reports

### Billing (organizational utilities / subscriptions)
Permission keys stay technical. Screens: Billing hub, Bill accounts, Bills, Expenses (read-only list).

**Implementation:** `billing.*` keys are stored and checked explicitly; they are **not** mapped through `finance.*` in `GRANULAR_PERMISSIONS` (so finance LIMITED does not imply bill-account create/pay).

- billing.account.read
- billing.account.create
- billing.account.update
- billing.period.read
- billing.period.update
- billing.pay

Expenses list uses existing `expenses.read`. Mark-paid inserts the expense; do not require `expenses.create` / `expenses.approve` for billed rows.

| Screen | Path | Permission |
|---|---|---|
| Billing hub | `/admin/billing` | `billing.period.read` |
| Bill accounts | `/admin/billing/accounts` | `billing.account.read` (create/edit: `create` / `update`) |
| Bills | `/admin/billing/bills` | `billing.period.read` (capture: `billing.period.update`; mark paid: `billing.pay`) |
| Expenses | `/admin/expenses` | `expenses.read` |

**Role mapping:**
- Administrator, Director, General Manager, Finance Manager: full `billing.*` plus `expenses.read`
- Operations Manager / Manager: `billing.period.read` (view dues); account setup and pay stay Finance unless granted
- Other operational staff: none

### Payroll
Permission keys stay technical. Screens use Hours, Time off, Payroll, Payslip, Payroll settings, Department shifts, Attendance Tracker, Cover, and Shift (see `ai/payroll-implementation.md` User-facing names).
- payroll.employee.read
- payroll.employee.create
- payroll.employee.update
- payroll.timesheet.read
- payroll.timesheet.create
- payroll.timesheet.update
- payroll.timesheet.approve
- payroll.leave.read
- payroll.leave.create
- payroll.leave.approve
- payroll.run.read
- payroll.run.create
- payroll.run.calculate
- payroll.run.approve
- payroll.run.export
- payroll.run.mark_paid
- payroll.payslip.read
- payroll.settings.update

- staff.read
- staff.create
- staff.update
- staff.delete (terminate only; no hard delete)
- staff.compensation.read
- staff.compensation.update
- staff.self.read (own linked Staff row; My profile)

Salary, tax ID, and bank: Administrator, Director, General Manager, HR Manager, Finance Manager only (`staff.compensation.*`). Supervisors with `staff.read` / `staff.update` see identity and roster fields.

| Screen | Path | Permission |
|---|---|---|
| Staff directory | `/admin/staff` | `staff.read` |
| Staff create | `/admin/staff` (+) | `staff.create` |
| Staff edit | `/admin/staff/edit` | `staff.update` |
| Staff view | `/admin/staff/view` | `staff.read` |
| My profile | `/admin/staff/myProfile` | `staff.self.read` (any linked User) |

**Role mapping (see `ai/payroll-implementation.md`):**
- HR Manager, Finance Manager, Administrator, Director, General Manager: full payroll. Approve mutation still requires a **different user** than creator/calculator (maker ≠ checker).
- Employees with a User login linked to Staff: My profile (`staff.self.read`), Attendance Tracker **My duty** Start/End shift when `clockMethod = self` (`payroll.timesheet.create` or `beverages.read`), own Shift rows, own Hours / Time off create, own Payslip (`payroll.payslip.read`); contact/bank/emergency change requests for HR approval
- Supervisor / Assistant Manager: Hours (`payroll.timesheet.read` + `approve`) and Time off (`payroll.leave.read` + `approve`) for **direct reports** (`staffs.managerId`); Department shifts (`staff.read` / `staff.update`) and Cover (`staff.update`); Attendance Tracker **Today’s floor** Start for / End for (`staff.update` or `payroll.timesheet.approve`; direct reports only when they cannot see all team records). No compensation fields.
- Beverages operational roles with `beverages.read` can open Attendance Tracker and own Shift rows; they still need a Staff link to start a shift. (Live code may still check `fnb.read` until migration.)
- Other operational staff: none on runs or other employees' pay

Route access (`lib/proxy-permissions.ts`; `granular` may be a string or string[]):

| Screen | Path | Permission |
|---|---|---|
| Shift Management hub | `/admin/shift-management` | `staff.read` |
| Department shifts | `/admin/shift-management/templates` | `staff.read` (edit: `staff.update`) |
| Cover | `/admin/shift-management/cover` | `staff.update` |
| Attendance Tracker | `/admin/shift-management/attendance` | `payroll.timesheet.create` or `beverages.read` or `staff.read` or `payroll.timesheet.approve` |
| Shift list | `/admin/shift-management/shift` | `staff.read` or `payroll.timesheet.create` or `beverages.read` |
| Hours | `/admin/shift-management/hours` | `payroll.timesheet.read` (edit: `payroll.timesheet.update`) |

### Reports & Analytics / Operational dashboard

Permission keys stay technical. The metrics catalog is `ai/report_analytcs.md`. The dashboard (`/admin/dashboard`) is the property P&L / RevPAR + operations view. Bar period charts and health KPIs are `/admin/bar-management`, not the dashboard.

- reports.read — page access for `/admin/dashboard` and `getFinancialReport`
- reports.create
- reports.export

Operational tabs still check their own module keys (`rooms.read`, `inventory.read`, `fnb.read` / target `beverages.read`, `restaurant.read`, `billing.period.read`, `housekeeping.task.read`, etc.). Missing a tab key hides that tab; it does not open the page.

| Screen | Path | Permission |
|---|---|---|
| Property dashboard | `/admin/dashboard` | `reports.read` |
| Bar Management hub | `/admin/bar-management` | `beverages.read` (charts: `reports.read`; reorders/requests/counts: `inventory.read`) |
| My Stock Today | `/admin/bar-management/my-stock` | `beverages.read` |
| Stock requests | `/admin/bar-management/stock-requests` | `beverages.read` (create); `inventory.update` (approve/reject = issue) |
| Store count | `/admin/bar-management/store-count` | `inventory.read` / `inventory.update` |
| Bars / Beverages / User stock logs | `/admin/bar-management/bar` etc. | `beverages.read` (`beverages.create` / `beverages.update` on create/edit) |
| Beverage POS terminal / orders | `/admin/pos`, `/admin/pos/orders` | `beverages.read` (`beverages.create` / `beverages.update` to open/settle) |
| POS cash-up | `/admin/pos/cash-up` | `beverages.read` (preview); `beverages.update` (post) |
| Staff liabilities | `/admin/bar-management/liabilities` | `beverages.read` (list); `beverages.update` (create/approve/collect/waive) |
| Store inventory / transactions | `/admin/bar-management/store-inventory` etc. | `inventory.read` (`inventory.update` on edit) |
| Restaurant hub | `/admin/restaurant` | `restaurant.read` |
| Restaurant menu items | `/admin/restaurant/menu-items` | `restaurant.read` (`restaurant.create` / `restaurant.update` on create/edit) |
| Restaurant recipes | `/admin/restaurant/recipes` | `restaurant.read` (`restaurant.update` to edit lines) |
| Restaurant tables | `/admin/restaurant/tables` | `restaurant.read` (`restaurant.create` / `restaurant.update`) |
| Restaurant POS | `/admin/restaurant/pos` | `restaurant.read` (`restaurant.create` / `restaurant.update` to open/settle) |
| Restaurant orders | `/admin/restaurant/orders` | `restaurant.read` (`restaurant.update` to pay down) |
| Kitchen board | `/admin/restaurant/kitchen` | `restaurant.read` (`restaurant.update` to bump prep) |
| My profile (default home without dashboard) | `/admin/staff/myProfile` | `staff.self.read` |

**Post-login routing** (`getPostLoginPath` in `lib/route-access.ts`; spec `ai/dashboard.md`):

- Has `reports.read` → `/admin/dashboard`
- Does not → `/admin/staff/myProfile`

Apply that helper in `proxy.ts`, home, sign-in default, property setup finish, unauthorized primary button, and `parentAdminPath` Back fallback. Do not send every role to the dashboard.

**Role mapping (Reports column in the matrix):**
- Administrator, Director, General Manager, Operations Manager, Finance Manager, IT Manager, Manager: `reports.read` (FULL) — land on the dashboard
- Assistant Manager, Supervisor, Receptionist, Concierge: LIMITED or VIEW reports — treat as `reports.read` when the role matrix grants Reports VIEW/LIMITED/FULL
- Housekeeping, Waiter, Bartender, Cook, Kitchen Assistant, Maintenance Staff, Security Officer: Reports NONE — land on My profile

### Beverages (live)
Target keys (live code may still use `fnb.*` until migration):
- beverages.read
- beverages.create
- beverages.update
- beverages.delete

### Restaurant (live)

Keys live in Convex + frontend matrices (`restaurant.read|create|update|delete`). Aliases: `restaurant.order.create` → create, `restaurant.order.manage` / `restaurant.menu.update` → update. Run `syncSystemRoles` after deploy so existing role documents receive these keys.

- restaurant.read
- restaurant.create
- restaurant.update
- restaurant.delete
- restaurant.order.create
- restaurant.order.manage
- restaurant.menu.update

### Task Assignment
Permission keys stay technical. Work records stay `HousekeepingTask`, `MaintenanceOrder`, and `InventoryTask`. Assignment is `taskAssignments` (lead + helpers).

- housekeeping.task.read
- housekeeping.task.assign
- housekeeping.task.update
- housekeeping.task.complete
- maintenance.order.read
- maintenance.order.assign
- maintenance.order.update
- maintenance.order.complete
- inventory.task.read
- inventory.task.assign
- inventory.task.update
- inventory.task.complete

Staff (Housekeeping Staff / Maintenance Staff / storekeepers with `beverages` or inventory access): `read` + `update` on **assigned** rows; `complete` only if they are **lead**. Supervisors: `assign` and `complete` any work in the module. Do **not** gate these screens on `system.admin`.

| Screen | Path | Permission |
|---|---|---|
| Housekeeping board | `/admin/room-management/housekeeping-task` | `housekeeping.task.read` |
| Housekeeping create | `/admin/room-management/housekeeping-task/create` | `housekeeping.task.assign` |
| Housekeeping edit | `/admin/room-management/housekeeping-task/edit` | `housekeeping.task.update` |
| My tasks | `/admin/tasks/mine` | `housekeeping.task.read` or `maintenance.order.read` or `inventory.task.read` |
| Maintenance orders | `/admin/maintenance` | `maintenance.order.read` (parts catalog picker included; `inventory.read` not required) |
| Inventory tasks | `/admin/inventory/tasks` or `/admin/inventory-management/tasks` | `inventory.task.read` |
| Task templates | `/admin/tasks/templates` | `housekeeping.task.assign` or `maintenance.order.assign` or `inventory.task.assign` |
| SLA defaults | `/admin/tasks/sla` | `housekeeping.task.assign` or `maintenance.order.assign` or `inventory.task.assign` |

**Role mapping:**
- Administrator, Director, General Manager, Operations Manager: full `*.read|assign|update|complete` for all three modules
- Supervisor: assign + complete across housekeeping / maintenance / inventory task modules (seeded explicitly even when the coarse Maintenance matrix cell is NONE)
- Housekeeping (`Housekeeping` role name): `housekeeping.task.read` + `update`; complete only as lead
- Maintenance Staff: `maintenance.order.read` + `update`; complete only as lead
- Bartender / Cook / Chef / Kitchen Assistant: `inventory.task.read` + `update`; complete only as lead
- Receptionist: `housekeeping.task.read` (room readiness from open tasks); no assign/complete

---

## Implementation Notes

### Hybrid model (implemented)

- **Coarse matrix** — role name → module levels (`FULL` / `LIMITED` / `VIEW` / `NONE`) in:
  - `lib/permissions.ts` (frontend)
  - `convex/lib/permissionsData.ts` (backend)
  Keep these two matrices in sync. Levels expand via `levelToActions` / `MODULE_ACTION_KEYS`.
- **Stored role permissions** — each `roles` document has a boolean map (`module.action` and granular keys). Auth context unions keys from the user’s `UserRole` rows **per property**.
- **Granular aliases** — `GRANULAR_PERMISSIONS` maps keys like `payroll.timesheet.approve` → `payroll.update`. Used by `hasGranularPermission` when the key is not present as a direct boolean.
- **Billing is explicit-only** — `billing.*` is **not** aliased to `finance.*`, so Ops/Manager can hold finance `LIMITED` without gaining bill-account setup or pay. Grants:
  - Full `billing.*`: Administrator, Director, General Manager, Finance Manager
  - `billing.period.read` only: Operations Manager, Manager
- **Compensation is explicit-only** — `staff.compensation.*` is not implied by `staff` FULL. Roles: Administrator, Director, General Manager, HR Manager, Finance Manager.
- **Task keys** — seeded explicitly; task role mapping may grant `housekeeping.task.*` / `maintenance.order.*` / `inventory.task.*` beyond the coarse Maintenance column (e.g. Supervisor).
- **Route gates** — `lib/proxy-permissions.ts` (`ROUTE_PERMISSIONS`). Arrays mean any listed key is enough.
- **UI checklist** — `lib/data.ts` → `PERMISSION_GROUPS` (Role create/edit forms).
- **Runtime** — `convex/lib/rbac.ts`, `lib/permission-utils.ts`, `hooks/usePermissions.tsx`.

Multi-role users are supported. Permissions are evaluated **per property**: Administrator at Hotel A does not grant `users.*` at Hotel B. Scope access by property; enforce in Convex mutations (`requirePermission`) and route middleware / proxy, not only in the sidebar.

### System role seeding

Permission maps are built by `buildRolePermissions` in `convex/lib/rolePermissionCatalog.ts` and upserted by `ensureAllSystemRoles` in `convex/lib/systemRoles.ts`.

| Trigger | Function |
|---|---|
| First property setup (assign Administrator) | `assignAdministratorRoleForProperty` → seeds all system roles |
| CLI / dashboard (no auth) | `npx convex run roles:ensureSystemRoles` (internal) |
| Admin refresh from app | `roles.syncSystemRoles` (requires `roles.update`) |
| Production | `npx convex run roles:ensureSystemRoles --prod` |

Re-running seed **overwrites** `permissions` on existing system roles (`isSystemRole: true`) to match this document / catalog. Custom (non-system) roles are untouched.

### File map

| Concern | Path |
|---|---|
| Spec (this file) | `ai/RBAC.md` |
| Frontend matrix + granular | `lib/permissions.ts` |
| Backend matrix + granular | `convex/lib/permissionsData.ts` |
| Role → boolean map builder | `convex/lib/rolePermissionCatalog.ts` |
| Upsert / Administrator assign | `convex/lib/systemRoles.ts` |
| Seed / sync mutations | `convex/roles.ts` |
| Route → permission | `lib/proxy-permissions.ts` |
| Post-login path | `lib/route-access.ts` (`getPostLoginPath`) |
| Permission labels (Role UI) | `lib/data.ts` (`PERMISSION_GROUPS`) |

### Clerk invitations (first access)

New users are not created with a Users CRUD form. An admin with `users.create` at a property sends a Clerk invitation that includes:

- email
- `roleId` (chosen from defined Roles — the permission template)
- `propertyId`

The invite is stored as `pendingInvites`. When the recipient signs up, fulfillment inserts a `UserRole` row (`assignedBy` = the inviter). The same email cannot be invited again once it exists in Clerk.

Administrator invites: only a user who already holds **Administrator** at that property may invite someone as Administrator.

### Ongoing assignment (existing users)

Invite cannot add a second property or change a role. That happens on **User edit** (`/admin/user/edit`): add / change / remove `UserRole` rows. `assignedBy` is always the authenticated actor; it is not chosen in the UI.

`/admin/user/userRole` is retired (redirects to Users).

### Administrator assignment rules

- Only an **Administrator at that property** may grant, change, or revoke the Administrator role (not HR/IT via generic `users.update`).
- An Administrator **cannot** demote or remove their own Administrator assignment; a peer must do it.
- The **last** Administrator at a property cannot be removed or demoted until another Administrator is assigned.
- Peer Administrators may change each other's Administrator role, subject to the last-admin rule.

---

## End of Document
