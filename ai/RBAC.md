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
4. Payroll
5. Reservations & Rooms
6. Food & Beverage (F&B)
7. Inventory Management
8. Financial Management
9. Reports & Analytics
10. System Settings
11. Maintenance & Facilities
12. Security & Access Logs

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
Permission keys stay technical. Screens use Hours, Time off, Payroll, Payslip, and Payroll settings (see `ai/payroll-implementation.md` User-facing names).
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
- Supervisor / Assistant Manager: Hours (`payroll.timesheet.read` + `approve`) and Time off (`payroll.leave.read` + `approve`) for their team
- Employees with a User login: own Hours / Time off create and own Payslip (`payroll.payslip.read`)
- Other operational staff: none on runs or other employees' pay

### Food & Beverage
- fnb.order.create
- fnb.order.manage
- fnb.menu.update

---

## Implementation Notes

- Use role + permission hybrid model
- Support multi-role users
- Implement audit logs for sensitive actions
- Scope access by property/location
- Use middleware for permission enforcement

---

## End of Document
