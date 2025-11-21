# Entity Relationship Diagram (ERD)
## Hospitality Management Suite

## Table of Contents
1. [Entity Definitions](#entity-definitions)
2. [Relationships](#relationships)
3. [Entity Relationship Summary](#entity-relationship-summary)

---

## Entity Definitions

### Core Platform Entities

#### Property
Represents a hospitality business location (hotel, guest house, resort, etc.).

**Attributes:**
- `propertyId` (PK): Unique identifier
- `name`: Property name
- `address`: Physical address
- `contactNumber`: Primary contact phone
- `email`: Contact email
- `timezone`: Timezone for the property
- `currency`: Default currency code
- `taxId`: Business tax identification number
- `isActive`: Active status flag
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Central entity that all other entities are scoped to, enabling multi-property support with tenant isolation.

---

#### User
Represents system users (staff members, managers, administrators) who access the platform.

**Attributes:**
- `userId` (PK): Unique identifier
- `externalId`: External authentication provider ID (for SSO)
- `email`: User email (unique)
- `name`: Full name
- `phone`: Contact phone number
- `isActive`: Active status flag
- `lastLoginAt`: Timestamp of last login
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Manages user authentication and basic profile information. Links to Employee for operational data.

---

#### Role
Defines user roles and permissions for RBAC (Role-Based Access Control).

**Attributes:**
- `roleId` (PK): Unique identifier
- `name`: Role name (e.g., "Finance Manager", "Housekeeping Supervisor")
- `description`: Role description
- `permissions`: JSON object defining permissions
- `isSystemRole`: Flag for system-defined vs custom roles
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Implements RBAC to control access to features and data based on user roles.

---

#### UserRole
Junction table linking users to roles and properties (many-to-many relationship).

**Attributes:**
- `userRoleId` (PK): Unique identifier
- `userId` (FK): Reference to User
- `roleId` (FK): Reference to Role
- `propertyId` (FK): Reference to Property
- `assignedAt`: Timestamp of assignment
- `assignedBy`: User ID who assigned the role

**Purpose**: Enables users to have different roles at different properties, supporting multi-property access.

---

### Room Management Entities

#### RoomType
Defines categories of rooms (e.g., Standard, Deluxe, Suite).

**Attributes:**
- `roomTypeId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `name`: Room type name
- `description`: Description of room type
- `maxOccupancy`: Maximum number of guests
- `baseRate`: Base nightly rate
- `amenities`: JSON array of amenities
- `isActive`: Active status flag
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Standardizes room categorization and pricing structure.

---

#### Room
Represents individual physical rooms within a property.

**Attributes:**
- `roomId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `roomTypeId` (FK): Reference to RoomType
- `roomNumber`: Room number/identifier
- `floor`: Floor number
- `status`: Current status (available, occupied, out-of-order, maintenance)
- `lastCleanedAt`: Timestamp of last cleaning
- `notes`: Additional notes
- `isActive`: Active status flag
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Tracks individual room inventory, status, and maintenance needs.

---

#### Guest
Represents customers/guests who make reservations.

**Attributes:**
- `guestId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property (optional, for property-specific guests)
- `firstName`: First name
- `lastName`: Last name
- `email`: Email address
- `phone`: Phone number
- `address`: Physical address
- `dateOfBirth`: Date of birth
- `loyaltyNumber`: Loyalty program number
- `preferences`: JSON object for guest preferences
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Maintains guest profiles and history for personalized service and repeat bookings.

---

#### Reservation
Represents room bookings/reservations.

**Attributes:**
- `reservationId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `roomId` (FK): Reference to Room
- `guestId` (FK): Reference to Guest
- `confirmationNumber`: Unique confirmation code
- `checkInDate`: Check-in date
- `checkOutDate`: Check-out date
- `numberOfGuests`: Number of guests
- `rate`: Nightly rate
- `totalAmount`: Total reservation amount
- `depositAmount`: Deposit paid
- `status`: Status (pending, confirmed, checked-in, checked-out, cancelled)
- `source`: Booking source (direct, OTA, walk-in, etc.)
- `specialRequests`: Special requests/notes
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update
- `checkedInAt`: Check-in timestamp
- `checkedOutAt`: Check-out timestamp

**Purpose**: Core entity for room revenue tracking, occupancy management, and guest service coordination.

---

#### RatePlan
Defines pricing plans and promotional rates.

**Attributes:**
- `ratePlanId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `roomTypeId` (FK): Reference to RoomType
- `name`: Rate plan name
- `description`: Description
- `baseRate`: Base rate amount
- `discountPercent`: Discount percentage (if applicable)
- `validFrom`: Start date
- `validTo`: End date
- `isActive`: Active status flag
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Manages dynamic pricing, promotions, and seasonal rates.

---

#### HousekeepingTask
Represents housekeeping assignments and task tracking.

**Attributes:**
- `taskId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `roomId` (FK): Reference to Room
- `assignedTo` (FK): Reference to Employee
- `taskType`: Type (checkout, stayover, deep-clean, inspection)
- `status`: Status (pending, in-progress, completed, skipped)
- `priority`: Priority level
- `scheduledAt`: Scheduled start time
- `startedAt`: Actual start time
- `completedAt`: Actual completion time
- `estimatedDuration`: Estimated duration in minutes
- `actualDuration`: Actual duration in minutes
- `notes`: Task notes
- `checklist`: JSON array of checklist items
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Tracks housekeeping operations, productivity, and room readiness for revenue optimization.

---

### Food & Beverage Management Entities

#### FnbMenuItem
Represents menu items (food, beverages) available for sale.

**Attributes:**
- `menuItemId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `name`: Item name
- `description`: Item description
- `category`: Category (appetizer, main, dessert, beverage, etc.)
- `subcategory`: Subcategory (alcoholic, non-alcoholic, etc.)
- `price`: Selling price
- `cost`: Estimated cost (from recipe)
- `isAvailable`: Availability flag
- `imageUrl`: Image URL
- `preparationTime`: Estimated preparation time in minutes
- `isActive`: Active status flag
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Menu catalog for POS operations and revenue tracking.

---

#### Recipe
Defines recipes for menu items, linking to inventory for cost calculation.

**Attributes:**
- `recipeId` (PK): Unique identifier
- `menuItemId` (FK): Reference to FnbMenuItem
- `name`: Recipe name
- `servings`: Number of servings
- `instructions`: Cooking instructions
- `totalCost`: Calculated total cost
- `lastCalculatedAt`: Timestamp of last cost calculation
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Enables recipe costing and automatic menu item cost updates when ingredient prices change.

---

#### RecipeLine
Junction table linking recipes to inventory items with quantities.

**Attributes:**
- `recipeLineId` (PK): Unique identifier
- `recipeId` (FK): Reference to Recipe
- `inventoryItemId` (FK): Reference to InventoryItem
- `quantity`: Quantity required
- `unit`: Unit of measurement
- `wastePercent`: Expected waste percentage
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Defines ingredient requirements for recipes, enabling automatic cost calculation and inventory deduction.

---

#### Table
Represents restaurant tables for table management.

**Attributes:**
- `tableId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `tableNumber`: Table identifier
- `capacity`: Maximum seating capacity
- `section`: Restaurant section
- `status`: Status (available, occupied, reserved, out-of-service)
- `currentOrderId` (FK): Reference to Order (optional)
- `isActive`: Active status flag
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Manages table assignments and order routing for restaurant operations.

---

#### Order
Represents POS orders (dine-in, takeout, room service, bar).

**Attributes:**
- `orderId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `tableId` (FK): Reference to Table (optional, for dine-in)
- `reservationId` (FK): Reference to Reservation (optional, for room service)
- `orderType`: Type (dine-in, takeout, room-service, bar)
- `status`: Status (pending, in-progress, ready, completed, cancelled)
- `subtotal`: Subtotal amount
- `taxAmount`: Tax amount
- `discountAmount`: Discount amount
- `totalAmount`: Total amount
- `serverId` (FK): Reference to Employee
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update
- `completedAt`: Completion timestamp

**Purpose**: Core entity for F&B sales tracking and revenue generation.

---

#### OrderLine
Represents individual items within an order.

**Attributes:**
- `orderLineId` (PK): Unique identifier
- `orderId` (FK): Reference to Order
- `menuItemId` (FK): Reference to FnbMenuItem
- `quantity`: Quantity ordered
- `unitPrice`: Price per unit at time of order
- `totalPrice`: Total line amount (quantity × unitPrice)
- `specialInstructions`: Special instructions
- `status`: Status (pending, preparing, ready, served, cancelled)
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Tracks individual menu items in orders for detailed sales analysis and inventory deduction.

---

### Inventory Management Entities

#### InventoryItem
Represents stock items (ingredients, supplies, amenities, etc.).

**Attributes:**
- `inventoryItemId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `supplierId` (FK): Reference to Supplier (optional)
- `sku`: Stock Keeping Unit identifier
- `name`: Item name
- `category`: Category (F&B ingredient, cleaning supply, amenity, spare part, etc.)
- `unit`: Unit of measurement (kg, liter, piece, etc.)
- `currentQuantity`: Current stock quantity
- `reorderPoint`: Minimum quantity before reorder
- `reorderQuantity`: Standard reorder quantity
- `unitCost`: Current unit cost
- `lastCostUpdate`: Timestamp of last cost update
- `location`: Storage location
- `isActive`: Active status flag
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Central inventory tracking for all stock items across F&B, housekeeping, and maintenance.

---

#### InventoryTransaction
Tracks all inventory movements (additions, removals, adjustments).

**Attributes:**
- `transactionId` (PK): Unique identifier
- `inventoryItemId` (FK): Reference to InventoryItem
- `transactionType`: Type (purchase, usage, adjustment, waste, transfer)
- `quantity`: Quantity change (positive for additions, negative for removals)
- `unitCost`: Unit cost at time of transaction
- `totalCost`: Total cost (quantity × unitCost)
- `referenceType`: Reference entity type (PurchaseOrder, OrderLine, HousekeepingTask, etc.)
- `referenceId`: Reference entity ID
- `reason`: Reason/notes
- `performedBy` (FK): Reference to Employee
- `transactionDate`: Transaction timestamp
- `createdAt`: Timestamp of creation

**Purpose**: Maintains complete audit trail of inventory movements for cost tracking and reconciliation.

---

#### Supplier
Represents vendors/suppliers for procurement.

**Attributes:**
- `supplierId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `name`: Supplier name
- `contactPerson`: Contact person name
- `email`: Contact email
- `phone`: Contact phone
- `address`: Physical address
- `paymentTerms`: Payment terms (e.g., "Net 30")
- `taxId`: Supplier tax ID
- `isActive`: Active status flag
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Manages supplier relationships and procurement workflows.

---

#### PurchaseOrder
Represents purchase orders for inventory restocking.

**Attributes:**
- `purchaseOrderId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `supplierId` (FK): Reference to Supplier
- `orderNumber`: Unique PO number
- `orderDate`: Order date
- `expectedDeliveryDate`: Expected delivery date
- `status`: Status (draft, sent, confirmed, received, cancelled)
- `subtotal`: Subtotal amount
- `taxAmount`: Tax amount
- `shippingAmount`: Shipping cost
- `totalAmount`: Total amount
- `createdBy` (FK): Reference to Employee
- `approvedBy` (FK): Reference to Employee (optional)
- `approvedAt`: Approval timestamp
- `receivedAt`: Receipt timestamp
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Manages procurement process and inventory restocking workflows. **Document Requirement**: All purchase orders must have supplier invoices, delivery notes/receipts, and payment confirmations attached via the Document entity. Documents enable three-way matching (PO, invoice, receipt) for procurement audit compliance and cost verification.

---

#### PurchaseOrderLine
Represents individual items in a purchase order.

**Attributes:**
- `purchaseOrderLineId` (PK): Unique identifier
- `purchaseOrderId` (FK): Reference to PurchaseOrder
- `inventoryItemId` (FK): Reference to InventoryItem
- `quantity`: Quantity ordered
- `unitPrice`: Unit price
- `totalPrice`: Total line amount
- `receivedQuantity`: Quantity received
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Tracks individual line items in purchase orders for detailed procurement management.

---

### Payroll Management Entities

#### Employee
Represents staff members/employees.

**Attributes:**
- `employeeId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `userId` (FK): Reference to User (optional, for system access)
- `employeeNumber`: Unique employee number
- `firstName`: First name
- `lastName`: Last name
- `email`: Email address
- `phone`: Phone number
- `dateOfBirth`: Date of birth
- `address`: Physical address
- `hireDate`: Hire date
- `terminationDate`: Termination date (optional)
- `employmentStatus`: Status (active, terminated, on-leave)
- `department`: Department (front-office, housekeeping, F&B, maintenance, etc.)
- `position`: Job title/position
- `baseSalary`: Base salary amount
- `hourlyRate`: Hourly rate (if applicable)
- `payFrequency`: Pay frequency (weekly, bi-weekly, monthly)
- `taxId`: Tax identification number
- `bankAccount`: Bank account details (encrypted)
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Manages employee information for payroll, scheduling, and task assignment.

---

#### Timesheet
Tracks employee work hours and attendance.

**Attributes:**
- `timesheetId` (PK): Unique identifier
- `employeeId` (FK): Reference to Employee
- `propertyId` (FK): Reference to Property
- `workDate`: Work date
- `clockInTime`: Clock-in timestamp
- `clockOutTime`: Clock-out timestamp
- `regularHours`: Regular hours worked
- `overtimeHours`: Overtime hours worked
- `breakDuration`: Break duration in minutes
- `status`: Status (draft, submitted, approved, rejected)
- `approvedBy` (FK): Reference to Employee (supervisor)
- `approvedAt`: Approval timestamp
- `notes`: Notes
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Records work hours for payroll calculation and labor cost tracking.

---

#### PayrollRun
Represents a payroll processing period/run.

**Attributes:**
- `payrollRunId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `payPeriodStart`: Pay period start date
- `payPeriodEnd`: Pay period end date
- `payDate`: Pay date
- `status`: Status (draft, calculated, approved, processed, paid)
- `totalGrossPay`: Total gross pay
- `totalDeductions`: Total deductions
- `totalNetPay`: Total net pay
- `createdBy` (FK): Reference to Employee
- `approvedBy` (FK): Reference to Employee
- `approvedAt`: Approval timestamp
- `processedAt`: Processing timestamp
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Manages payroll processing cycles and generates financial journal entries.

---

#### PayrollRunLine
Represents individual employee payroll entries within a payroll run.

**Attributes:**
- `payrollRunLineId` (PK): Unique identifier
- `payrollRunId` (FK): Reference to PayrollRun
- `employeeId` (FK): Reference to Employee
- `regularHours`: Regular hours
- `overtimeHours`: Overtime hours
- `regularPay`: Regular pay amount
- `overtimePay`: Overtime pay amount
- `grossPay`: Gross pay amount
- `deductions`: JSON object for deductions (tax, insurance, etc.)
- `totalDeductions`: Total deductions amount
- `netPay`: Net pay amount
- `gratuityAmount`: Gratuity/tip allocation
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Tracks individual employee payroll calculations within each payroll run.

---

### Maintenance Management Entities

#### Asset
Represents physical assets (equipment, furniture, fixtures) requiring maintenance.

**Attributes:**
- `assetId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `roomId` (FK): Reference to Room (optional, if room-specific)
- `assetTag`: Asset tag/identifier
- `name`: Asset name
- `category`: Category (HVAC, plumbing, electrical, furniture, etc.)
- `manufacturer`: Manufacturer name
- `model`: Model number
- `serialNumber`: Serial number
- `purchaseDate`: Purchase date
- `purchaseCost`: Purchase cost
- `depreciationMethod`: Depreciation method (straight-line, etc.)
- `usefulLife`: Useful life in years
- `currentValue`: Current depreciated value
- `location`: Physical location
- `status`: Status (operational, maintenance, retired)
- `lastMaintenanceDate`: Last maintenance date
- `nextMaintenanceDate`: Next scheduled maintenance date
- `warrantyExpiry`: Warranty expiry date
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Tracks assets for maintenance scheduling, cost tracking, and depreciation.

---

#### MaintenanceOrder
Represents maintenance work orders/requests.

**Attributes:**
- `maintenanceOrderId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `assetId` (FK): Reference to Asset
- `roomId` (FK): Reference to Room (optional)
- `requestedBy` (FK): Reference to Employee
- `assignedTo` (FK): Reference to Employee (maintenance staff)
- `orderType`: Type (preventive, corrective, emergency, inspection)
- `priority`: Priority level (low, medium, high, urgent)
- `title`: Order title
- `description`: Detailed description
- `status`: Status (open, assigned, in-progress, completed, cancelled)
- `scheduledDate`: Scheduled date
- `startedAt`: Start timestamp
- `completedAt`: Completion timestamp
- `estimatedCost`: Estimated cost
- `actualCost`: Actual cost
- `slaDeadline`: SLA deadline timestamp
- `resolutionNotes`: Resolution notes
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Manages maintenance workflows, tracks costs, and ensures asset reliability. **Document Requirement**: Maintenance work orders should include vendor invoices, work completion certificates, warranty documents, and payment receipts linked via the Document entity for cost verification and warranty tracking.

---

### Financial Management Entities

#### ChartOfAccounts
Defines the chart of accounts structure for GL (General Ledger).

**Attributes:**
- `accountId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `accountCode`: Account code (e.g., "4000", "5000")
- `accountName`: Account name
- `accountType`: Type (asset, liability, equity, revenue, expense)
- `parentAccountId` (FK): Reference to ChartOfAccounts (for hierarchical structure)
- `isActive`: Active status flag
- `description`: Account description
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Defines the accounting structure for financial reporting and journal entry mapping.

---

#### JournalEntry
Represents accounting journal entries for GL posting.

**Attributes:**
- `journalEntryId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `entryNumber`: Unique entry number
- `entryDate`: Entry date
- `entryType`: Type (manual, automatic, adjustment, reversal)
- `referenceType`: Source entity type (Reservation, Order, PayrollRun, Expense, etc.)
- `referenceId`: Source entity ID
- `description`: Entry description
- `totalDebit`: Total debit amount
- `totalCredit`: Total credit amount
- `status`: Status (draft, posted, reversed)
- `postedAt`: Posting timestamp
- `postedBy` (FK): Reference to Employee
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Records all financial transactions in the GL for accounting and reporting.

---

#### JournalEntryLine
Represents individual debit/credit lines within a journal entry.

**Attributes:**
- `journalEntryLineId` (PK): Unique identifier
- `journalEntryId` (FK): Reference to JournalEntry
- `accountId` (FK): Reference to ChartOfAccounts
- `debitAmount`: Debit amount
- `creditAmount`: Credit amount
- `description`: Line description
- `createdAt`: Timestamp of creation

**Purpose**: Implements double-entry bookkeeping with debits and credits per account.

---

#### Expense
Represents business expenses (utilities, supplies, maintenance, etc.).

**Attributes:**
- `expenseId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `category`: Category (utilities, supplies, staff, maintenance, other)
- `subcategory`: Subcategory
- `amount`: Expense amount
- `expenseDate`: Expense date
- `description`: Description
- `vendor`: Vendor name
- `invoiceNumber`: Invoice number
- `status`: Status (draft, submitted, approved, paid, rejected)
- `submittedBy` (FK): Reference to Employee
- `approvedBy` (FK): Reference to Employee
- `approvedAt`: Approval timestamp
- `glAccountId` (FK): Reference to ChartOfAccounts
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Tracks business expenses with approval workflows and GL mapping. **Document Requirement**: All expenses must have supporting documents (invoices, receipts, payment confirmations) attached via the Document entity before approval and payment processing. Documents serve as mandatory evidence of payment for audit compliance.

---

#### UtilityBill
Represents utility bills (electricity, water, gas, internet, etc.).

**Attributes:**
- `utilityBillId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `utilityType`: Type (electricity, water, gas, internet, phone, etc.)
- `provider`: Utility provider name
- `accountNumber`: Account number
- `billingPeriodStart`: Billing period start date
- `billingPeriodEnd`: Billing period end date
- `dueDate`: Due date
- `amount`: Bill amount
- `usageAmount`: Usage amount (kWh, gallons, etc.)
- `unitRate`: Rate per unit
- `meterReading`: Meter reading
- `previousMeterReading`: Previous meter reading
- `status`: Status (pending, paid, overdue)
- `paidAt`: Payment timestamp
- `glAccountId` (FK): Reference to ChartOfAccounts
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Tracks utility consumption, costs, and payment status for expense management. **Document Requirement**: Original utility bill documents and payment receipts must be uploaded and linked via the Document entity for verification and audit compliance.

---

#### Payment
Represents payments received or made (for reservations, orders, expenses, etc.).

**Attributes:**
- `paymentId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `paymentType`: Type (reservation, order, expense, payroll, etc.)
- `referenceType`: Reference entity type
- `referenceId`: Reference entity ID
- `amount`: Payment amount
- `paymentMethod`: Method (cash, card, bank_transfer, digital_wallet, check)
- `paymentDate`: Payment date
- `transactionId`: External transaction ID (from payment gateway)
- `status`: Status (pending, completed, failed, refunded)
- `processedBy` (FK): Reference to Employee
- `notes`: Notes
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Tracks all payments for cash flow management and reconciliation. **Document Requirement**: Payment receipts, bank statements, and transaction confirmations should be linked via the Document entity for payment verification and bank reconciliation. Documents provide evidence of payment completion for audit trails.

---

### Reporting & Analytics Entities

#### Report
Represents saved report configurations and cached report data.

**Attributes:**
- `reportId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `name`: Report name
- `reportType`: Type (daily-flash, monthly-statement, yearly-trend, custom, etc.)
- `configuration`: JSON object with report parameters (filters, date ranges, etc.)
- `createdBy` (FK): Reference to Employee
- `isScheduled`: Scheduled report flag
- `scheduleFrequency`: Schedule frequency (daily, weekly, monthly)
- `lastRunAt`: Last run timestamp
- `nextRunAt`: Next scheduled run timestamp
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Stores report configurations and enables scheduled report generation.

---

#### ReportSnapshot
Stores cached report data for performance and historical tracking.

**Attributes:**
- `snapshotId` (PK): Unique identifier
- `reportId` (FK): Reference to Report
- `snapshotDate`: Snapshot date
- `data`: JSON object with report data
- `generatedAt`: Generation timestamp
- `generatedBy` (FK): Reference to Employee (optional)

**Purpose**: Caches report results for fast retrieval and historical comparison.

---

### Document Management Entities

#### Document
Represents uploaded documents (invoices, receipts, contracts, etc.) that serve as evidence of payment or transaction records.

**Attributes:**
- `documentId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `documentType`: Type (invoice, receipt, contract, delivery-note, payment-confirmation, utility-bill, etc.)
- `fileName`: Original file name
- `fileUrl`: Storage URL/path to the document file
- `fileSize`: File size in bytes
- `mimeType`: MIME type (e.g., "application/pdf", "image/jpeg")
- `uploadedBy` (FK): Reference to Employee
- `uploadedAt`: Upload timestamp
- `description`: Document description/notes
- `referenceType`: Reference entity type (Expense, UtilityBill, PurchaseOrder, Payment, MaintenanceOrder, etc.)
- `referenceId`: Reference entity ID
- `documentDate`: Document date (from the document itself, e.g., invoice date)
- `amount`: Amount shown on document (for invoices/receipts)
- `isVerified`: Verification flag (document has been reviewed/verified)
- `verifiedBy` (FK): Reference to Employee (optional)
- `verifiedAt`: Verification timestamp (optional)
- `ocrData`: Extracted text/data from OCR processing (JSON, optional)
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Centralized document storage for all payment evidence and transaction records. Enables audit trails, compliance verification, and automated document processing (OCR). Documents can be linked to multiple entity types through the flexible referenceType/referenceId pattern.

---

### Integration & System Entities

#### Integration
Represents external system integrations (PMS, POS, accounting, etc.).

**Attributes:**
- `integrationId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `integrationType`: Type (PMS, POS, accounting, payment-gateway, OTA)
- `provider`: Provider name (e.g., "Cloudbeds", "Square", "QuickBooks")
- `status`: Status (active, inactive, error)
- `configuration`: JSON object with API keys, endpoints, etc. (encrypted)
- `lastSyncAt`: Last synchronization timestamp
- `syncFrequency`: Sync frequency
- `errorMessage`: Last error message (if any)
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Manages external system integrations and synchronization.

---

#### AuditLog
Tracks all system actions for compliance and security auditing.

**Attributes:**
- `auditLogId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `userId` (FK): Reference to User
- `action`: Action performed
- `entityType`: Entity type affected
- `entityId`: Entity ID affected
- `changes`: JSON object with before/after values
- `ipAddress`: IP address
- `userAgent`: User agent string
- `timestamp`: Action timestamp

**Purpose**: Provides immutable audit trail for compliance (SOC 2, GDPR) and security monitoring.

---

## Relationships

### Core Platform Relationships

#### Property ↔ User (Many-to-Many via UserRole)
- **Relationship**: A Property can have many Users, and a User can belong to many Properties.
- **Junction Entity**: UserRole
- **Explanation**: Enables multi-property support where users can access multiple properties with different roles at each. For example, a Finance Manager might oversee multiple hotel properties, each with different permission levels.

#### User ↔ Role (Many-to-Many via UserRole)
- **Relationship**: A User can have many Roles, and a Role can be assigned to many Users.
- **Junction Entity**: UserRole
- **Explanation**: Implements RBAC where users can have multiple roles (e.g., a person might be both a Housekeeping Supervisor and a Maintenance Coordinator). The UserRole junction also links to Property, enabling role-per-property assignments.

#### User ↔ Employee (One-to-One, Optional)
- **Relationship**: A User can optionally be linked to an Employee record.
- **Explanation**: Not all users are employees (e.g., external auditors, vendors). When a user is an employee, this link connects authentication (User) to operational data (Employee) for payroll, timesheets, and task assignments.

---

### Room Management Relationships

#### Property → Room (One-to-Many)
- **Relationship**: A Property has many Rooms.
- **Explanation**: Each property contains multiple physical rooms. Rooms are scoped to a single property for multi-property support.

#### Property → RoomType (One-to-Many)
- **Relationship**: A Property has many RoomTypes.
- **Explanation**: Each property defines its own room categories (e.g., "Standard", "Deluxe", "Suite"). RoomTypes are property-specific to allow different properties to have different categorization schemes.

#### RoomType → Room (One-to-Many)
- **Relationship**: A RoomType has many Rooms.
- **Explanation**: Multiple physical rooms can share the same room type. For example, rooms 101-110 might all be "Standard" rooms with the same base rate and amenities.

#### Property → Guest (One-to-Many, Optional)
- **Relationship**: A Property can have many Guests (optional for property-specific guest records).
- **Explanation**: Guests can be property-specific or shared across properties (depending on business model). This relationship enables property-level guest management and history.

#### Guest → Reservation (One-to-Many)
- **Relationship**: A Guest can have many Reservations.
- **Explanation**: Tracks guest booking history for repeat customers, preferences, and loyalty programs. A guest can make multiple reservations over time.

#### Room → Reservation (One-to-Many)
- **Relationship**: A Room can have many Reservations over time.
- **Explanation**: Tracks which room was assigned to each reservation. A room can have multiple reservations across different time periods (but not overlapping dates).

#### Property → Reservation (One-to-Many)
- **Relationship**: A Property has many Reservations.
- **Explanation**: All reservations are scoped to a property. This enables property-level revenue tracking and reporting.

#### RoomType → RatePlan (One-to-Many)
- **Relationship**: A RoomType can have many RatePlans.
- **Explanation**: Different pricing plans can apply to the same room type (e.g., "Standard Room - Early Bird", "Standard Room - Last Minute"). RatePlans define promotional rates and seasonal pricing.

#### Room → HousekeepingTask (One-to-Many)
- **Relationship**: A Room can have many HousekeepingTasks.
- **Explanation**: Tracks all housekeeping activities for each room (checkout cleaning, stayover service, deep cleaning, inspections). Enables productivity tracking and room readiness management.

#### Property → HousekeepingTask (One-to-Many)
- **Relationship**: A Property has many HousekeepingTasks.
- **Explanation**: All housekeeping tasks are scoped to a property for operational management.

#### Employee → HousekeepingTask (One-to-Many)
- **Relationship**: An Employee can be assigned many HousekeepingTasks.
- **Explanation**: Tracks which staff member is assigned to each task, enabling workload distribution and performance monitoring.

---

### Food & Beverage Management Relationships

#### Property → FnbMenuItem (One-to-Many)
- **Relationship**: A Property has many FnbMenuItems.
- **Explanation**: Each property maintains its own menu catalog. Menu items are property-specific to allow different properties to have different menus.

#### FnbMenuItem → Recipe (One-to-One)
- **Relationship**: A FnbMenuItem can have one Recipe.
- **Explanation**: Each menu item can have an associated recipe for cost calculation. Not all items require recipes (e.g., bottled beverages), so this is optional.

#### Recipe → RecipeLine (One-to-Many)
- **Relationship**: A Recipe has many RecipeLines.
- **Explanation**: A recipe consists of multiple ingredients, each defined by a RecipeLine that specifies the inventory item and quantity required.

#### InventoryItem → RecipeLine (One-to-Many)
- **Relationship**: An InventoryItem can be used in many RecipeLines.
- **Explanation**: The same ingredient (e.g., "Flour") can be used in multiple recipes. This relationship enables automatic cost calculation when ingredient prices change.

#### Property → Table (One-to-Many)
- **Relationship**: A Property has many Tables.
- **Explanation**: Restaurant tables are property-specific. Each property manages its own table layout and assignments.

#### Table → Order (One-to-Many, Optional)
- **Relationship**: A Table can have many Orders over time (one active order at a time).
- **Explanation**: Tracks which table an order is associated with for dine-in service. The currentOrderId in Table points to the active order.

#### Property → Order (One-to-Many)
- **Relationship**: A Property has many Orders.
- **Explanation**: All orders are scoped to a property for revenue tracking and reporting.

#### Reservation → Order (One-to-Many, Optional)
- **Relationship**: A Reservation can have many Orders (for room service).
- **Explanation**: Enables linking room service orders to guest reservations for billing and guest experience tracking.

#### Order → OrderLine (One-to-Many)
- **Relationship**: An Order has many OrderLines.
- **Explanation**: Each order contains multiple menu items. OrderLines track individual items, quantities, and prices for detailed sales analysis.

#### FnbMenuItem → OrderLine (One-to-Many)
- **Relationship**: A FnbMenuItem can appear in many OrderLines.
- **Explanation**: The same menu item can be ordered multiple times across different orders. This enables sales analysis by menu item.

#### Employee → Order (One-to-Many)
- **Relationship**: An Employee (server) can handle many Orders.
- **Explanation**: Tracks which staff member served each order for tip allocation and performance tracking.

---

### Inventory Management Relationships

#### Property → InventoryItem (One-to-Many)
- **Relationship**: A Property has many InventoryItems.
- **Explanation**: Each property maintains its own inventory. Inventory items are property-specific to support multi-property operations.

#### Supplier → InventoryItem (One-to-Many, Optional)
- **Relationship**: A Supplier can supply many InventoryItems.
- **Explanation**: Links inventory items to their primary suppliers for procurement workflows. An item can have a preferred supplier, but purchases can be made from other suppliers.

#### Property → Supplier (One-to-Many)
- **Relationship**: A Property has many Suppliers.
- **Explanation**: Each property manages its own supplier relationships. Suppliers can be property-specific or shared (depending on business model).

#### InventoryItem → InventoryTransaction (One-to-Many)
- **Relationship**: An InventoryItem has many InventoryTransactions.
- **Explanation**: Tracks all movements (purchases, usage, adjustments) for each inventory item. Provides complete audit trail for cost tracking and reconciliation.

#### InventoryTransaction → PurchaseOrder (Many-to-One, Optional)
- **Relationship**: An InventoryTransaction can reference a PurchaseOrder (via referenceType and referenceId).
- **Explanation**: When inventory is added via a purchase order, the transaction links back to the PO for traceability.

#### InventoryTransaction → OrderLine (Many-to-One, Optional)
- **Relationship**: An InventoryTransaction can reference an OrderLine (via referenceType and referenceId).
- **Explanation**: When inventory is deducted due to F&B sales, the transaction links to the OrderLine that consumed the inventory, enabling recipe-based inventory deduction.

#### InventoryTransaction → HousekeepingTask (Many-to-One, Optional)
- **Relationship**: An InventoryTransaction can reference a HousekeepingTask (via referenceType and referenceId).
- **Explanation**: When housekeeping uses supplies (e.g., cleaning products, linens), the inventory deduction links to the task for cost tracking.

#### Property → PurchaseOrder (One-to-Many)
- **Relationship**: A Property has many PurchaseOrders.
- **Explanation**: All purchase orders are scoped to a property for procurement management.

#### Supplier → PurchaseOrder (One-to-Many)
- **Relationship**: A Supplier can receive many PurchaseOrders.
- **Explanation**: Tracks all purchase orders placed with each supplier for vendor relationship management and spend analysis.

#### PurchaseOrder → PurchaseOrderLine (One-to-Many)
- **Relationship**: A PurchaseOrder has many PurchaseOrderLines.
- **Explanation**: Each purchase order contains multiple line items. PurchaseOrderLines specify quantities and prices for each item ordered.

#### InventoryItem → PurchaseOrderLine (One-to-Many)
- **Relationship**: An InventoryItem can appear in many PurchaseOrderLines.
- **Explanation**: The same inventory item can be ordered multiple times across different purchase orders. Enables procurement history and price tracking.

#### Employee → PurchaseOrder (One-to-Many)
- **Relationship**: An Employee can create many PurchaseOrders.
- **Explanation**: Tracks who created and approved each purchase order for accountability and workflow management.

---

### Payroll Management Relationships

#### Property → Employee (One-to-Many)
- **Relationship**: A Property has many Employees.
- **Explanation**: All employees are scoped to a property. Enables property-level payroll management and labor cost tracking.

#### Employee → Timesheet (One-to-Many)
- **Relationship**: An Employee has many Timesheets.
- **Explanation**: Tracks work hours for each employee across multiple time periods. Timesheets are used for payroll calculation.

#### Property → Timesheet (One-to-Many)
- **Relationship**: A Property has many Timesheets.
- **Explanation**: All timesheets are scoped to a property for property-level labor cost tracking.

#### Employee → Timesheet (Many-to-One, as Approver)
- **Relationship**: An Employee (supervisor) can approve many Timesheets.
- **Explanation**: Tracks which supervisor approved each timesheet for workflow management.

#### Property → PayrollRun (One-to-Many)
- **Relationship**: A Property has many PayrollRuns.
- **Explanation**: Each property processes its own payroll runs. Enables property-level payroll management.

#### PayrollRun → PayrollRunLine (One-to-Many)
- **Relationship**: A PayrollRun has many PayrollRunLines.
- **Explanation**: Each payroll run contains entries for multiple employees. PayrollRunLines calculate individual employee pay within the run.

#### Employee → PayrollRunLine (One-to-Many)
- **Relationship**: An Employee can have many PayrollRunLines (one per payroll run).
- **Explanation**: Tracks payroll history for each employee across multiple pay periods.

#### Employee → PayrollRun (Many-to-One, as Creator/Approver)
- **Relationship**: An Employee can create and approve many PayrollRuns.
- **Explanation**: Tracks who created and approved each payroll run for workflow management and audit purposes.

---

### Maintenance Management Relationships

#### Property → Asset (One-to-Many)
- **Relationship**: A Property has many Assets.
- **Explanation**: All assets are scoped to a property. Enables property-level asset management and depreciation tracking.

#### Room → Asset (One-to-Many, Optional)
- **Relationship**: A Room can have many Assets.
- **Explanation**: Some assets are room-specific (e.g., TV, mini-fridge). This relationship enables room-level asset tracking and maintenance scheduling.

#### Asset → MaintenanceOrder (One-to-Many)
- **Relationship**: An Asset can have many MaintenanceOrders.
- **Explanation**: Tracks all maintenance work performed on each asset over time. Enables maintenance history and preventive scheduling.

#### Property → MaintenanceOrder (One-to-Many)
- **Relationship**: A Property has many MaintenanceOrders.
- **Explanation**: All maintenance orders are scoped to a property for operational management.

#### Room → MaintenanceOrder (One-to-Many, Optional)
- **Relationship**: A Room can have many MaintenanceOrders.
- **Explanation**: Some maintenance orders are room-specific (e.g., fixing a broken AC unit in room 205). Enables room-level maintenance tracking.

#### Employee → MaintenanceOrder (One-to-Many, as Requester)
- **Relationship**: An Employee can request many MaintenanceOrders.
- **Explanation**: Tracks who requested each maintenance order for communication and workflow management.

#### Employee → MaintenanceOrder (One-to-Many, as Assignee)
- **Relationship**: An Employee (maintenance staff) can be assigned many MaintenanceOrders.
- **Explanation**: Tracks which maintenance staff member is assigned to each work order for workload distribution and performance tracking.

---

### Financial Management Relationships

#### Property → ChartOfAccounts (One-to-Many)
- **Relationship**: A Property has many ChartOfAccounts entries.
- **Explanation**: Each property maintains its own chart of accounts. Enables property-specific accounting structures while supporting standardized templates.

#### ChartOfAccounts → ChartOfAccounts (Self-Referential, One-to-Many)
- **Relationship**: A ChartOfAccounts entry can have many child accounts (hierarchical structure).
- **Explanation**: Enables hierarchical account structures (e.g., "Revenue" → "Room Revenue" → "Standard Room Revenue"). Parent accounts aggregate child account balances.

#### Property → JournalEntry (One-to-Many)
- **Relationship**: A Property has many JournalEntries.
- **Explanation**: All journal entries are scoped to a property for property-level financial reporting.

#### JournalEntry → JournalEntryLine (One-to-Many)
- **Relationship**: A JournalEntry has many JournalEntryLines.
- **Explanation**: Implements double-entry bookkeeping. Each journal entry contains multiple lines (debits and credits) that must balance.

#### ChartOfAccounts → JournalEntryLine (One-to-Many)
- **Relationship**: A ChartOfAccounts entry can appear in many JournalEntryLines.
- **Explanation**: Each journal entry line posts to a specific GL account. Enables account-level transaction tracking and balance calculation.

#### JournalEntry → Reservation (Many-to-One, Optional)
- **Relationship**: A JournalEntry can reference a Reservation (via referenceType and referenceId).
- **Explanation**: When room revenue is posted to the GL, the journal entry links to the source reservation for traceability and reconciliation.

#### JournalEntry → Order (Many-to-One, Optional)
- **Relationship**: A JournalEntry can reference an Order (via referenceType and referenceId).
- **Explanation**: When F&B revenue is posted to the GL, the journal entry links to the source order for traceability.

#### JournalEntry → PayrollRun (Many-to-One, Optional)
- **Relationship**: A JournalEntry can reference a PayrollRun (via referenceType and referenceId).
- **Explanation**: When payroll expenses are posted to the GL, the journal entry links to the source payroll run for traceability.

#### JournalEntry → Expense (Many-to-One, Optional)
- **Relationship**: A JournalEntry can reference an Expense (via referenceType and referenceId).
- **Explanation**: When expenses are posted to the GL, the journal entry links to the source expense for traceability.

#### Property → Expense (One-to-Many)
- **Relationship**: A Property has many Expenses.
- **Explanation**: All expenses are scoped to a property for property-level expense tracking and reporting.

#### ChartOfAccounts → Expense (One-to-Many)
- **Relationship**: A ChartOfAccounts entry can be mapped to many Expenses.
- **Explanation**: Each expense is mapped to a GL account for proper categorization and reporting.

#### Employee → Expense (One-to-Many, as Submitter/Approver)
- **Relationship**: An Employee can submit and approve many Expenses.
- **Explanation**: Tracks who submitted and approved each expense for workflow management and accountability.

#### Property → UtilityBill (One-to-Many)
- **Relationship**: A Property has many UtilityBills.
- **Explanation**: All utility bills are scoped to a property for property-level utility cost tracking.

#### ChartOfAccounts → UtilityBill (One-to-Many)
- **Relationship**: A ChartOfAccounts entry can be mapped to many UtilityBills.
- **Explanation**: Each utility bill is mapped to a GL account (typically an expense account) for proper categorization.

#### Property → Payment (One-to-Many)
- **Relationship**: A Property has many Payments.
- **Explanation**: All payments are scoped to a property for property-level cash flow tracking.

#### Payment → Reservation (Many-to-One, Optional)
- **Relationship**: A Payment can reference a Reservation (via referenceType and referenceId).
- **Explanation**: Tracks payments received for room bookings. Enables payment reconciliation and accounts receivable management.

#### Payment → Order (Many-to-One, Optional)
- **Relationship**: A Payment can reference an Order (via referenceType and referenceId).
- **Explanation**: Tracks payments received for F&B orders. Enables payment reconciliation.

#### Payment → Expense (Many-to-One, Optional)
- **Relationship**: A Payment can reference an Expense (via referenceType and referenceId).
- **Explanation**: Tracks payments made for expenses. Enables accounts payable management and cash flow tracking.

#### Payment → PayrollRun (Many-to-One, Optional)
- **Relationship**: A Payment can reference a PayrollRun (via referenceType and referenceId).
- **Explanation**: Tracks payments made for payroll. Enables payroll payment reconciliation.

---

### Document Management Relationships

#### Property → Document (One-to-Many)
- **Relationship**: A Property has many Documents.
- **Explanation**: All documents are scoped to a property for property-level document management and compliance. Enables tenant isolation for document storage.

#### Document → Expense (Many-to-One, Optional but Recommended)
- **Relationship**: A Document can reference an Expense (via referenceType and referenceId).
- **Explanation**: Links invoices, receipts, and other payment evidence to expenses. **Document Requirement**: All expenses should have at least one supporting document (invoice or receipt) attached before approval and payment processing. An expense can have multiple documents (e.g., invoice, receipt, approval form, payment confirmation). Enables complete audit trail for expense claims and reimbursements, and is mandatory for compliance and audit purposes.

#### Document → UtilityBill (Many-to-One, Optional but Recommended)
- **Relationship**: A Document can reference a UtilityBill (via referenceType and referenceId).
- **Explanation**: Links utility bill documents (invoices, payment confirmations) to utility bill records. **Document Requirement**: All utility bills should have original bill documents and payment receipts attached for verification and audit compliance. Enables verification of utility charges and payment evidence for compliance and reconciliation.

#### Document → PurchaseOrder (Many-to-One, Optional but Recommended)
- **Relationship**: A Document can reference a PurchaseOrder (via referenceType and referenceId).
- **Explanation**: Links supplier invoices, delivery notes, and payment receipts to purchase orders. **Document Requirement**: All purchase orders should have supplier invoices, delivery notes/receipts, and payment confirmations attached. An order can have multiple documents (e.g., PO document, supplier invoice, delivery receipt, payment confirmation). Enables complete procurement audit trail and three-way matching (PO, invoice, receipt) for compliance and cost verification.

#### Document → Payment (Many-to-One, Optional)
- **Relationship**: A Document can reference a Payment (via referenceType and referenceId).
- **Explanation**: Links payment receipts, bank statements, and transaction confirmations to payment records. Enables payment verification and reconciliation with bank statements.

#### Document → MaintenanceOrder (Many-to-One, Optional but Recommended)
- **Relationship**: A Document can reference a MaintenanceOrder (via referenceType and referenceId).
- **Explanation**: Links maintenance invoices, work completion certificates, and warranty documents to maintenance orders. **Document Requirement**: Maintenance orders with vendor services should include vendor invoices and payment receipts. Work completion certificates and warranty documents should be attached for completed maintenance work. Enables cost verification and warranty tracking for audit compliance.

#### Employee → Document (One-to-Many, as Uploader)
- **Relationship**: An Employee can upload many Documents.
- **Explanation**: Tracks who uploaded each document for accountability and audit purposes. Enables document ownership and access control.

#### Employee → Document (One-to-Many, as Verifier)
- **Relationship**: An Employee can verify many Documents.
- **Explanation**: Tracks who verified/reviewed each document. Enables document verification workflows and quality control for financial records.

---

### Reporting & Analytics Relationships

#### Property → Report (One-to-Many)
- **Relationship**: A Property has many Reports.
- **Explanation**: Each property can have multiple saved report configurations. Reports are property-specific for data isolation.

#### Report → ReportSnapshot (One-to-Many)
- **Relationship**: A Report can have many ReportSnapshots.
- **Explanation**: Stores historical snapshots of report data. Enables trend analysis and performance comparison over time.

#### Employee → Report (One-to-Many, as Creator)
- **Relationship**: An Employee can create many Reports.
- **Explanation**: Tracks who created each report configuration for access control and audit purposes.

---

### Integration & System Relationships

#### Property → Integration (One-to-Many)
- **Relationship**: A Property has many Integrations.
- **Explanation**: Each property can have multiple external system integrations (PMS, POS, accounting, etc.). Integrations are property-specific to support different systems per property.

#### Property → AuditLog (One-to-Many)
- **Relationship**: A Property has many AuditLogs.
- **Explanation**: All audit logs are scoped to a property for property-level security and compliance monitoring.

#### User → AuditLog (One-to-Many)
- **Relationship**: A User can generate many AuditLogs.
- **Explanation**: Tracks all actions performed by each user for security monitoring, compliance auditing, and accountability.

---

## Entity Relationship Summary

### Cardinality Overview

**One-to-Many Relationships:**
- Property → Room, RoomType, Guest, Reservation, HousekeepingTask, FnbMenuItem, Table, Order, InventoryItem, Supplier, PurchaseOrder, Employee, Timesheet, PayrollRun, Asset, MaintenanceOrder, Expense, UtilityBill, Payment, ChartOfAccounts, JournalEntry, Report, Document, Integration, AuditLog
- RoomType → Room, RatePlan
- Room → Reservation, HousekeepingTask, Asset, MaintenanceOrder
- Guest → Reservation
- Employee → HousekeepingTask, Order, Timesheet, PurchaseOrder, PayrollRun, MaintenanceOrder, Expense, Document
- FnbMenuItem → Recipe, OrderLine
- Recipe → RecipeLine
- InventoryItem → RecipeLine, InventoryTransaction, PurchaseOrderLine
- Supplier → InventoryItem, PurchaseOrder
- PurchaseOrder → PurchaseOrderLine
- Order → OrderLine
- PayrollRun → PayrollRunLine
- Asset → MaintenanceOrder
- ChartOfAccounts → ChartOfAccounts (self-referential), JournalEntryLine, Expense, UtilityBill
- JournalEntry → JournalEntryLine
- Report → ReportSnapshot

**Many-to-Many Relationships (via Junction Tables):**
- Property ↔ User (via UserRole)
- User ↔ Role (via UserRole)

**One-to-One Relationships:**
- User ↔ Employee (optional)
- FnbMenuItem ↔ Recipe (optional)

**Optional Relationships:**
- Table → Order (current active order)
- Reservation → Order (room service)
- Room → Asset (room-specific assets)
- Room → MaintenanceOrder (room-specific maintenance)
- InventoryTransaction → Various entities (via referenceType/referenceId)
- JournalEntry → Various entities (via referenceType/referenceId)
- Payment → Various entities (via referenceType/referenceId)
- Document → Expense, UtilityBill, PurchaseOrder, Payment, MaintenanceOrder (via referenceType/referenceId)

### Key Design Patterns

1. **Multi-Property Support**: All major entities are scoped to Property, enabling tenant isolation and multi-property operations.

2. **Audit Trail**: AuditLog tracks all user actions, and InventoryTransaction/JournalEntry provide financial audit trails.

3. **Flexible Reference System**: JournalEntry, InventoryTransaction, Payment, and Document use referenceType/referenceId for polymorphic relationships, enabling flexible linking to various source entities.

4. **Hierarchical Structures**: ChartOfAccounts uses self-referential relationships for account hierarchies.

5. **Workflow Management**: Approval workflows are embedded in entities (Expense, PurchaseOrder, PayrollRun, Timesheet) with approver tracking.

6. **Cost Tracking**: Recipe costing, inventory costing, and asset depreciation are supported through relationships between InventoryItem, Recipe, RecipeLine, and Asset.

7. **Revenue Recognition**: Reservation and Order entities link to JournalEntry for automatic revenue posting to GL.

8. **Labor Cost Tracking**: Employee, Timesheet, and PayrollRun relationships enable comprehensive labor cost analysis.

9. **Document Management**: Document entity provides centralized storage for payment evidence (invoices, receipts) linked to expenditures (Expense, UtilityBill, PurchaseOrder, Payment, MaintenanceOrder). Enables complete audit trails, compliance verification, and automated document processing (OCR).

---

## Notes for Implementation

1. **Indexing Strategy**: Create indexes on foreign keys, date fields, and frequently queried fields (status, propertyId, etc.) for performance optimization.

2. **Soft Deletes**: Consider implementing soft deletes (isActive flags) rather than hard deletes for audit compliance.

3. **Data Encryption**: Sensitive fields (bankAccount, SSN, API keys) should be encrypted at rest.

4. **Cascading Rules**: Define appropriate cascade rules for deletions (e.g., deleting a Property should cascade to related entities, but deleting a Guest should not delete Reservations).

5. **Concurrency Control**: Implement optimistic locking (version fields) for entities frequently updated concurrently (InventoryItem, Room status, etc.).

6. **Data Retention**: Define retention policies for AuditLog, ReportSnapshot, and Document entities to manage storage costs while maintaining compliance requirements.

7. **Document Storage**: Implement secure document storage (e.g., S3, Azure Blob) with encryption at rest. Consider document versioning, access control, and automated OCR processing for invoice/receipt data extraction. Implement document lifecycle management (archive, delete) based on retention policies.

8. **Multi-Currency Support**: For Phase 2, add currency fields and exchange rate tracking to financial entities.

9. **Time Zone Handling**: Store all timestamps in UTC and convert to property timezone for display.

