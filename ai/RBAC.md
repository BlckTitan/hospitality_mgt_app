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
4. Reservations & Rooms
5. Food & Beverage (F&B)
6. Inventory Management
7. Financial Management
8. Reports & Analytics
9. System Settings
10. Maintenance & Facilities
11. Security & Access Logs

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
