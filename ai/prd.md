# Hospitality Management Suite PRD

## Project Overview

- **Product name**: Hospitality Management Suite (working title)
- **Project Vision**: To develop a comprehensive software that empowers hospitality businesses (hotels, motels, resorts, B&Bs) to streamline operations, ensure profitability, maximize revenue and ultimately ensure efficient financial management. Hospitality manager will serve as a central hub for managing reservation, front-desk activities, housekeeping, billing and guest relations.
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
  - *KPI*: 90% of tasks (housekeeping, maintenance, inventory) completed within SLA using in-app workflows.
- **G4**: Ensure compliance & audit readiness.
  - *KPI*: Immutable audit logs for 100% financial events; SOC 2 aligned controls.
- **G5**: Accelerate onboarding & adoption.
  - *KPI*: New property live within 5 business days; ≥85% CSAT for support.7

## Target Users & Personas

- **Hotel Owners / General Managers**: need holistic business visibility, profitability tracking, and forecasting.
- **Finance & Accounting Teams**: own GL, AP/AR, payroll, taxes, vendor payments.
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
   - Housekeeping assignments, checklists, supplies usage.
2. **Food & Beverage Management**
   - Menu catalog, recipe costing, upsell recommendations.
   - Native POS functionality for order taking, payment processing, and sales tracking (for businesses without existing POS systems).
   - POS integrations for sales ingestion (for businesses with existing POS systems).
   - Inventory counts, reorder points, supplier management, restocking workflows.
   - Document management for inventory purchases: supplier invoices, delivery receipts, and payment confirmations must be uploaded and linked to purchase orders.
3. **Payroll Management**
   - Staff profiles, roles, pay rates, timesheets, gratuity allocations.
   - Payroll runs with export to major payroll processors or bank files.
4. **Maintenance Management**
   - Asset registry, preventive schedules, work orders, cost tracking.
5. **Expenses & Financial Management**
   - Expense capture (manual + scanned invoices), approvals, GL mapping.
   - **Mandatory document attachment**: All expenses must include supporting documents (invoices, receipts, payment confirmations) as evidence of payment.
   - Utility bill management with usage tracking and reminders.
   - **Document requirement**: Utility bills must have original bill documents and payment receipts attached for verification and compliance.
   - General inventory (linen, amenities, cleaning supplies, spare parts).
   - **Purchase documentation**: All inventory purchases require supplier invoices, delivery notes, and payment receipts to be uploaded and linked.
6. **Reporting & Analytics**
   - Daily flash reports, monthly statements, yearly trend analysis.
   - Custom report builder with filters by department, cost center, channel.
   - Real-time dashboards for cash flow, occupancy, ADR, labor cost %, food cost %, etc.
7. **Platform Foundations**
   - Role-based access control, audit logs, SOC2-ready security controls.
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
- Housekeeping workflow with task templates, time tracking, supply usage deduction from inventory.

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
- Inventory cycle counts, variance detection, reorder automation, supplier price history.
- **Inventory Purchase Documentation**: All inventory purchases require:
  - Supplier invoices (original or digital copies)
  - Delivery notes/receipts
  - Payment confirmations (bank statements, payment receipts)
  - Documents must be linked to purchase orders for three-way matching (PO, invoice, receipt).
- Upsell prompts (e.g., breakfast add-ons) at check-in/checkout + F&B dashboards for attach rates.

### Payroll

- Time tracking (manual entry + CSV import + optional integration).
- Overtime rules, allowances, deductions, gratuity pooling.
- Payroll approval workflow, export to accounting, pay-slip generation.

### Maintenance

- Asset registry with depreciation schedules.
- Work order intake (manual, schedule-driven, or triggered by inspections).
- Cost tracking per work order, parts usage, vendor assignment, SLA monitoring.
- **Maintenance Documentation**: Maintenance work orders must include:
  - Vendor invoices for maintenance services
  - Work completion certificates
  - Warranty documents (where applicable)
  - Payment receipts for maintenance expenses
  - Documents linked to maintenance orders for cost verification and warranty tracking.

### Expenses & Utilities

- Multi-channel expense capture (mobile upload, email forwarding, email forwarding with automatic document extraction).
- **Document Management**: All expenses must have supporting documents (invoices, receipts, payment confirmations) attached. Documents are required before expense approval and payment processing.
- Document verification workflow: documents can be marked as verified by authorized personnel.
- OCR (Optical Character Recognition) for automatic data extraction from invoices and receipts (vendor, amount, date, invoice number).
- Approval matrix by amount/category with document verification checkpoints.
- Utility meter readings, anomaly alerts, contract reminders.
- **Utility Bill Documentation**: Original utility bills and payment receipts must be uploaded and linked to utility bill records for audit compliance.

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
  - All utility bills must have original bill documents and payment confirmations.
  - All maintenance work orders must include vendor invoices and work completion certificates.
  - All payments must have payment receipts or bank confirmations linked.
- **Document Upload Methods**:
  - Direct file upload (drag-and-drop, file picker)
  - Mobile camera capture
  - Email forwarding with automatic document extraction
  - Bulk upload for multiple documents
- **Document Processing**:
  - OCR (Optical Character Recognition) for automatic data extraction from invoices and receipts (vendor name, amount, date, invoice number, tax amount).
  - Automatic document type detection (invoice, receipt, contract, etc.).
  - Document verification workflow with reviewer assignment and verification status tracking.
- **Document Linking**: Documents can be linked to multiple entity types (Expense, PurchaseOrder, UtilityBill, Payment, MaintenanceOrder) using flexible reference system.
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

- Core entities: `Property`, `User`, `Role`, `Room`, `Reservation`, `HousekeepingTask`, `FnbMenuItem`, `InventoryItem`, `Supplier`, `PurchaseOrder`, `PayrollRun`, `Employee`, `MaintenanceOrder`, `Asset`, `Expense`, `UtilityBill`, `JournalEntry`, `Report`.
- Relationships:
  - `Property` 1:N `Room`, `Employee`, `InventoryItem`, `Asset`.
  - `Reservation` links `Room`, `Guest`, and yields `JournalEntries`.
  - `HousekeepingTask` + `MaintenanceOrder` reference rooms/assets, produce expenses.
  - `FnbMenuItem` consumes `InventoryItems` via recipe lines.
  - `PayrollRun` aggregates `Employee` timesheets and posts financial entries.
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
- Finance teams follow accrual accounting and require GAAP-compliant outputs.
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

- **SLA (Service Level Agreement)**: A commitment between a service provider and a client regarding the level of service expected, including response times, uptime guarantees, and resolution timeframes. In this PRD, SLA refers to task completion timeframes (e.g., housekeeping tasks completed within agreed time windows).

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
- What jurisdictions' compliance frameworks (e.g., local tax rules) are priority?

