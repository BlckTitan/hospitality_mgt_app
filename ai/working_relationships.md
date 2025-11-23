# Working Relationships: Real-Life Scenarios
## Hospitality Management Suite - Entity Interactions Explained

This document explains how the entities in the Hospitality Management Suite work together in real-world scenarios, using practical examples from a typical hotel operation.

---

## Table of Contents
1. [The Foundation: Property, Users, and Access Control](#the-foundation)
2. [A Guest's Journey: From Booking to Checkout](#guest-journey)
3. [Behind the Scenes: Room Operations](#room-operations)
4. [Food & Beverage: From Menu to Payment](#food-beverage)
5. [Inventory Management: From Purchase to Consumption](#inventory-management)
6. [People Management: Employees and Payroll](#people-management)
7. [Maintenance: Keeping Everything Running](#maintenance)
8. [Financial Management: The Money Trail](#financial-management)
9. [Document Management: The Paper Trail](#document-management)
10. [Reporting: Making Sense of It All](#reporting)

---

## The Foundation: Property, Users, and Access Control {#the-foundation}

### The Multi-Property Setup

Imagine a hospitality company that operates three properties:
- **Grand Hotel Downtown** (Property ID: 1)
- **Seaside Resort** (Property ID: 2)
- **Mountain Lodge** (Property ID: 3)

Each **Property** is completely isolated in the system. All rooms, employees, inventory, and financial records are scoped to a specific property. This means when you're logged in as a user at Grand Hotel Downtown, you only see data for that property.

### User Access and Roles

**Sarah Johnson** is a Finance Manager who oversees all three properties. In the system:
- **User** record: `userId: 101`, `email: sarah.johnson@company.com`
- **UserRole** records:
  - Property 1 (Grand Hotel): Role "Finance Manager" (can view all financials, approve expenses)
  - Property 2 (Seaside Resort): Role "Finance Manager" (same permissions)
  - Property 3 (Mountain Lodge): Role "Finance Viewer" (read-only access)

When Sarah logs in, the system checks her **UserRole** entries to determine which properties she can access and what she can do at each. She can switch between properties in the UI, and the system automatically filters all data to the selected property.

**Mike Chen** is a Housekeeping Supervisor at Grand Hotel Downtown only:
- **User** record: `userId: 102`
- **Employee** record: `employeeId: 201` (linked to `userId: 102`)
- **UserRole** record: Property 1, Role "Housekeeping Supervisor"

Mike's **User** account links to his **Employee** record, which means:
- He can clock in/out (creates **Timesheet** records)
- He can be assigned **HousekeepingTask** records
- His hours are tracked for **PayrollRun** calculations
- He can upload **Document** records (e.g., maintenance photos)

**Not all Users are Employees**: An external auditor might have a **User** account with "Auditor" role but no **Employee** record, since they're not on payroll.

---

## A Guest's Journey: From Booking to Checkout {#guest-journey}

### Scenario: John Smith Books a Room

**Step 1: Guest Profile Creation**

John Smith calls to book a room. The front desk agent searches for him in the **Guest** table. Not found, so they create a new record:
- `guestId: 5001`
- `firstName: "John"`
- `lastName: "Smith"`
- `email: "john.smith@email.com"`
- `phone: "+1-555-0123"`
- `propertyId: 1` (Grand Hotel Downtown)

The system stores this guest profile. If John returns in six months, his history is preserved.

**Step 2: Reservation Creation**

The agent checks available rooms. The system queries:
- **Room** table: `status = 'available'` AND `propertyId = 1`
- **RoomType** table: Finds "Deluxe Room" with `baseRate: $150/night`
- **RatePlan** table: Checks for active promotions (finds "Summer Special" with 10% discount)

A **Reservation** is created:
- `reservationId: 10001`
- `propertyId: 1`
- `guestId: 5001` (John Smith)
- `roomId: 205` (assigned room)
- `roomTypeId: 2` (Deluxe Room)
- `checkInDate: 2024-07-15`
- `checkOutDate: 2024-07-18` (3 nights)
- `rate: $135/night` (after discount)
- `totalAmount: $405`
- `status: "confirmed"`
- `confirmationNumber: "GH-2024-10001"`

**Step 3: Payment Processing**

John pays a $200 deposit via credit card. A **Payment** record is created:
- `paymentId: 3001`
- `propertyId: 1`
- `paymentType: "reservation"`
- `referenceType: "Reservation"`
- `referenceId: 10001`
- `amount: $200`
- `paymentMethod: "card"`
- `status: "completed"`

The **Reservation** record is updated: `depositAmount: $200`.

**Step 4: Check-In Day Arrives**

On July 15th, John arrives. The front desk:
1. Updates **Reservation**: `status: "checked-in"`, `checkedInAt: 2024-07-15 14:30:00`
2. Updates **Room**: `status: "occupied"`, `roomId: 205`
3. Creates a **HousekeepingTask** for stayover service:
   - `taskId: 4001`
   - `roomId: 205`
   - `taskType: "stayover"`
   - `status: "pending"`
   - `scheduledAt: 2024-07-16 10:00:00`
   - `assignedTo: 201` (Mike Chen, housekeeping supervisor)

**Step 5: Room Service Order**

John orders room service on July 16th. The system:
1. Creates an **Order**:
   - `orderId: 2001`
   - `propertyId: 1`
   - `reservationId: 10001` (links to John's reservation)
   - `orderType: "room-service"`
   - `serverId: 202` (F&B employee)
   - `status: "pending"`

2. Creates **OrderLine** records:
   - Line 1: `menuItemId: 50` (Caesar Salad), `quantity: 1`, `unitPrice: $12`
   - Line 2: `menuItemId: 75` (Grilled Salmon), `quantity: 1`, `unitPrice: $28`
   - Line 3: `menuItemId: 120` (Wine), `quantity: 1`, `unitPrice: $18`

3. Calculates totals: `subtotal: $58`, `taxAmount: $4.64`, `totalAmount: $62.64`

4. When the order is completed, inventory is automatically deducted (see [Inventory Management](#inventory-management) section).

**Step 6: Checkout**

On July 18th, John checks out:
1. **Reservation** updated: `status: "checked-out"`, `checkedOutAt: 2024-07-18 11:00:00`
2. Final payment processed: Remaining balance ($205) charged to card
3. **Payment** record created: `paymentId: 3002`, `amount: $205`, `referenceType: "Reservation"`, `referenceId: 10001`
4. **Room** updated: `status: "available"` (after cleaning)
5. **HousekeepingTask** created for checkout cleaning:
   - `taskId: 4002`
   - `roomId: 205`
   - `taskType: "checkout"`
   - `priority: "high"` (room needs to be ready for next guest)

**Step 7: Financial Posting**

At end of day, the system automatically creates **JournalEntry** records:
- **JournalEntry** `entryId: 5001`:
  - `referenceType: "Reservation"`
  - `referenceId: 10001`
  - `entryType: "automatic"`
  - `totalDebit: $405`, `totalCredit: $405`
  
- **JournalEntryLine** records:
  - Line 1: `accountId: 4100` (Room Revenue), `debitAmount: $405`
  - Line 2: `accountId: 1100` (Accounts Receivable), `creditAmount: $405`

This posts the room revenue to the General Ledger (**ChartOfAccounts**).

---

## Behind the Scenes: Room Operations {#room-operations}

### Housekeeping Workflow

**Morning Routine (7:00 AM)**

The housekeeping supervisor (Mike Chen) logs into the system and sees a dashboard of **HousekeepingTask** records for the day:
- Room 205: Checkout cleaning (high priority)
- Room 301: Stayover service (medium priority)
- Room 412: Deep clean (scheduled)

Mike assigns tasks to his team:
- **HousekeepingTask** `taskId: 4002` (Room 205 checkout):
  - `assignedTo: 203` (Maria Garcia, housekeeper)
  - `status: "assigned"`
  - `scheduledAt: 2024-07-18 08:00:00`

**Task Execution (8:15 AM)**

Maria starts cleaning Room 205:
1. Updates **HousekeepingTask**: `status: "in-progress"`, `startedAt: 2024-07-18 08:15:00`
2. Uses cleaning supplies. The system tracks inventory usage:
   - Creates **InventoryTransaction** records:
     - `transactionId: 6001`: `inventoryItemId: 1001` (Cleaning Solution), `quantity: -0.5` (liters), `referenceType: "HousekeepingTask"`, `referenceId: 4002`
     - `transactionId: 6002`: `inventoryItemId: 1002` (Towels), `quantity: -4` (pieces), `referenceType: "HousekeepingTask"`, `referenceId: 4002`
3. Updates **InventoryItem** records: `currentQuantity` is reduced accordingly.

**Task Completion (9:30 AM)**

Maria finishes cleaning:
1. Updates **HousekeepingTask**: 
   - `status: "completed"`
   - `completedAt: 2024-07-18 09:30:00`
   - `actualDuration: 75` minutes (vs. `estimatedDuration: 60`)
   - `notes: "Room in excellent condition"`
2. Updates **Room**: 
   - `status: "available"`
   - `lastCleanedAt: 2024-07-18 09:30:00`

The system tracks productivity: Maria completed the task in 75 minutes, which is 15 minutes over estimate. This data feeds into performance reports.

### Room Status Management

The **Room** entity's `status` field drives availability:
- `"available"`: Ready for guests
- `"occupied"`: Currently has guests
- `"out-of-order"`: Cannot be sold (maintenance issue)
- `"maintenance"`: Under repair

When a room goes out of order:
1. **Room** updated: `status: "out-of-order"`
2. **MaintenanceOrder** created (see [Maintenance](#maintenance) section)
3. Any existing **Reservation** records for that room are flagged for reassignment

---

## Food & Beverage: From Menu to Payment {#food-beverage}

### Menu Item Costing

**The Recipe System**

The hotel restaurant serves "Grilled Salmon" (`menuItemId: 75`). The chef has defined a **Recipe**:
- `recipeId: 25`
- `menuItemId: 75`
- `name: "Grilled Salmon Recipe"`
- `servings: 1`

The **Recipe** links to **RecipeLine** records that specify ingredients:
- Line 1: `inventoryItemId: 2001` (Salmon Fillet), `quantity: 0.2` (kg), `unit: "kg"`
- Line 2: `inventoryItemId: 2002` (Olive Oil), `quantity: 0.01` (liters), `unit: "liter"`
- Line 3: `inventoryItemId: 2003` (Lemon), `quantity: 0.5` (pieces), `unit: "piece"`
- Line 4: `inventoryItemId: 2004` (Herbs), `quantity: 0.05` (kg), `unit: "kg"`

The system calculates recipe cost:
- Salmon: 0.2 kg × $15/kg = $3.00
- Olive Oil: 0.01 L × $8/L = $0.08
- Lemon: 0.5 × $0.50 = $0.25
- Herbs: 0.05 kg × $20/kg = $1.00
- **Total Recipe Cost: $4.33**

The **FnbMenuItem** record is updated: `cost: $4.33`. The selling price is `$28`, so the profit margin is $23.67 (84.5%).

**Automatic Cost Updates**

When the supplier increases salmon price from $15/kg to $16/kg:
1. **InventoryItem** `inventoryItemId: 2001` updated: `unitCost: $16`
2. **InventoryTransaction** created: `transactionType: "adjustment"`, `unitCost: $16`
3. System automatically recalculates all **Recipe** records that use salmon
4. **FnbMenuItem** `menuItemId: 75` updated: `cost: $4.43` (new cost)

### Restaurant Operations

**Table Management**

A party of 4 arrives at the restaurant:
1. Hostess checks **Table** records: Finds `tableId: 15`, `capacity: 4`, `status: "available"`
2. Updates **Table**: `status: "occupied"`
3. Creates **Order**:
   - `orderId: 2002`
   - `tableId: 15`
   - `orderType: "dine-in"`
   - `serverId: 202` (Sarah, server)
   - `status: "pending"`

4. Updates **Table**: `currentOrderId: 2002` (links active order to table)

**Order Processing**

The server takes the order and enters items:
- **OrderLine** records created:
  - Line 1: `menuItemId: 50` (Caesar Salad), `quantity: 2`
  - Line 2: `menuItemId: 75` (Grilled Salmon), `quantity: 2`
  - Line 3: `menuItemId: 120` (Wine), `quantity: 1`

The kitchen receives the order:
1. **OrderLine** records updated: `status: "preparing"`
2. When items are ready: `status: "ready"`
3. When served: `status: "served"`

**Inventory Deduction**

When the order is completed, the system automatically deducts inventory:
- For each **OrderLine** that has a **Recipe**:
  - System looks up **RecipeLine** records
  - Creates **InventoryTransaction** records:
    - `transactionId: 6003`: `inventoryItemId: 2001` (Salmon), `quantity: -0.4` (kg) (2 orders × 0.2 kg), `referenceType: "OrderLine"`, `referenceId: 5001`
    - `transactionId: 6004`: `inventoryItemId: 2002` (Olive Oil), `quantity: -0.02` (L), `referenceType: "OrderLine"`, `referenceId: 5002`
    - And so on...

**Payment and Financial Posting**

When the table pays:
1. **Payment** created: `paymentId: 3003`, `amount: $116`, `referenceType: "Order"`, `referenceId: 2002`
2. **Order** updated: `status: "completed"`, `completedAt: 2024-07-18 20:30:00`
3. **Table** updated: `status: "available"`, `currentOrderId: null`
4. **JournalEntry** automatically created:
   - `entryId: 5002`
   - `referenceType: "Order"`
   - `referenceId: 2002`
   - **JournalEntryLine** records:
     - `accountId: 4200` (F&B Revenue), `debitAmount: $116`
     - `accountId: 1100` (Cash/Accounts Receivable), `creditAmount: $116`

---

## Inventory Management: From Purchase to Consumption {#inventory-management}

### The Procurement Cycle

**Step 1: Low Stock Alert**

The system monitors **InventoryItem** records. When `currentQuantity` falls below `reorderPoint`:
- `inventoryItemId: 2001` (Salmon Fillet):
  - `currentQuantity: 2.5` kg
  - `reorderPoint: 5.0` kg
  - **Alert**: Stock is low!

**Step 2: Purchase Order Creation**

The purchasing manager (Employee `employeeId: 205`) creates a **PurchaseOrder**:
- `purchaseOrderId: 8001`
- `propertyId: 1`
- `supplierId: 50` (Fresh Seafood Co.)
- `orderNumber: "PO-2024-8001"`
- `orderDate: 2024-07-18`
- `expectedDeliveryDate: 2024-07-20`
- `status: "draft"`
- `createdBy: 205`

**PurchaseOrderLine** records:
- Line 1: `inventoryItemId: 2001` (Salmon), `quantity: 20` kg, `unitPrice: $15/kg`, `totalPrice: $300`
- Line 2: `inventoryItemId: 2002` (Olive Oil), `quantity: 10` L, `unitPrice: $8/L`, `totalPrice: $80`

**Step 3: Approval Workflow**

The purchase order requires approval:
1. **PurchaseOrder** updated: `status: "sent"` (sent to supplier)
2. Finance Manager (Sarah, `employeeId: 206`) reviews and approves:
   - `status: "confirmed"`
   - `approvedBy: 206`
   - `approvedAt: 2024-07-18 14:00:00`

**Step 4: Delivery and Receipt**

On July 20th, the delivery arrives:
1. Receiving clerk checks items against **PurchaseOrderLine** records
2. Updates **PurchaseOrderLine**: `receivedQuantity: 20` kg (for salmon)
3. Updates **PurchaseOrder**: `status: "received"`, `receivedAt: 2024-07-20 10:00:00`

4. System creates **InventoryTransaction** records:
   - `transactionId: 6005`:
     - `inventoryItemId: 2001` (Salmon)
     - `transactionType: "purchase"`
     - `quantity: +20` (kg)
     - `unitCost: $15`
     - `totalCost: $300`
     - `referenceType: "PurchaseOrder"`
     - `referenceId: 8001`
     - `performedBy: 205`

5. **InventoryItem** updated: `currentQuantity: 22.5` kg (was 2.5, now +20)

**Step 5: Document Attachment**

The purchasing manager uploads documents:
- **Document** `documentId: 9001`:
  - `documentType: "invoice"`
  - `referenceType: "PurchaseOrder"`
  - `referenceId: 8001`
  - `fileUrl: "s3://documents/PO-8001-invoice.pdf"`
  - `amount: $380` (matches PO total)
  - `uploadedBy: 205`

- **Document** `documentId: 9002`:
  - `documentType: "delivery-note"`
  - `referenceType: "PurchaseOrder"`
  - `referenceId: 8001`
  - `fileUrl: "s3://documents/PO-8001-delivery.pdf"`

These documents enable three-way matching (PO, invoice, receipt) for audit compliance.

**Step 6: Payment Processing**

When the invoice is due:
1. **Expense** record created:
   - `expenseId: 7001`
   - `propertyId: 1`
   - `category: "supplies"`
   - `amount: $380`
   - `vendor: "Fresh Seafood Co."`
   - `invoiceNumber: "INV-2024-789"`
   - `glAccountId: 5100` (Cost of Goods Sold - Food)
   - `status: "submitted"`
   - `submittedBy: 205`

2. Finance Manager approves: `status: "approved"`, `approvedBy: 206`

3. **Payment** created:
   - `paymentId: 3004`
   - `paymentType: "expense"`
   - `referenceType: "Expense"`
   - `referenceId: 7001`
   - `amount: $380`
   - `paymentMethod: "bank_transfer"`
   - `status: "completed"`

4. **Expense** updated: `status: "paid"`

5. **JournalEntry** automatically created:
   - `entryId: 5003`
   - `referenceType: "Expense"`
   - `referenceId: 7001`
   - **JournalEntryLine** records:
     - `accountId: 5100` (COGS - Food), `debitAmount: $380`
     - `accountId: 2100` (Accounts Payable), `creditAmount: $380`

### Inventory Usage Tracking

**Recipe-Based Deduction**

When a menu item is sold (see [Food & Beverage](#food-beverage) section), the system:
1. Looks up the **Recipe** for the **FnbMenuItem**
2. Finds all **RecipeLine** records
3. Creates **InventoryTransaction** records for each ingredient
4. Updates **InventoryItem** `currentQuantity` accordingly

**Housekeeping Usage**

When housekeeping uses supplies (see [Room Operations](#room-operations) section), **InventoryTransaction** records are created with `referenceType: "HousekeepingTask"`.

**Waste and Adjustments**

If inventory is damaged or expires:
1. **InventoryTransaction** created:
   - `transactionType: "waste"`
   - `quantity: -2` (kg of spoiled salmon)
   - `reason: "Expired - past use-by date"`
   - `performedBy: 205`

2. **InventoryItem** updated: `currentQuantity` reduced

---

## People Management: Employees and Payroll {#people-management}

### Daily Operations

**Clock-In/Clock-Out**

Maria Garcia (housekeeper, `employeeId: 203`) arrives at 7:00 AM:
1. System creates **Timesheet** record:
   - `timesheetId: 5001`
   - `employeeId: 203`
   - `propertyId: 1`
   - `workDate: 2024-07-18`
   - `clockInTime: 2024-07-18 07:00:00`
   - `status: "draft"`

2. At end of shift (3:00 PM):
   - `clockOutTime: 2024-07-18 15:00:00`
   - `breakDuration: 30` (minutes)
   - `regularHours: 7.5` (8 hours - 0.5 hour break)
   - `overtimeHours: 0`
   - `status: "submitted"`

3. Supervisor (Mike, `employeeId: 201`) approves:
   - `status: "approved"`
   - `approvedBy: 201`
   - `approvedAt: 2024-07-18 15:30:00`

### Payroll Processing

**Bi-Weekly Payroll Run**

Every two weeks, the Finance Manager processes payroll:

**Step 1: Create PayrollRun**

- `payrollRunId: 6001`
- `propertyId: 1`
- `payPeriodStart: 2024-07-01`
- `payPeriodEnd: 2024-07-14`
- `payDate: 2024-07-15`
- `status: "draft"`
- `createdBy: 206` (Finance Manager)

**Step 2: Calculate Employee Pay**

The system aggregates **Timesheet** records for each employee:

For Maria Garcia (`employeeId: 203`):
- Total regular hours: 75 hours (10 days × 7.5 hours)
- Total overtime hours: 5 hours
- Hourly rate: $18/hour
- Regular pay: 75 × $18 = $1,350
- Overtime pay: 5 × $27 (1.5× rate) = $135
- Gross pay: $1,485
- Deductions: Tax ($297), Insurance ($50) = $347
- Net pay: $1,138

**PayrollRunLine** created:
- `payrollRunLineId: 7001`
- `payrollRunId: 6001`
- `employeeId: 203`
- `regularHours: 75`
- `overtimeHours: 5`
- `regularPay: $1,350`
- `overtimePay: $135`
- `grossPay: $1,485`
- `totalDeductions: $347`
- `netPay: $1,138`

**Step 3: Approve and Process**

1. Finance Manager reviews totals:
   - `totalGrossPay: $45,000` (all employees)
   - `totalDeductions: $9,000`
   - `totalNetPay: $36,000`

2. Approves: `status: "approved"`, `approvedBy: 206`

3. Processes: `status: "processed"`, `processedAt: 2024-07-15 10:00:00`

**Step 4: Payment and Financial Posting**

1. **Payment** records created for each employee (or batch payment):
   - `paymentId: 3005`
   - `paymentType: "payroll"`
   - `referenceType: "PayrollRun"`
   - `referenceId: 6001`
   - `amount: $36,000`
   - `paymentMethod: "bank_transfer"`
   - `status: "completed"`

2. **JournalEntry** automatically created:
   - `entryId: 5004`
   - `referenceType: "PayrollRun"`
   - `referenceId: 6001`
   - **JournalEntryLine** records:
     - `accountId: 5200` (Labor Expense), `debitAmount: $45,000`
     - `accountId: 2300` (Payroll Tax Payable), `debitAmount: $9,000`
     - `accountId: 2100` (Accounts Payable), `creditAmount: $36,000`
     - `accountId: 2400` (Employee Benefits Payable), `creditAmount: $18,000`

This posts labor costs to the General Ledger.

---

## Maintenance: Keeping Everything Running {#maintenance}

### Preventive Maintenance

**Scheduled Maintenance**

The HVAC system in Room 205 requires quarterly maintenance:
1. **Asset** record:
   - `assetId: 1001`
   - `propertyId: 1`
   - `roomId: 205`
   - `name: "HVAC Unit - Room 205"`
   - `category: "HVAC"`
   - `nextMaintenanceDate: 2024-07-20`

2. System automatically creates **MaintenanceOrder**:
   - `maintenanceOrderId: 9001`
   - `propertyId: 1`
   - `assetId: 1001`
   - `roomId: 205`
   - `orderType: "preventive"`
   - `priority: "medium"`
   - `scheduledDate: 2024-07-20`
   - `status: "open"`

3. Maintenance supervisor assigns:
   - `assignedTo: 210` (Maintenance Technician)
   - `status: "assigned"`

### Corrective Maintenance

**Emergency Repair**

A guest reports a broken AC in Room 301:
1. Front desk employee (`employeeId: 207`) creates **MaintenanceOrder**:
   - `maintenanceOrderId: 9002`
   - `propertyId: 1`
   - `roomId: 301`
   - `orderType: "corrective"`
   - `priority: "urgent"`
   - `title: "AC Not Working - Room 301"`
   - `description: "Guest reports AC not cooling"`
   - `requestedBy: 207`
   - `status: "open"`

2. **Room** updated: `status: "out-of-order"` (if room cannot be sold)

3. Maintenance technician (`employeeId: 210`) assigned:
   - `assignedTo: 210`
   - `status: "assigned"`

4. Technician starts work:
   - `status: "in-progress"`
   - `startedAt: 2024-07-18 16:00:00`

5. Technician completes repair:
   - `status: "completed"`
   - `completedAt: 2024-07-18 17:30:00`
   - `actualCost: $150` (replacement part)
   - `resolutionNotes: "Replaced compressor. System tested and working."`

6. **Room** updated: `status: "available"`

7. **Asset** updated (if AC is tracked as asset):
   - `lastMaintenanceDate: 2024-07-18`
   - `nextMaintenanceDate: 2024-10-18` (3 months later)

**Vendor Service**

If maintenance requires external vendor:
1. Vendor invoice uploaded as **Document**:
   - `documentId: 9003`
   - `documentType: "invoice"`
   - `referenceType: "MaintenanceOrder"`
   - `referenceId: 9002`
   - `amount: $500`

2. **Expense** created:
   - `expenseId: 7002`
   - `category: "maintenance"`
   - `amount: $500`
   - `vendor: "AC Repair Co."`
   - `glAccountId: 5300` (Maintenance Expense)

3. Payment processed (see [Financial Management](#financial-management) section)

---

## Financial Management: The Money Trail {#financial-management}

### The Chart of Accounts

Each property has its own **ChartOfAccounts** structure:

**Hierarchical Structure:**
- `accountId: 4000` (Revenue - Parent)
  - `accountId: 4100` (Room Revenue)
  - `accountId: 4200` (F&B Revenue)
- `accountId: 5000` (Expenses - Parent)
  - `accountId: 5100` (COGS - Food)
  - `accountId: 5200` (Labor Expense)
  - `accountId: 5300` (Maintenance Expense)

The parent accounts aggregate child account balances for reporting.

### Automatic Journal Entries

**Revenue Recognition**

When a **Reservation** is checked out:
1. System creates **JournalEntry**:
   - `entryId: 5001`
   - `referenceType: "Reservation"`
   - `referenceId: 10001`
   - `entryType: "automatic"`

2. **JournalEntryLine** records:
   - Line 1: `accountId: 1100` (Accounts Receivable), `debitAmount: $405`
   - Line 2: `accountId: 4100` (Room Revenue), `creditAmount: $405`

This follows double-entry bookkeeping: debits = credits.

**Expense Recognition**

When an **Expense** is approved and paid:
1. **JournalEntry** created:
   - `entryId: 5003`
   - `referenceType: "Expense"`
   - `referenceId: 7001`

2. **JournalEntryLine** records:
   - Line 1: `accountId: 5100` (COGS - Food), `debitAmount: $380`
   - Line 2: `accountId: 2100` (Accounts Payable), `creditAmount: $380`

**Payment Processing**

When payment is made:
1. **JournalEntry** created:
   - `entryId: 5005`
   - `referenceType: "Payment"`
   - `referenceId: 3004`

2. **JournalEntryLine** records:
   - Line 1: `accountId: 2100` (Accounts Payable), `debitAmount: $380`
   - Line 2: `accountId: 1000` (Cash/Bank), `creditAmount: $380`

### Utility Bill Management

**Monthly Utility Processing**

Electricity bill arrives:
1. **UtilityBill** created:
   - `utilityBillId: 8001`
   - `propertyId: 1`
   - `utilityType: "electricity"`
   - `provider: "City Power Co."`
   - `billingPeriodStart: 2024-06-01`
   - `billingPeriodEnd: 2024-06-30`
   - `amount: $2,500`
   - `usageAmount: 5000` (kWh)
   - `unitRate: $0.50` (per kWh)
   - `meterReading: 125000`
   - `previousMeterReading: 120000`
   - `status: "pending"`
   - `glAccountId: 5400` (Utilities Expense)

2. Bill document uploaded:
   - **Document** `documentId: 9004`
   - `documentType: "utility-bill"`
   - `referenceType: "UtilityBill"`
   - `referenceId: 8001`

3. Finance Manager approves and pays:
   - `status: "paid"`
   - `paidAt: 2024-07-15 10:00:00`

4. **JournalEntry** created:
   - `entryId: 5006`
   - `referenceType: "UtilityBill"`
   - `referenceId: 8001`
   - **JournalEntryLine** records:
     - `accountId: 5400` (Utilities Expense), `debitAmount: $2,500`
     - `accountId: 1000` (Cash/Bank), `creditAmount: $2,500`

---

## Document Management: The Paper Trail {#document-management}

### Document Lifecycle

**Upload and Verification**

When a supplier invoice arrives:
1. Accounts payable clerk uploads **Document**:
   - `documentId: 9001`
   - `documentType: "invoice"`
   - `referenceType: "PurchaseOrder"`
   - `referenceId: 8001`
   - `fileUrl: "s3://documents/PO-8001-invoice.pdf"`
   - `uploadedBy: 205`
   - `isVerified: false`

2. OCR processing extracts data:
   - `ocrData: { "vendor": "Fresh Seafood Co.", "amount": 380, "date": "2024-07-18", "invoiceNumber": "INV-2024-789" }`
   - `amount: $380` (auto-populated from OCR)
   - `documentDate: 2024-07-18`

3. Finance Manager verifies:
   - `isVerified: true`
   - `verifiedBy: 206`
   - `verifiedAt: 2024-07-19 09:00:00`

**Document Linking**

Documents can link to multiple entities:
- **Expense** `expenseId: 7001` can have multiple **Document** records:
  - Invoice (required)
  - Receipt (optional)
  - Payment confirmation (optional)

This creates a complete audit trail for compliance.

---

## Reporting: Making Sense of It All {#reporting}

### Daily Flash Report

**Automated Report Generation**

Every morning at 6:00 AM, the system generates a **Report**:
- `reportId: 1001`
- `reportType: "daily-flash"`
- `propertyId: 1`
- `isScheduled: true`
- `scheduleFrequency: "daily"`

The report queries:
- **Reservation** records: Occupancy rate, revenue
- **Order** records: F&B sales
- **Payment** records: Cash flow
- **HousekeepingTask** records: Room readiness

**ReportSnapshot** created:
- `snapshotId: 2001`
- `reportId: 1001`
- `snapshotDate: 2024-07-18`
- `data: { "occupancy": "85%", "roomRevenue": "$12,500", "f&bRevenue": "$3,200", ... }`

The Finance Manager receives an email with the report.

### Monthly Financial Statement

**Custom Report Configuration**

Finance Manager creates a **Report**:
- `reportId: 1002`
- `reportType: "monthly-statement"`
- `configuration: { "startDate": "2024-07-01", "endDate": "2024-07-31", "includeDetails": true }`

The report aggregates:
- **JournalEntry** records: All transactions for the month
- **ChartOfAccounts** balances: Account-level summaries
- **Reservation** revenue: Room sales
- **Order** revenue: F&B sales
- **Expense** records: All expenses
- **PayrollRun** records: Labor costs

**ReportSnapshot** stores the results for historical comparison.

---

## Cross-Functional Scenarios

### Scenario: A Complete Guest Stay with All Services

**John Smith's Extended Stay (July 15-18, 2024)**

**Day 1 (July 15):**
1. **Reservation** created, **Payment** (deposit) processed
2. Check-in: **Reservation** → `status: "checked-in"`, **Room** → `status: "occupied"`
3. Room service order: **Order** created, linked to **Reservation**
4. Inventory deducted via **Recipe** system
5. **JournalEntry** created for F&B revenue

**Day 2 (July 16):**
1. **HousekeepingTask** (stayover service) completed
2. Inventory used (cleaning supplies) tracked via **InventoryTransaction**
3. Restaurant dinner: **Order** created, **Table** assigned
4. Payment processed, **JournalEntry** created

**Day 3 (July 17):**
1. AC breaks in room: **MaintenanceOrder** created
2. Room temporarily out of order
3. Maintenance completed, room available again
4. **Expense** created for repair, **Document** (invoice) attached

**Day 4 (July 18):**
1. Checkout: **Reservation** → `status: "checked-out"`
2. Final **Payment** processed
3. **HousekeepingTask** (checkout cleaning) assigned
4. **JournalEntry** created for room revenue
5. Room ready for next guest

**End of Month:**
- All transactions aggregated in **Report** (monthly statement)
- **PayrollRun** processes all employee hours
- **UtilityBill** records processed
- Complete financial picture in **ChartOfAccounts**

---

## Key Takeaways

1. **Property-Centric Design**: Every entity is scoped to a **Property**, enabling multi-property operations with complete data isolation.

2. **Automatic Financial Posting**: Revenue and expense transactions automatically create **JournalEntry** records, ensuring accurate accounting.

3. **Complete Audit Trail**: **InventoryTransaction**, **JournalEntry**, **AuditLog**, and **Document** entities provide full traceability.

4. **Workflow Integration**: Approval workflows (Expense, PurchaseOrder, PayrollRun) ensure proper authorization before processing.

5. **Cost Tracking**: Recipe costing, inventory costing, and labor costing provide comprehensive cost analysis.

6. **Document Management**: All financial transactions link to **Document** records for compliance and audit purposes.

7. **Real-Time Operations**: Room status, inventory levels, and task assignments update in real-time, enabling efficient operations.

8. **Flexible Relationships**: The `referenceType`/`referenceId` pattern allows entities like **Payment**, **Document**, and **JournalEntry** to link to multiple entity types.

This system design enables a hospitality business to manage all aspects of operations—from guest bookings to financial reporting—in an integrated, auditable, and efficient manner.

