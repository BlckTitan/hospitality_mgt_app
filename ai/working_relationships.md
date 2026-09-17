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
- He can use **Attendance Tracker** (Start/End shift writes a `shifts` row, then draft **Hours** on End shift). Logging in does not start a shift.
- He can be assigned **HousekeepingTask** records
- His hours are tracked for **Payroll** calculations
- He can upload **Document** records (e.g., maintenance photos)

Permissions are checked **at the property being accessed**. Sarah's Finance Manager rights at Grand Hotel do not apply at Mountain Lodge, where she is Finance Viewer.

### Inviting a new user (Clerk)

New people are not typed into a create-user form. An admin at Grand Hotel sends a Clerk invitation: email + a defined Role (for example "Housekeeping Supervisor") + Property 1. That is stored as a **PendingInvite**. When Mike accepts the email and signs up:

- Clerk creates the identity
- Convex creates the **User** row
- The pending invite is fulfilled into a **UserRole** (Property 1, Housekeeping Supervisor)
- `assignedBy` is the admin who sent the invite

If Mike later also works at Seaside Resort, the admin **cannot invite the same email again**. They open Mike's user record and **Add access** (Role + Property 2). Promotion or demotion is the same screen (change or remove the UserRole). Administrator changes follow last-admin and peer-admin rules (see `ai/RBAC.md`).

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
   - `taskType: "stayover"`
   - `status: "pending"`
   - `source: "reservation_stayover"`
   - `dueAt`: now + stayover SLA default (180 minutes)
   - Lead `taskAssignment` to the housekeeping department supervisor (Mike Chen)

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
4. **Room** updated: `status: "available"` (room status is not set to dirty/cleaning)
5. **HousekeepingTask** created for checkout cleaning (`source: reservation_checkout`, high priority). Front desk treats the room as **not ready** while this task is open (`pending` or `in-progress`). Lead is the housekeeping department supervisor.

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

Mike assigns a **lead** (and optional helpers) via **taskAssignments**:
- **HousekeepingTask** checkout for Room 205:
  - Lead `staffId: 203` (Maria Garcia, housekeeper)
  - `status` stays `"pending"` until she starts
  - `dueAt` from checkout SLA default (45 minutes)

**Task Execution (8:15 AM)**

Maria starts cleaning Room 205:
1. Updates **HousekeepingTask**: `status: "in-progress"`, `startedAt: 2024-07-18 08:15:00` (any assignee may start)
2. Uses cleaning supplies. The system tracks inventory usage:
   - Creates **InventoryTransaction** records:
     - `transactionId: 6001`: `inventoryItemId: 1001` (Cleaning Solution), `quantity: -0.5` (liters), `referenceType: "HousekeepingTask"`, `referenceId: 4002`
     - `transactionId: 6002`: `inventoryItemId: 1002` (Towels), `quantity: -4` (pieces), `referenceType: "HousekeepingTask"`, `referenceId: 4002`
3. Updates **InventoryItem** records: `currentQuantity` is reduced accordingly.

**Task Completion (9:30 AM)**

Maria is the **lead**, so she can complete:
1. Updates **HousekeepingTask**: 
   - `status: "completed"`
   - `completedAt: 2024-07-18 09:30:00`
   - `actualDuration: 75` minutes (vs. `estimatedDuration: 60`) — productivity-only; does not post Hours
   - `notes: "Room in excellent condition"`
2. Updates **Room**: 
   - `lastCleanedAt: 2024-07-18 09:30:00`
   - `status` remains `"available"` (it was already available at checkout). The room is now ready because no open housekeeping task remains.

The system tracks productivity: Maria completed the task in 75 minutes, which is 15 minutes over estimate. This data feeds into performance reports. On-time vs SLA uses `completedAt <= dueAt` (G3).

### Room Status Management

The **Room** entity's `status` field drives sellability:
- `"available"`: Can be sold. **Not the same as housekeeping-ready.** If an open checkout (or other) housekeeping task exists, front desk still treats the room as not ready.
- `"occupied"`: Currently has guests
- `"out-of-order"`: Cannot be sold (maintenance issue)
- `"maintenance"`: Under repair

There is no `dirty` / `cleaning` status. Readiness = no open housekeeping tasks on the room.

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

**Start shift / End shift (Attendance Tracker)**

Maria Garcia (housekeeper, `employeeId: 203`) is onboarded into housekeeping and inherits that department’s default **Department shift** (expected 07:00–15:00). She logs in at home — no `shifts` row is created.

On site she opens Attendance Tracker and clicks **Start shift**:
1. System creates a **Shift** (`shifts`) for today:
   - `employeeId: 203`
   - `shiftDate: 2024-07-18`
   - `startTime`: actual clock (not the template start)
   - `isFinalized: false`
   - `shiftTemplateId` / `rosterSlotId` from her assignment

2. At **End shift** (3:00 PM):
   - `endTime` set, `isFinalized: true`
   - System drafts **Hours** (`source: "shift"`) if none exist for that staff and date:
     - `clockInTime` / `clockOutTime` from the Shift
     - `breakDuration: 30`
     - `regularHours: 7.5`, `overtimeHours: 0`
     - `status: "draft"` (supervisor still **Approve**)

3. Supervisor (Mike, a `User` with Hours approve permission) approves:
   - `status: "approved"`
   - `approvedBy`: Mike's user id

Ad-hoc **Shift** create/Finalize is the unscheduled path into the same `shifts` table. One session per staff per date. Cover changes who should attend that roster day and never rewrites Hours. Locked Hours (already in a payroll that is Ready to review) are not overwritten.

### Payroll Processing

**Bi-Weekly Payroll**

Every two weeks, the Finance Manager processes payroll:

**Step 1: Start payroll from a Pay cycle**

- Created from the property’s bi-weekly default Pay cycle (period, cutoff, pay date copied)
- `payrollId: 6001`, `status: "draft"`
- `createdBy`: Finance Manager **User** id (need not be an Employee)

**Step 2: Prepare pay**

Pull **unlocked, approved** Hours and **approved** Time off on or before cutoff. Rates come from Pay history effective in the period. Hours are classified with extra pay rules (holiday / night / weekend / OT).

For Maria Garcia (`employeeId: 203`, `paymentMethod: bank`, `payType: hourly`):
- Approved regular hours: 75; overtime: 5 (1.5× premium rule)
- Hourly rate from current compensation: $18/hour
- Regular pay: $1,350; overtime: $135; housing $50; insurance deduction $50
- Gross: $1,535; net: $1,485
- Included Hours get `staffPayId: 7001`, `lockedByPayrollId: 6001`
- Line snapshots `payHistoryIdUsed`

**Step 3: Approve and Process (maker ≠ checker)**

1. A **different** User from creator/calculator approves. Self-approve is rejected.
2. Status `approved`; **Payslip** per Staff pay; one balanced **JournalEntry**. Hours stay locked.
3. Download payment files: Payment file `generic_csv` for bank payees + `cash_sheet` for cash/mobile.
4. Mark paid: **Payment** + optional bank-confirmation **Document**.

**Step 4: Payment and Financial Posting**

Balanced template (gross $45,000, deductions $9,000, net $36,000) — withholdings are **credits**, not debits. No invented benefits line.

| Account | Debit | Credit |
|---|---:|---:|
| Labor expense | 45000 | |
| Employee deductions payable | | 9000 |
| Wages payable | | 36000 |

1. **Payment**: `paymentType: "payroll"`, `referenceType: "Payroll"`, `amount: $36,000`, `paymentMethod: "bank_transfer"`.
2. **JournalEntry**: `referenceType: "Payroll"`, `referenceId: 6001`, lines as above.

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
   - `source: "preventive_schedule"`
   - `status: "pending"`
   - `dueAt`: trigger + preventive SLA default (1440 minutes)
   - `description` may be omitted (schema optional; required only on manual create/edit)
   - Lead `taskAssignment` to the maintenance department supervisor

3. Supervisor may add helpers or keep the default lead.

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
   - `description: "Guest reports AC not cooling"` (required on manual create)
   - `estimatedCost: 85` (optional; omitted values use purchased-items total)
   - `requestedBy: 207`
   - `status: "pending"`
   - optional `supplierId` if a vendor will do the physical work
   - optional **MaintenanceOrderPart** lines, e.g. compressor from inventory (`inventoryItemId` + quantity + `unitCost`) or a custom name for a one-off purchase

2. **Room** updated: `status: "out-of-order"` (if room cannot be sold)

3. Lead `taskAssignment` to `employeeId: 210` (Maintenance Technician); optional helpers. Status stays `"pending"` until start.

4. Technician starts work:
   - `status: "in-progress"`
   - `startedAt: 2024-07-18 16:00:00`

5. Technician completes repair:
   - `status: "completed"`
   - `completedAt: 2024-07-18 17:30:00`
   - `actualCost: $150` (replacement part; if left blank while parts exist, stored as the parts total)
   - List Cost shows `$150` (actual preferred over estimated `$85` and over parts total)
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

### Organizational Billing

**Setup (once)**

Sarah (Finance Manager) opens `/admin/billing/accounts` and creates bill accounts for Grand Hotel Downtown:

| Account | Type | Cadence | Metered |
|---|---|---|---|
| PHCN meter 441-88 | electricity | monthly | yes |
| Spectranet | internet | monthly | no |
| DSTV Business | cable | monthly | no |
| LAWMA | waste | weekly | no |
| Local government tenement | local_government | annually | no |

These are **accounts**, not invoices. Types come from the closed catalog.

**Daily cron**

The same pattern as preventive maintenance: for each **active** account, if the current cycle (property timezone, else UTC) has no `billPeriods` row, insert `status: "expected"` with `periodStart` / `periodEnd` / `dueDate` (= period end). Existing `expected`/`pending` rows with `dueDate < now` become `overdue`.

**Capture and pay (monthly electricity)**

1. Cron opened September: `periodStart` 1 Sep, `periodEnd` 30 Sep, `status: "expected"`.
2. Invoice arrives. Sarah captures on `/admin/billing/bills`: `amount: 185000`, meters, invoice number, uploads `billDocuments.kind = "bill"`. Status → `pending`.
3. She marks paid (full amount, payment method bank). Mutation:
   - Hard duplicate: skip if `expenseId` already set
   - Soft duplicate: fail if another expense matches property + invoice number + vendor + amount
   - Insert `payments` (`referenceType: "PropertyBill"`)
   - Insert `expenses` (`status: "paid"`, `category: "utilities"`, `sourceType: "PropertyBill"`, `expenseDate` = now)
   - Patch period `paid`, `expenseId`, `paidAt`
4. No journal / COA this ship. The expense appears on `/admin/expenses` (read-only).

She does **not** also file a manual utilities expense for the same PHCN invoice.

**Weekly waste / annual levy**

Same entities, different `frequency`. LAWMA gets a new expected row each week; the levy only in January. Week / month / year dashboards **sum** `billPeriods` (or the posted expenses), they do not store a third row type.

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
- **Expense** records: All expenses (including billed `sourceType = PropertyBill` rows)
- **Payroll** records: Labor costs

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
- **Payroll** processes all employee Hours
- **billPeriods** marked paid (utilities, subscriptions, levies) → `Expense`
- Complete financial picture in **ChartOfAccounts**

---

## Key Takeaways

1. **Property-Centric Design**: Every entity is scoped to a **Property**, enabling multi-property operations with complete data isolation.

2. **Automatic Financial Posting**: Revenue and expense transactions automatically create **JournalEntry** records, ensuring accurate accounting.

3. **Complete Audit Trail**: **InventoryTransaction**, **JournalEntry**, **AuditLog**, and **Document** entities provide full traceability.

4. **Workflow Integration**: Approval workflows (Expense, PurchaseOrder, Payroll) ensure proper authorization before processing.

5. **Cost Tracking**: Recipe costing, inventory costing, and labor costing provide comprehensive cost analysis.

6. **Document Management**: Payroll/PO/maintenance use DMS **Document**. Billing this ship stores bill/receipt files on **billDocuments** (period `_storage`).

7. **Real-Time Operations**: Room status, inventory levels, and task assignments update in real-time, enabling efficient operations.

8. **Flexible Relationships**: The `referenceType`/`referenceId` pattern allows entities like **Payment**, **Document**, and **JournalEntry** to link to multiple entity types.

This system design enables a hospitality business to manage all aspects of operations—from guest bookings to financial reporting—in an integrated, auditable, and efficient manner.

