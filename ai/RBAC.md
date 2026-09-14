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
- Receptionist (Front Desk)
- Concierge
- Housekeeping Staff
- Waiter / Server
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
7. Food & Beverage (F&B)
8. Inventory Management
9. Financial Management
10. Reports & Analytics
11. System Settings
12. Maintenance & Facilities
13. Security & Access Logs

---

## RBAC Matrix

Legend:
- FULL = Full Access (Create, Read, Update, Delete)
- LIMITED = Partial Access
- VIEW = Read-only
- NONE = No Access

| Role | Users | Properties | Staff | Reservations | F&B | Inventory | Finance | Reports | System | Maintenance | Security |
|------|------|------------|-------|--------------|-----|-----------|---------|---------|--------|------------|----------|
| Administrator | FULL | FULL | FULL | FULL | FULL | FULL | FULL | FULL | FULL | FULL | FULL |
| Director | NONE | FULL | FULL | FULL | FULL | FULL | FULL | FULL | LIMITED | VIEW | VIEW |
| General Manager | NONE | LIMITED | FULL | FULL | FULL | FULL | FULL | FULL | NONE | LIMITED | VIEW |
| Operations Manager | NONE | LIMITED | LIMITED | FULL | FULL | FULL | LIMITED | FULL | NONE | FULL | VIEW |
| Finance Manager | NONE | NONE | LIMITED | VIEW | VIEW | VIEW | FULL | FULL | NONE | NONE | VIEW |
| HR Manager | LIMITED | NONE | FULL | NONE | NONE | NONE | LIMITED | LIMITED | NONE | NONE | NONE |
| IT Manager | FULL | LIMITED | LIMITED | LIMITED | LIMITED | LIMITED | LIMITED | FULL | FULL | FULL | FULL |
| Manager | NONE | LIMITED | FULL | FULL | FULL | FULL | LIMITED | FULL | NONE | LIMITED | NONE |
| Assistant Manager | NONE | NONE | LIMITED | FULL | FULL | LIMITED | NONE | LIMITED | NONE | NONE | NONE |
| Supervisor | NONE | NONE | LIMITED | LIMITED | FULL | LIMITED | NONE | LIMITED | NONE | NONE | NONE |
| Receptionist | NONE | NONE | NONE | FULL | LIMITED | NONE | LIMITED | LIMITED | NONE | NONE | NONE |
| Concierge | NONE | NONE | NONE | LIMITED | NONE | NONE | NONE | VIEW | NONE | NONE | NONE |
| Housekeeping | NONE | NONE | NONE | LIMITED | NONE | NONE | NONE | NONE | NONE | LIMITED | NONE |
| Waiter | NONE | NONE | NONE | NONE | LIMITED | NONE | NONE | NONE | NONE | NONE | NONE |
| Bartender | NONE | NONE | NONE | NONE | FULL | LIMITED | NONE | NONE | NONE | NONE | NONE |
| Cook / Chef | NONE | NONE | NONE | NONE | FULL | LIMITED | NONE | NONE | NONE | NONE | NONE |
| Kitchen Assistant | NONE | NONE | NONE | NONE | LIMITED | LIMITED | NONE | NONE | NONE | NONE | NONE |
| Maintenance Staff | NONE | NONE | NONE | NONE | NONE | NONE | NONE | NONE | NONE | FULL | NONE |
| Security Officer | NONE | NONE | NONE | NONE | NONE | NONE | NONE | NONE | NONE | NONE | FULL |

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

**Role mapping (see `ai/payroll-implementation.md`):**
- HR Manager, Finance Manager, Administrator, Director, General Manager: full payroll. Approve mutation still requires a **different user** than creator/calculator (maker ≠ checker).
- Supervisor / Assistant Manager: Hours (`payroll.timesheet.read` + `approve`) and Time off (`payroll.leave.read` + `approve`) for their team; Department shifts (`staff.read` / `staff.update`) and Cover (`staff.update`)
- Employees with a User login linked to Staff: Attendance Tracker Start/End shift (`payroll.timesheet.create` or `fnb.read`), own Shift rows, own Hours / Time off create, own Payslip (`payroll.payslip.read`)
- F&B operational roles with `fnb.read` can open Attendance Tracker and own Shift rows; they still need a Staff link to start a shift
- Other operational staff: none on runs or other employees' pay

Route access (`lib/proxy-permissions.ts`; `granular` may be a string or string[]):

| Screen | Path | Permission |
|---|---|---|
| Shift Management hub | `/admin/shift-management` | `staff.read` |
| Department shifts | `/admin/shift-management/templates` | `staff.read` (edit: `staff.update`) |
| Cover | `/admin/shift-management/cover` | `staff.update` |
| Attendance Tracker | `/admin/shift-management/attendance` | `payroll.timesheet.create` or `fnb.read` |
| Shift list | `/admin/shift-management/shift` | `staff.read` or `payroll.timesheet.create` or `fnb.read` |
| Hours | `/admin/shift-management/hours` | `payroll.timesheet.read` (edit: `payroll.timesheet.update`) |

### Food & Beverage
- fnb.order.create
- fnb.order.manage
- fnb.menu.update

---

## Implementation Notes

- Use role + permission hybrid model
- Support multi-role users (same person may hold different roles at the same or different properties)
- Permissions are evaluated **per property**. Holding Administrator at Hotel A does not grant `users.*` at Hotel B.
- Implement audit logs for sensitive actions
- Scope access by property/location
- Use middleware for permission enforcement

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
