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
- `country`: ISO 3166-1 alpha-2 country code (required at property setup; selects the payroll jurisdiction pack)
- `currency`: Default currency code
- `taxId`: Business tax identification number
- `isActive`: Active status flag
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Central entity that all other entities are scoped to, enabling multi-property support with tenant isolation. `country` selects the payroll jurisdiction pack at setup.

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
- `assignedBy` (FK): User who created the assignment (always set from the authenticated actor or invite `invitedBy`; never chosen by the client)

**Purpose**: Enables users to have different roles at different properties, supporting multi-property access. Uniqueness is (user, role, property). `assignedBy` is the User who created the assignment (set server-side from auth, including invite fulfillment).

---

#### PendingInvite
Tracks a Clerk invitation before the recipient has a User row.

**Attributes:**
- `pendingInviteId` (PK): Unique identifier
- `email`: Invitee email (stored lowercase)
- `roleId` (FK): Role that will be assigned on accept
- `propertyId` (FK): Property that will be assigned on accept
- `invitedBy` (FK): User who sent the invite
- `clerkInvitationId`: Clerk invitation id (optional)
- `status`: pending | accepted | revoked | expired
- `createdAt`: Timestamp of creation
- `expiresAt`: Local expiry (Clerk has its own email TTL)
- `lastReminderSentAt`: Optional last reminder timestamp

**Purpose**: First-access onboarding. Accepting the Clerk invite creates the User (via Clerk webhook / ensure-current-user) and inserts the corresponding UserRole. Existing Clerk emails cannot be invited again; further access is granted via UserRole on the user record.

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

**Purpose**: Tracks individual room inventory, status, and maintenance needs. Status is `available | occupied | out-of-order | maintenance`. Room readiness is inferred from open `HousekeepingTask` rows, not extra status values.

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
Represents housekeeping work and room-readiness tracking. Assignees live on `taskAssignments`, not on this row.

**Attributes:**
- `taskId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `roomId` (FK): Reference to Room
- `taskType`: Type (checkout, stayover, deep-clean, inspection)
- `status`: Status (pending, in-progress, completed, skipped)
- `priority`: Priority level (low, medium, high, urgent)
- `source`: Origin (manual, reservation_checkout, reservation_stayover)
- `reservationId` (FK, optional): Reservation that triggered auto-create
- `templateId` (FK, optional): Task template used at create
- `createdBy` (FK, optional): User who created the task (null on auto-create)
- `dueAt`: SLA deadline snapshot (`taskSlaDefaults.dueMinutes` from trigger/create)
- `scheduledAt`: Scheduled start time (optional)
- `startedAt`: Actual start time (optional)
- `completedAt`: Actual completion time (optional)
- `estimatedDuration`: Estimated duration in minutes (productivity-only; does not post Hours)
- `actualDuration`: Actual duration in minutes (from startedAt on complete)
- `notes`: Task notes (required reason on skip)
- `checklist`: Snapshot of template steps `{ id, label, isComplete }[]`
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Uniqueness**: at most one **open** checkout task per room; at most one **open** stayover per room per calendar day.

**Purpose**: Tracks housekeeping operations, productivity, and room readiness. Room status is not `dirty`/`cleaning`; front desk infers unreadiness from open housekeeping tasks. Completing a checkout-clean task sets `Room.lastCleanedAt`.

---

#### TaskTemplate
Reusable checklist for housekeeping, maintenance, or inventory work. Schema table: `taskTemplates`.

**Attributes:**
- `taskTemplateId` (PK)
- `propertyId` (FK)
- `module`: housekeeping | maintenance | inventory
- `typeKey`: Matches work type (checkout, stayover, deep-clean, inspection, preventive, corrective, emergency, restock, putaway, …)
- `roomTypeId` (FK, optional): Housekeeping templates may be room-type specific
- `steps`: Ordered `{ id, label }[]`
- `isActive`: Active flag
- `createdAt`, `updatedAt`

**Purpose**: At work-record create, copy `steps` onto `checklist` as `{ id, label, isComplete }[]`. Later template edits do not rewrite existing checklists. Putaway may seed from PO lines instead of (or in addition to) a template.

---

#### TaskSlaDefault
Property-level SLA minutes by module and type. Schema table: `taskSlaDefaults`.

**Attributes:**
- `taskSlaDefaultId` (PK)
- `propertyId` (FK)
- `module`: housekeeping | maintenance | inventory
- `typeKey`: Same keys as templates
- `dueMinutes`: Minutes from trigger/create to `dueAt`
- `createdAt`, `updatedAt`

**Uniqueness**: `(propertyId, module, typeKey)`.

**Seeded defaults**: checkout 45, stayover 180, emergency 120, restock 480, putaway 120, preventive 1440.

**Purpose**: `dueAt` is stored on the work record at create (snapshot). Editing defaults does not rewrite open work. G3 uses `completedAt <= dueAt` on completed work; skipped/cancelled excluded.

---

#### TaskAssignment
Lead and helpers for one work record. Schema table: `taskAssignments`. Replaces `HousekeepingTask.assignedTo`.

**Attributes:**
- `taskAssignmentId` (PK)
- `propertyId` (FK)
- `housekeepingTaskId` (FK, optional)
- `maintenanceOrderId` (FK, optional)
- `inventoryTaskId` (FK, optional)
- `staffId` (FK): Employee
- `role`: lead | helper
- `assignedAt`
- `assignedBy` (FK): User who assigned (auto-create uses system actor / triggering user when present)
- `createdAt`

**Constraints:**
- Exactly one parent FK set (xor).
- One row per `(parent, staffId)`.
- At most one `lead` per parent.
- Assignee must be `active` and same `propertyId`.
- On terminate: delete that staff’s assignment rows; if they were lead, work stays `pending` with no lead.

**Purpose**: Shared assignment for all three modules. Any assignee may start; only the lead or a supervisor may complete.

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
- `referenceType`: Reference entity type (PurchaseOrder, OrderLine, HousekeepingTask, InventoryTask, etc.)
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

#### InventoryTask
Assignable restock or putaway work. Schema table: `inventoryTasks`. Not a cycle count. Purchase orders stay procurement (`createdBy` / `approvedBy` only).

**Attributes:**
- `inventoryTaskId` (PK)
- `propertyId` (FK)
- `taskType`: restock | putaway
- `inventoryItemId` (FK): Item to restock (restock) or primary item context
- `suggestedQuantity`: Suggested qty (`reorderQuantity` on restock)
- `source`: reorder_point | purchase_order_received | manual
- `purchaseOrderId` (FK, optional): Required for putaway
- `templateId` (FK, optional)
- `createdBy` (FK, optional)
- `status`: pending | in-progress | completed | cancelled
- `priority`: low | medium | high | urgent
- `dueAt`: SLA snapshot
- `startedAt`, `completedAt` (optional)
- `notes`: Required reason on cancel
- `checklist`: Snapshot `{ id, label, isComplete }[]` (putaway may seed from PO lines: item + qty)
- `createdAt`, `updatedAt`

**Uniqueness**: at most one **open restock** per `inventoryItemId`; at most one **open putaway** per received PO.

**Purpose**: Operational restock/putaway. Completing restock does not create a PO. Completing putaway does not change PO status beyond `received`. Bar `reorderAlerts` are out of scope.

---

### Payroll Management Entities

Implementation rules, lifecycle, GL template, and `staffs` migration: `ai/payroll-implementation.md`.

#### Employee (Convex table: `staffs`)
The people record used for payroll, housekeeping, POs, and inventory. **There is no `employees` table.** Primary key in Convex is `staffs._id`; docs still say `employeeId` for that id. Widen `staffs` in place so existing `Id<"staffs">` FKs stay valid.

**Attributes:**
- `employeeId` (PK): `staffs._id`
- `propertyId` (FK): Reference to Property (required after backfill)
- `userId` (FK): Reference to User (optional, unique globally; casuals/contractors may have no login)
- `employeeNumber`: Unique per property; auto-generated `{PREFIX}-{NNNN}`; immutable after create
- `firstName`, `lastName`
- `email`: Optional; unique per property when set
- `phone`
- `dateOfBirth`: Stored as `DoB` (ISO string) in Convex
- `address`
- `stateOfOrigin`, `LGA`: Optional locale fields
- `hireDate`: Stored as `dateRecruited` in Convex
- `terminationDate`: Stored as `dateTerminated` (optional)
- `employmentStatus`: `active` | `terminated` (legacy `employed` / `on-leave` remain in the schema union until backfill; writers use only active/terminated). On-leave is derived from approved Time off.
- `employmentType`: full-time | part-time | casual | contractor
- `department`: Closed set (front-office, housekeeping, fnb, maintenance, finance, admin, other)
- `role`: Job-title enum (Housekeeper, Receptionist, …). Not a UserRole.
- `position`: Optional free-text job title
- `managerId` (FK, optional): Another `staffs` row at the same property (not self). Direct reports = team.
- `shiftTemplateId` (FK, optional): Default **Department shift** inherited on onboard (or when department changes)
- `payType`, `baseSalary`, `hourlyRate`: Current denormalized copy of the open `Pay history` row. Legacy `salary` is a deprecated copy of `baseSalary`.
- `payCycleId` (FK, optional): Default `Pay cycle` (else property default)
- `paymentMethod`: bank | cash | mobile_money | check (bank fields required only for bank)
- `taxId`: Employee tax identifier (required when the property country pack has statutory deductions)
- `bankName`, `accountName`, `accountNumber` (encrypted), `routingCode`: Structured payout fields
- `nationalId`, `idType`: nin | passport | drivers_license | other
- `emergencyName`, `emergencyPhone`, `emergencyRelationship`
- `contractStartDate`, `contractEndDate`, `probationEndDate`
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Manages employee information for HR, payroll, scheduling, and task assignment (`taskAssignments`). **Terminate only** — never hard-delete. Extra UserRoles on other properties are access-only (one Staff per User globally). On terminate, unassign open `taskAssignments`.

---

#### Staff document
Schema table: `staffDocuments`. Staff-only files until the full Document Management System exists.

**Attributes:** `staffDocumentId` (PK), `propertyId`, `employeeId`, `kind` (contract | id | tax_form | bank_letter | policy | other), `storageId`, `fileName`, `mimeType`, `fileSize`, `uploadedBy` (User), `createdAt`

---

#### Staff onboarding item
Schema table: `staffOnboardingItems`. Seeded on create from a fixed checklist.

**Attributes:** `staffOnboardingItemId` (PK), `propertyId`, `employeeId`, `code`, `label`, `required`, `completedAt`, `completedBy` (User, optional), `skipped`, `createdAt`, `updatedAt`

---

#### Staff change request
Schema table: `staffChangeRequests`. Self-service proposals for HR approval.

**Attributes:** `staffChangeRequestId` (PK), `propertyId`, `employeeId`, `kind` (contact | bank | emergency), `payload` (JSON), `status` (pending | approved | rejected), `requestedBy` (User), `reviewedBy` (User, optional), `reviewedAt`, `notes`, `createdAt`, `updatedAt`

---

#### Department shift
Schema table: `shiftTemplates`. Default working hours for a department at a property.

**Attributes:**
- `shiftTemplateId` (PK)
- `propertyId` (FK)
- `department`: front-office | housekeeping | fnb | maintenance | finance | admin | other
- `name`: Display name
- `startTime`, `endTime`: Expected hours (HH:MM). Not the actual clock.
- `barId` (FK, optional): Required when department is F&B
- `isDefault`: One default per department (application-enforced)
- `isActive`
- `createdAt`, `updatedAt`

**Purpose**: Admin-defined schedule template. New staff in that department inherit this shift. Screens: `/admin/shift-management/templates`.

---

#### Roster day
Schema table: `rosterSlots`. One scheduled day for a staff member.

**Attributes:**
- `rosterSlotId` (PK)
- `propertyId` (FK)
- `shiftDate`: YYYY-MM-DD
- `shiftTemplateId` (FK)
- `scheduledEmployeeId` (FK): Who is rostered
- `workingEmployeeId` (FK): Who should attend (equals scheduled unless Cover)
- `coveredAt`, `coveredBy` (FK User, optional), `notes`
- `createdAt`, `updatedAt`

**Purpose**: Cover changes `workingEmployeeId` only. Blocked if the scheduled person already started a Shift or has Hours for that date, or if the covering person already started a Shift that day. Never rewrites Hours.

---

#### Shift
Schema table: `shifts`. One actual working session (any department). Attendance Tracker Start shift and ad-hoc Shift create both insert here.

**Attributes:**
- `shiftId` (PK)
- `propertyId` (FK)
- `employeeId` (FK, optional): Staff who worked (required for payroll Hours)
- `userId` (FK, optional): Denormalized login when the staff member has one
- `barId` (FK, optional): Required only for F&B
- `department`: Same closed set as Department shift
- `shiftDate`: YYYY-MM-DD
- `startTime`, `endTime` (optional): Actual clock (UTC HH:MM)
- `isFinalized`: True after End shift or Finalize
- `shiftTemplateId` (FK, optional), `rosterSlotId` (FK, optional)

**Purpose**: One session per staff per date (application-enforced). Logging in does not create a Shift. End shift or Finalize drafts Hours (`source = shift`) and, for F&B, finalizes that shift’s `userStockLogs`. Employees see only their own rows; managers with `staff.read` see everyone.

---

#### Payroll settings
Schema table: `payrollSettings`. Property-level overtime and export defaults.

**Attributes:**
- `payrollSettingsId` (PK)
- `propertyId` (FK, unique)
- `country`: Snapshot of Property.country at setup / last allowed change
- `jurisdictionPack`: Pack id (e.g. `NG`, `US`, `generic`)
- `regularHoursLimitDaily`: Hours before daily overtime (optional; pack default)
- `regularHoursLimitWeekly`: Hours before weekly overtime (optional; pack default)
- `overtimeMultiplier`: Fallback daily OT if no `Extra pay rule` exists
- `defaultPayCycleId` (FK, optional)
- `bankExportFormat`: generic_csv (MVP; pack may specify a local layout later)
- `createdAt`, `updatedAt`

**Purpose**: Overtime and export defaults for the property. Created when the admin sets country during property setup (also seeds Pay cycle, Holidays, extra pay rules). Changing country after approved/paid Payroll is blocked.

---

#### Hours
Schema table: `hours`. Tracks employee work hours and attendance.

**Attributes:**
- `hoursId` (PK): Unique identifier
- `employeeId` (FK): Reference to Employee
- `propertyId` (FK): Reference to Property
- `workDate`: Work date (unique with employeeId at application level)
- `clockInTime`: Clock-in timestamp (from Shift `startTime` when `source = shift`)
- `clockOutTime`: Clock-out timestamp (from Shift `endTime`; overnight wrap + 24h)
- `regularHours`: Regular hours worked
- `overtimeHours`: Overtime hours worked
- `breakDuration`: Break duration in minutes
- `source`: manual | csv | shift
- `shiftId` (FK): Reference to Shift (optional; set when drafted from End shift or Finalize)
- `staffPayId` (FK): Set when this Hours row is included after Prepare pay
- `lockedAt`: Set when this Hours row is included after Prepare pay
- `lockedByPayrollId` (FK): Payroll that locked the sheet
- `status`: Status (draft, submitted, approved, rejected)
- `approvedBy` (FK): Reference to User (supervisor)
- `approvedAt`: Approval timestamp
- `notes`: Notes
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Records work hours for payroll. Only **unlocked, approved** Hours before Pay cycle cutoff are included. Prepare pay locks included Hours (edits rejected). Recalculate unlocks then relocks. Attendance Tracker **End shift** or **Finalize** on an ad-hoc Shift creates a draft Hours row; it does not overwrite submitted/approved/locked Hours. Cover never rewrites Hours.

---

#### Pay history
Schema table: `payHistory`. Dated compensation record (source of truth for rates).

**Attributes:**
- `payHistoryId` (PK)
- `employeeId` (FK)
- `payType`: hourly | salary | mixed
- `baseSalary`, `hourlyRate` (as required by payType)
- `payCycleId` (FK, optional)
- `effectiveFrom`: Start date (inclusive)
- `effectiveTo`: End date (exclusive); null = current
- `changedBy` (FK): User
- `createdAt`, `updatedAt`

**Purpose**: Compensation history. No overlapping open intervals per employee. Calculate reads the row(s) covering the pay period. Employee.baseSalary / hourlyRate / payType are the current denormalized copy.

---

#### Pay cycle
Schema table: `payCycles`. Pay calendar for generating payrolls.

**Attributes:**
- `payCycleId` (PK)
- `propertyId` (FK)
- `name`
- `frequency`: weekly | bi-weekly | monthly
- `anchorDate`: Used to generate period start/end and pay date
- `cutoffDaysBeforePayDate`: Hours records and leave approved after cutoff are excluded
- `isDefault`, `isActive`
- `createdAt`, `updatedAt`

**Purpose**: First-class pay calendar. A Payroll is created from a schedule.

---

#### Time-off type
Schema table: `timeOffTypes`. Property-scoped leave category.

**Attributes:**
- `timeOffTypeId` (PK)
- `propertyId` (FK)
- `code`, `name`
- `paid`: If false, approved entries prorate salaried pay
- `countsTowardOvertime`: Default false
- `isActive`
- `createdAt`, `updatedAt`

**Purpose**: Distinguishes paid vs unpaid leave for calculation. Not a full PTO accrual engine.

---

#### Time off
Schema table: `timeOff`. Approved time away that calculation honors.

**Attributes:**
- `timeOffId` (PK)
- `propertyId` (FK)
- `employeeId` (FK)
- `timeOffTypeId` (FK)
- `startDate`, `endDate`
- `days`: Working days (or hours if needed)
- `status`: pending | approved | rejected
- `approvedBy` (FK): User (optional)
- `approvedAt` (optional)
- `notes` (optional)
- `createdAt`, `updatedAt`

**Purpose**: Only approved entries affect pay. Unpaid days reduce salary; paid leave counts as regular hours unless the type allows OT.

---

#### Holidays
Schema table: `holidayCalendars`. Property holiday calendar (seeded from country pack).

**Attributes:**
- `holidayCalendarId` (PK)
- `propertyId` (FK, unique)
- `name`
- `createdAt`, `updatedAt`

---

#### Holiday
Schema table: `holidays`. A public or property holiday date.

**Attributes:**
- `holidayId` (PK)
- `holidayCalendarId` (FK)
- `date`
- `name`
- `isPaid`
- `createdAt`, `updatedAt`

---

#### Extra pay rule
Schema table: `extraPayRules`. Night, weekend, holiday, and overtime multipliers.

**Attributes:**
- `extraPayRuleId` (PK)
- `propertyId` (FK)
- `kind`: daily_overtime | weekly_overtime | night | weekend | public_holiday
- `multiplier`
- `startTime`, `endTime` (optional; night window)
- `isActive`
- `createdAt`, `updatedAt`

**Purpose**: Classifies hours before pay. `overtimeMultiplier` on settings is fallback daily OT only.

---

#### Pay item type
Schema table: `payItemTypes`. Reusable earning, allowance, or deduction definition (data, not hardcoded tax law).

**Attributes:**
- `payItemTypeId` (PK)
- `propertyId` (FK)
- `code`: Stable code (e.g. HOUSING, PAYE, PENSION)
- `name`: Display name
- `kind`: earning | allowance | deduction
- `source`: statutory (seeded from country pack) | custom
- `calculation`: flat | percent_of_gross | pack_formula
- `formulaKey`: Pack calculator key when calculation is pack_formula (e.g. ng_paye)
- `params`: JSON rates/bands from the pack
- `defaultAmount`: Used when calculation is flat
- `defaultRate`: Used when calculation is percent_of_gross
- `glAccountId` (FK, optional): ChartOfAccounts
- `isActive`: Active flag
- `createdAt`, `updatedAt`

**Purpose**: Custom components plus statutory rows seeded from `Property.country`. Statutory rows are not user-deletable.

---

#### This person's pay items
Schema table: `staffPayItems`. Per-employee override or assignment of a Pay item type.

**Attributes:**
- `staffPayItemId` (PK)
- `employeeId` (FK)
- `payItemTypeId` (FK)
- `amount`: Override flat amount (optional)
- `rate`: Override percent (optional)
- `isEnabled`: If false, skip this component for the employee
- `createdAt`, `updatedAt`

**Purpose**: Assigns and overrides components without baking amounts into Employee.

---

#### Payroll
Schema table: `payrolls`. Represents a payroll processing period.

**Attributes:**
- `payrollId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `payCycleId` (FK): Pay cycle this Payroll was created from
- `runType`: regular (MVP)
- `payPeriodStart`: Pay period start date
- `payPeriodEnd`: Pay period end date
- `payDate`: Pay date
- `payFrequency`: Copied from the schedule
- `status`: draft | calculated | approved | processed | paid
- `totalGrossPay`: Total gross pay
- `totalDeductions`: Total deductions
- `totalNetPay`: Total net pay
- `createdBy` (FK): Reference to User
- `calculatedBy` (FK): User who last calculated (optional until calculated)
- `approvedBy` (FK): Reference to User
- `approvedAt`: Approval timestamp
- `processedAt`: Processing timestamp
- `paidAt`: Paid timestamp
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Manages payroll cycles. Created from a Pay cycle. One open (`draft` or `calculated`) run per property per overlapping period. **Maker ≠ checker**: `approvedBy` must not equal `createdBy` or `calculatedBy`. After `approved`, amounts are immutable except via reversal.

---

#### Staff pay
Schema table: `staffPay`. Represents one employee’s calculated pay within a payroll.

**Attributes:**
- `staffPayId` (PK)
- `payrollId` (FK)
- `employeeId` (FK)
- `payHistoryIdUsed` (FK, optional): Pay history snapshot
- `payTypeUsed`, `hourlyRateUsed`, `baseSalaryUsed`, `overtimeMultiplierUsed`: Rate snapshots
- `regularHours`, `overtimeHours`
- `regularPay`, `overtimePay`
- `gratuityAmount`: Manual gratuity only (pooling deferred)
- `grossPay`, `totalDeductions`, `netPay`
- Unique with payrollId + employeeId (application level)
- `createdAt`, `updatedAt`

**Purpose**: Frozen calculation header per employee. Breakdown lives on Pay item — do not store deductions as JSON.

---

#### Pay item
Schema table: `payItems`. Individual earning or deduction on a staff pay line.

**Attributes:**
- `payItemId` (PK)
- `staffPayId` (FK)
- `payItemTypeId` (FK, optional)
- `kind`: earning | allowance | overtime | gratuity | deduction
- `code`, `label`
- `amount`
- `glAccountId` (FK, optional)
- `createdAt`

**Purpose**: Queryable, GL-mappable pay breakdown. Gross = non-deduction items; net = gross − deduction items.

---

#### Payslip
Schema table: `payslips`. Immutable payslip generated from a Staff pay.

**Attributes:**
- `payslipId` (PK)
- `staffPayId` (FK, unique)
- `propertyId` (FK)
- `employeeId` (FK)
- `snapshot`: JSON payload of amounts, items, names, period (frozen)
- `documentId` (FK, optional): Generated PDF Document
- `generatedAt`
- `createdAt`

**Purpose**: Employee-facing pay record. Generated when the run is approved (or processed if async).

---

#### Payment file
Schema table: `paymentFiles`. Bank or CSV export of a payroll.

**Attributes:**
- `paymentFileId` (PK)
- `payrollId` (FK)
- `format`: generic_csv | bank_file | cash_sheet (cash / mobile_money payees)
- `status`: pending | generated | downloaded | failed
- `documentId` (FK, optional)
- `fileUrl` (optional)
- `generatedBy` (FK): User
- `generatedAt`, `createdAt`

**Purpose**: Native payout file. Processor APIs (Gusto/ADP) are out of scope.

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
Represents maintenance work orders/requests. Staff lead/helpers live on `taskAssignments`. Optional vendor is `supplierId`.

**Attributes:**
- `maintenanceOrderId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `assetId` (FK, optional): Reference to Asset (room-only work allowed)
- `roomId` (FK, optional): Reference to Room
- `supplierId` (FK, optional): Vendor in addition to the staff lead/helpers
- `requestedBy` (FK, optional): Employee who requested
- `createdBy` (FK, optional): User who created (null on auto-create)
- `templateId` (FK, optional)
- `orderType`: Type (preventive, corrective, emergency, inspection)
- `source`: Origin (manual, preventive_schedule)
- `priority`: Priority level (low, medium, high, urgent)
- `title`: Order title
- `description`: Detailed description (optional on schema / auto-created preventive orders; required on manual create/edit)
- `status`: Status (pending, in-progress, completed, cancelled)
- `scheduledDate`: Scheduled date (optional)
- `dueAt`: SLA deadline snapshot (replaces `slaDeadline`)
- `startedAt`: Start timestamp (optional)
- `completedAt`: Completion timestamp (optional)
- `estimatedCost`: Estimated cost (optional; defaults to purchased-items total on create when omitted)
- `actualCost`: Actual cost (optional; defaults to purchased-items total on update when omitted)
- `resolutionNotes`: Resolution notes
- `checklist`: Snapshot of template steps `{ id, label, isComplete }[]`
- `notes`: Required reason on cancel
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Uniqueness**: at most one **open** preventive order per asset. Completing preventive updates `Asset.lastMaintenanceDate` / `nextMaintenanceDate`.

**Purpose**: Manages maintenance workflows, tracks estimated and actual costs, purchased items (`MaintenanceOrderPart`), and ensures asset reliability. List Cost shows actual, else `Est.` estimated, else parts total. The staff lead owns in-app completion even when a vendor is named. **Document Requirement**: Maintenance work orders should include vendor invoices, work completion certificates, warranty documents, and payment receipts linked via the Document entity for cost verification and warranty tracking.

---

#### MaintenanceOrderPart
Line items purchased or used for a maintenance work order. Unbounded child table (not an array on `MaintenanceOrder`).

**Attributes:**
- `maintenanceOrderPartId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `maintenanceOrderId` (FK): Parent work order
- `inventoryItemId` (FK, optional): Inventory catalog item when the part is stocked
- `name`: Display name (from inventory or a custom one-off purchase)
- `quantity`: Quantity used or purchased
- `unitCost`: Unit cost at time of recording
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Tracks parts and materials against a work order for cost roll-up. Catalog picker is available to users with `maintenance.order.read` so staff can choose inventory items without `inventory.read`.

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
- `referenceType`: Source entity type (Reservation, Order, Payroll, Expense, etc.)
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
Represents a paid (or, later, workflowed) business cost. This ship: rows are created from **mark-paid** on a period bill (`sourceType = PropertyBill`). Manual create/approve is later.

**Attributes:**
- `expenseId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `category`: Category (utilities, supplies, staff, maintenance, other). Billed rows: electricity/water/gas/internet/cable/waste → `utilities`; `local_government` / `other` → `other`
- `subcategory`: Subcategory (optional)
- `amount`: Expense amount (full period amount; partial pay is out of scope)
- `expenseDate`: For billed rows, payment timestamp (cash)
- `description`: Description (optional)
- `vendor`: Provider name from the bill account
- `invoiceNumber`: Invoice number from the period (optional)
- `status`: `paid` for billed rows. Later: draft, submitted, approved, rejected. Legacy rows without status are unknown
- `sourceType`: `PropertyBill` when created from billing (optional)
- `sourceId`: Period bill id when `sourceType = PropertyBill` (optional)
- `submittedBy` (FK): User who marked paid (billed rows; matches `payments.createdBy`)
- `paidBy` (FK): User who marked paid (optional; same actor this ship)
- `approvedBy` (FK): Not set on billed rows (confirm-paid is approval)
- `approvedAt`: Approval timestamp (optional)
- `glAccountId` (FK): ChartOfAccounts when COA is live; billed rows may store `glAccountCode` on the account only this ship
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Paid ledger for P&L and the read-only Expenses list. **One invoice, one Expense.** Duplicate check: hard key `(sourceType, sourceId)` / `billPeriods.expenseId`; soft match property + invoice number + vendor + amount.

---

#### BillAccount
Schema table: `billAccounts`. Standing property obligation. Admin-configured (not seeded per vendor). Replaces the former `UtilityBill`-only model.

**Attributes:**
- `billAccountId` (PK)
- `propertyId` (FK)
- `name`: Display name (e.g. "PHCN meter 441-88")
- `billType`: electricity | water | gas | internet | cable | waste | local_government | other
- `frequency`: weekly | monthly | annually
- `isMetered`: If true, period capture may include usage/meters
- `provider`: Provider / vendor name
- `accountNumber` (optional)
- `supplierId` (FK, optional): Supplier when the provider is in the vendor master
- `expectedAmount` (optional): Informational; stored only — no anomaly job this ship
- `contractEndDate` (optional): Stored only — no reminder job this ship
- `glAccountCode` (optional): String until ChartOfAccounts is live
- `isActive`: Inactive accounts do not get new cron periods; history remains
- `createdAt`, `updatedAt`

**Purpose**: Cadence and identity for electricity, subscriptions, levies, and similar. Types are a closed product list; accounts are per property.

---

#### BillPeriod
Schema table: `billPeriods`. One billing cycle for an account.

**Attributes:**
- `billPeriodId` (PK)
- `accountId` (FK): BillAccount
- `propertyId` (FK)
- `periodStart`, `periodEnd`: Cycle bounds (computed in property timezone, else UTC)
- `dueDate`: Defaults to `periodEnd`
- `status`: expected | pending | paid | overdue
- `amount` (optional): Required before mark-paid
- `usageAmount`, `unitRate`, `meterReading`, `previousMeterReading` (optional; metered accounts)
- `invoiceNumber` (optional)
- `expenseId` (FK, optional): Set after a successful funnel
- `paidAt` (optional)
- `createdAt`, `updatedAt`

**Uniqueness**: one row per `(accountId, periodStart)` (application-enforced). Daily cron inserts `expected` for the current cycle of each active account and stamps `expected`/`pending` as `overdue` when `dueDate < now`. Staff may capture amount/docs on the expected row (`pending`) or, if the invoice arrived first, create the period against the account.

**Purpose**: The bill instance. Mark-paid inserts `Payment` (`referenceType = PropertyBill`) and one `Expense`.

---

#### BillDocument
Schema table: `billDocuments`. Convex `_storage` files on a period (same pattern as `staffDocuments`). Not the DMS `Document` table this ship.

**Attributes:**
- `billDocumentId` (PK)
- `periodId` (FK): BillPeriod
- `kind`: bill | receipt
- `storageId`: Convex file id
- `fileName`, `mimeType` (optional), `fileSize` (optional)
- `uploadedBy` (FK): User
- `createdAt`

**Purpose**: Original bill required before mark-paid; receipt after payment.

---

#### Payment
Represents payments received or made (for reservations, orders, expenses, etc.).

**Attributes:**
- `paymentId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `paymentType`: Type (reservation, order, expense, payroll, PropertyBill, etc.)
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
Represents saved report configurations and cached report data. Reports can be configured for daily, monthly, or yearly periods and include comprehensive performance and profitability metrics.

**Attributes:**
- `reportId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `name`: Report name
- `reportType`: Type (daily-flash, monthly-statement, yearly-trend, operational-performance, profitability, cost-efficiency, liquidity-solvency, custom, etc.)
- `configuration`: JSON object with report parameters (filters, date ranges, metrics to include, persona access level, etc.)
- `createdBy` (FK): Reference to Employee
- `isScheduled`: Scheduled report flag
- `scheduleFrequency`: Schedule frequency (daily, weekly, monthly, yearly)
- `lastRunAt`: Last run timestamp
- `nextRunAt`: Next scheduled run timestamp
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Purpose**: Stores report configurations and enables scheduled report generation. Supports all four metric categories: Operational Performance, Profitability, Cost & Efficiency, and Liquidity & Solvency.

---

#### ReportSnapshot
Stores cached report data for performance and historical tracking. Contains calculated metrics and aggregated data for specific time periods.

**Attributes:**
- `snapshotId` (PK): Unique identifier
- `reportId` (FK): Reference to Report
- `snapshotDate`: Snapshot date (for daily reports) or period end date (for monthly/yearly)
- `periodType`: Period type (daily, monthly, yearly)
- `data`: JSON object with report data including all calculated metrics
- `generatedAt`: Generation timestamp
- `generatedBy` (FK): Reference to Employee (optional)

**Purpose**: Caches report results for fast retrieval and historical comparison. Enables trend analysis and period-over-period comparisons.

---

## Reporting & Analytics: Metrics and Data Sources

The system supports comprehensive reporting across four core metric categories. All metrics can be calculated from the entity data and are available for daily, monthly, and yearly reporting periods.

### 1. Operational Performance Metrics

These metrics assess how effectively core hospitality assets (rooms, seats, services) are utilized to generate revenue.

#### Revenue Per Available Room (RevPAR)
- **Calculation**: `Total Room Revenue / Total Available Rooms` OR `ADR × Occupancy Rate`
- **Data Sources**: 
  - `Reservation.totalAmount` (summed for period) for room revenue
  - `Room` count (where `isActive = true`) for available rooms
  - `Reservation.status IN ('checked-in', 'checked-out')` for rooms sold
- **Available For**: Daily, Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams, Front Office Leads

#### Occupancy Rate
- **Calculation**: `(Total Rooms Sold / Total Available Rooms) × 100`
- **Data Sources**:
  - `Reservation` records with `status IN ('checked-in', 'checked-out')` for rooms sold
  - `Room` count (where `isActive = true`) for available rooms
  - `Reservation.checkInDate` and `checkOutDate` for date range filtering
- **Available For**: Daily, Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams, Front Office Leads

#### Average Daily Rate (ADR)
- **Calculation**: `Total Room Revenue / Total Rooms Sold`
- **Data Sources**:
  - `Reservation.totalAmount` (summed) for total room revenue
  - `Reservation` count (where `status IN ('checked-in', 'checked-out')`) for rooms sold
- **Available For**: Daily, Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams, Front Office Leads

#### Total Revenue Per Available Room (TRevPAR)
- **Calculation**: `Total Hotel Revenue / Total Available Rooms`
- **Data Sources**:
  - `Reservation.totalAmount` (room revenue)
  - `Order.totalAmount` (F&B revenue)
  - `Room` count (where `isActive = true`) for available rooms
  - All revenue from `JournalEntry` where `accountType = 'revenue'`
- **Available For**: Daily, Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams

#### Average Check / Average Spend Per Customer
- **Calculation**: `Total Sales / Total Customers/Covers`
- **Data Sources**:
  - `Order.totalAmount` (summed) for total sales
  - `Order` count or `Guest` count (unique guests with orders) for customers/covers
  - `OrderLine.quantity` can be used for cover count
- **Available For**: Daily, Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams, F&B Managers

#### Revenue Per Available Seat Hour (RevPASH)
- **Calculation**: `Total Outlet Revenue / (Available Seats × Operating Hours)`
- **Data Sources**:
  - `Order.totalAmount` (summed) for outlet revenue
  - `Table.capacity` (summed) for available seats
  - Operating hours from property configuration or `Table` entity
- **Available For**: Daily, Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams, F&B Managers

---

### 2. Profitability Metrics

These metrics assess the enterprise's ability to turn revenue into profit after accounting for costs.

#### Gross Operating Profit Per Available Room (GOPPAR)
- **Calculation**: `Gross Operating Profit (GOP) / Total Available Rooms`
- **Data Sources**:
  - `JournalEntry` with `accountType = 'revenue'` (total revenue)
  - `JournalEntry` with `accountType = 'expense'` and operational accounts (operating expenses)
  - `Room` count (where `isActive = true`) for available rooms
  - GOP = Total Revenue - Operating Expenses (from `ChartOfAccounts` hierarchy)
- **Available For**: Daily, Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams

#### EBITDA / GOP Margin
- **Calculation**: `(EBITDA / Total Revenue) × 100` OR `(GOP / Total Revenue) × 100`
- **Data Sources**:
  - `JournalEntry` aggregated by `accountType`:
    - Revenue accounts (total revenue)
    - Operating expense accounts (EBITDA = Revenue - Operating Expenses)
    - Excludes interest, taxes, depreciation, amortization from `ChartOfAccounts`
- **Available For**: Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams

#### Net Profit Margin
- **Calculation**: `(Net Income / Total Revenue) × 100`
- **Data Sources**:
  - `JournalEntry` with all revenue accounts (total revenue)
  - `JournalEntry` with all expense accounts (total expenses)
  - Net Income = Total Revenue - Total Expenses (from `ChartOfAccounts` balances)
- **Available For**: Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams

#### Gross Profit Margin
- **Calculation**: `(Revenue - Cost of Goods Sold) / Revenue`
- **Data Sources**:
  - `Order.totalAmount` (F&B revenue) or `JournalEntry` with F&B revenue accounts
  - `InventoryTransaction` with `transactionType = 'usage'` and `referenceType = 'OrderLine'` (COGS)
  - Recipe costing: `Recipe.totalCost` × `OrderLine.quantity` for menu item COGS
- **Available For**: Daily, Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams, F&B Managers

#### Return on Assets (ROA)
- **Calculation**: `Net Income / Total Assets`
- **Data Sources**:
  - `JournalEntry` aggregated for Net Income (Revenue - Expenses)
  - `Asset.currentValue` (summed) for total assets
  - `ChartOfAccounts` with `accountType = 'asset'` (balance from `JournalEntryLine`)
- **Available For**: Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams

#### Return on Equity (ROE)
- **Calculation**: `Net Income / Shareholders' Equity`
- **Data Sources**:
  - `JournalEntry` aggregated for Net Income
  - `ChartOfAccounts` with `accountType = 'equity'` (balance from `JournalEntryLine`)
- **Available For**: Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams

---

### 3. Cost & Efficiency Ratios

These ratios highlight cost control and resource management efficiency.

#### Labor Cost Percentage
- **Calculation**: `(Total Labor Costs / Total Revenue) × 100`
- **Data Sources**:
  - `Payroll.totalGrossPay` summed where `status IN ('approved', 'processed', 'paid')` (exclude draft/calculated)
  - After posting, `JournalEntry` labor expense for the same period is the audit source if totals diverge
  - `JournalEntry` with revenue accounts (total revenue)
- **Available For**: Daily, Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams, Housekeeping/Maintenance Supervisors

#### Food/Beverage Cost Percentage
- **Calculation**: `(Cost of Food/Beverage Sold / Food/Beverage Revenue) × 100`
- **Data Sources**:
  - `InventoryTransaction` with `transactionType = 'usage'` and `referenceType = 'OrderLine'` (F&B COGS)
  - Recipe-based: `Recipe.totalCost` × `OrderLine.quantity` for each menu item sold
  - `Order.totalAmount` where `orderType IN ('dine-in', 'room-service', 'bar')` (F&B revenue)
  - `JournalEntry` with F&B revenue accounts
- **Available For**: Daily, Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams, F&B Managers, Storekeepers

#### Cost Per Occupied Room (CPOR)
- **Calculation**: `Total Operational Costs of Rooms / Total Rooms Sold`
- **Data Sources**:
  - `HousekeepingTask` linked to `InventoryTransaction` (cleaning supplies cost)
  - `InventoryTransaction` with `referenceType = 'HousekeepingTask'` (room service costs)
  - Paid `Expense` rows from billing (`sourceType = PropertyBill`, category `utilities`) and other operational costs; prorate per room or use property total
  - `Reservation` count (where `status IN ('checked-in', 'checked-out')`) for rooms sold
- **Available For**: Daily, Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams, Housekeeping Supervisors

#### Prime Cost (F&B)
- **Calculation**: `Cost of Goods Sold + Total Labor Costs`
- **Data Sources**:
  - `InventoryTransaction` with F&B usage (COGS)
  - `Payroll.totalGrossPay` filtered by F&B department employees
  - `Employee.department = 'fnb'` for F&B labor costs
- **Available For**: Daily, Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams, F&B Managers

#### Inventory Turnover
- **Calculation**: `Cost of Goods Sold / Average Inventory Value`
- **Data Sources**:
  - `InventoryTransaction` with `transactionType = 'usage'` (COGS)
  - `InventoryItem.currentQuantity × unitCost` (summed) for average inventory value
  - Average = (Beginning Inventory + Ending Inventory) / 2
- **Available For**: Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams, F&B Managers, Storekeepers

---

### 4. Liquidity & Solvency Metrics

These ratios assess the enterprise's ability to meet short-term and long-term financial obligations.

#### Current Ratio
- **Calculation**: `Current Assets / Current Liabilities`
- **Data Sources**:
  - `ChartOfAccounts` with `accountType = 'asset'` and parent account indicating "Current Assets"
  - `JournalEntryLine` balances for current asset accounts
  - `ChartOfAccounts` with `accountType = 'liability'` and parent account indicating "Current Liabilities"
  - `JournalEntryLine` balances for current liability accounts
- **Available For**: Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams

#### Quick Ratio (Acid-Test Ratio)
- **Calculation**: `(Current Assets - Inventory) / Current Liabilities`
- **Data Sources**:
  - Current Assets from `ChartOfAccounts` and `JournalEntryLine` (as above)
  - `InventoryItem.currentQuantity × unitCost` (summed) for inventory value
  - Current Liabilities from `ChartOfAccounts` and `JournalEntryLine`
- **Available For**: Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams

#### Debt-to-Equity Ratio
- **Calculation**: `Total Debt / Shareholders' Equity`
- **Data Sources**:
  - `ChartOfAccounts` with `accountType = 'liability'` (total debt from `JournalEntryLine` balances)
  - `ChartOfAccounts` with `accountType = 'equity'` (shareholders' equity from `JournalEntryLine` balances)
- **Available For**: Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams

#### Interest Coverage Ratio
- **Calculation**: `EBIT / Interest Expense`
- **Data Sources**:
  - `JournalEntry` with revenue and operating expenses (EBIT = Earnings Before Interest and Taxes)
  - `JournalEntry` with `accountId` pointing to interest expense account (from `ChartOfAccounts`)
  - `Expense.category = 'interest'` or interest expense GL account
- **Available For**: Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams

#### Cash Flow from Operations
- **Calculation**: Derived from Cash Flow Statement (Operating Activities)
- **Data Sources**:
  - `Payment` records with `paymentType` and `status = 'completed'` (cash inflows/outflows)
  - `JournalEntry` with cash accounts (`accountType = 'asset'` and account name contains "Cash")
  - Net Income from `JournalEntry` (starting point)
  - Adjustments for non-cash items (depreciation from `Asset` depreciation calculations)
  - Changes in working capital from `JournalEntryLine` balances
- **Available For**: Monthly, Yearly
- **Persona Access**: Hotel Owners/General Managers, Finance Teams

---

## Report Access by Persona

### Hotel Owners / General Managers
**Access Level**: Full access to all metrics and reports
- **Daily Reports**: RevPAR, Occupancy Rate, ADR, TRevPAR, Average Check, Labor Cost %, F&B Cost %, CPOR, Prime Cost
- **Monthly Reports**: All operational performance, profitability, cost efficiency, and liquidity metrics
- **Yearly Reports**: All metrics including ROA, ROE, Debt-to-Equity, Interest Coverage, Cash Flow from Operations
- **Custom Reports**: Can create and schedule any report configuration

### Finance & Accounting Teams
**Access Level**: Full access to all financial metrics and reports
- **Daily Reports**: RevPAR, ADR, TRevPAR, Labor Cost %, F&B Cost %, CPOR, Prime Cost, Gross Profit Margin
- **Monthly Reports**: All profitability metrics (GOPPAR, EBITDA Margin, Net Profit Margin), cost efficiency ratios, liquidity metrics
- **Yearly Reports**: All financial metrics including ROA, ROE, Debt-to-Equity, Interest Coverage, Cash Flow from Operations
- **Custom Reports**: Can create financial reports, P&L statements, balance sheets, cash flow statements

### Front Office & Reservations Leads
**Access Level**: Operational performance metrics and room-related reports
- **Daily Reports**: RevPAR, Occupancy Rate, ADR, TRevPAR, Room status, Check-in/Check-out metrics
- **Monthly Reports**: Occupancy trends, ADR trends, Revenue by source, Room utilization
- **Yearly Reports**: Annual occupancy, ADR trends, Revenue performance
- **Custom Reports**: Room availability, Booking trends, Revenue by channel

### Housekeeping & Maintenance Supervisors
**Access Level**: Operational metrics related to their departments
- **Daily Reports**: CPOR, Housekeeping task completion rates, Room readiness
- **Monthly Reports**: Labor Cost % (for their department), CPOR trends, Maintenance costs
- **Yearly Reports**: Annual labor costs, Maintenance expense trends
- **Custom Reports**: Task productivity, Supply usage, Maintenance order costs

### Food & Beverage Managers & Storekeepers
**Access Level**: F&B and inventory-related metrics
- **Daily Reports**: Average Check, RevPASH, F&B Cost %, Prime Cost, Inventory levels
- **Monthly Reports**: Gross Profit Margin, F&B Cost % trends, Inventory Turnover, Menu performance
- **Yearly Reports**: Annual F&B performance, Inventory efficiency, Cost trends
- **Custom Reports**: Menu item profitability, Recipe costing analysis, Supplier performance

### Vendors & External Auditors (View-Only)
**Access Level**: Limited read-only access to specific reports
- **Monthly Reports**: Summary financial statements (if authorized)
- **Yearly Reports**: Annual financial summaries (if authorized)
- **Custom Reports**: Document access only (invoices, receipts linked to their transactions)

---

## Report Generation and Scheduling

### Daily Reports
- **Generation Time**: Typically generated at 6:00 AM for previous day's data
- **Metrics Included**: Real-time operational metrics, daily revenue, occupancy, cost ratios
- **Data Sources**: `Reservation`, `Order`, `Payment`, `HousekeepingTask`, `InventoryTransaction`, `Payroll` (if daily payroll)
- **Storage**: `ReportSnapshot` with `periodType = 'daily'`

### Monthly Reports
- **Generation Time**: Generated on 1st of each month for previous month's data
- **Metrics Included**: All operational, profitability, cost efficiency, and liquidity metrics
- **Data Sources**: Aggregated `JournalEntry`, `Reservation`, `Order`, `Payroll`, `Expense`, `billPeriods` (paid), `Asset` depreciation
- **Storage**: `ReportSnapshot` with `periodType = 'monthly'`

### Yearly Reports
- **Generation Time**: Generated at year-end or on demand
- **Metrics Included**: All metrics including ROA, ROE, Debt-to-Equity, Interest Coverage, Cash Flow
- **Data Sources**: Full year aggregation of all entities, `ChartOfAccounts` balances, `Asset` depreciation schedules
- **Storage**: `ReportSnapshot` with `periodType = 'yearly'`

### Report Configuration Example

```json
{
  "reportType": "operational-performance",
  "period": "monthly",
  "dateRange": {
    "start": "2024-07-01",
    "end": "2024-07-31"
  },
  "metrics": [
    "revpar",
    "occupancy_rate",
    "adr",
    "trevpar",
    "average_check",
    "revpash"
  ],
  "filters": {
    "propertyId": 1,
    "department": null
  },
  "personaAccess": ["hotel_owner", "finance_team", "front_office"]
}
```

### ReportSnapshot Data Structure Example

```json
{
  "snapshotDate": "2024-07-31",
  "periodType": "monthly",
  "metrics": {
    "operational_performance": {
      "revpar": 125.50,
      "occupancy_rate": 78.5,
      "adr": 160.00,
      "trevpar": 185.30,
      "average_check": 45.20,
      "revpash": 12.50
    },
    "profitability": {
      "goppar": 85.20,
      "ebitda_margin": 32.5,
      "net_profit_margin": 18.2,
      "gross_profit_margin": 65.8
    },
    "cost_efficiency": {
      "labor_cost_percentage": 28.5,
      "f&b_cost_percentage": 32.0,
      "cpor": 25.50,
      "prime_cost": 125000,
      "inventory_turnover": 8.5
    },
    "liquidity_solvency": {
      "current_ratio": 1.85,
      "quick_ratio": 1.45,
      "debt_to_equity": 0.65,
      "interest_coverage": 5.2,
      "cash_flow_from_operations": 125000
    }
  },
  "generatedAt": "2024-08-01T06:00:00Z"
}
```

---

### Document Management Entities

#### Document
Represents uploaded documents (invoices, receipts, contracts, etc.) that serve as evidence of payment or transaction records.

**Attributes:**
- `documentId` (PK): Unique identifier
- `propertyId` (FK): Reference to Property
- `documentType`: Type (invoice, receipt, contract, delivery-note, payment-confirmation, utility-bill, payslip, bank-export, etc.)
- `fileName`: Original file name
- `fileUrl`: Storage URL/path to the document file
- `fileSize`: File size in bytes
- `mimeType`: MIME type (e.g., "application/pdf", "image/jpeg")
- `uploadedBy` (FK): Reference to Employee
- `uploadedAt`: Upload timestamp
- `description`: Document description/notes
- `referenceType`: Reference entity type (Expense, BillPeriod, PurchaseOrder, Payment, MaintenanceOrder, Payroll, Payslip, PaymentFile, Staff / Employee, etc.)
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
- **Explanation**: Implements RBAC where users can have multiple roles (e.g., a person might be both a Housekeeping Supervisor and a Maintenance Coordinator). The UserRole junction also links to Property, enabling role-per-property assignments. Permissions are evaluated per property, not as a global union.

#### PendingInvite → Role, Property, User (inviter)
- **Relationship**: Each pending invite names one Role, one Property, and the inviting User.
- **Explanation**: Clerk invitation is the only create-user path. On accept, the invite is marked accepted and a UserRole is written. Re-invite / revoke update this row; they do not create a second User.

#### User ↔ Employee (One-to-One, Optional)
- **Relationship**: A User can optionally be linked to a `staffs` row (the Employee entity).
- **Explanation**: When linked, `staffs.userId` connects login to payroll and task assignment (`taskAssignments` via the staff row). There is no separate `employees` table.

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
- **Explanation**: Tracks all housekeeping activities for each room (checkout cleaning, stayover service, deep cleaning, inspections). Open tasks on the room are how front desk infers unreadiness.

#### Property → HousekeepingTask (One-to-Many)
- **Relationship**: A Property has many HousekeepingTasks.
- **Explanation**: All housekeeping tasks are scoped to a property for operational management.

#### Reservation → HousekeepingTask (One-to-Many, Optional)
- **Relationship**: A Reservation can trigger HousekeepingTasks (`source` checkout or stayover).
- **Explanation**: Check-in creates stayover; checkout creates checkout-clean. Duplicate open tasks are blocked by uniqueness rules.

---

### Task Assignment Relationships

#### Property → TaskTemplate / TaskSlaDefault (One-to-Many)
- **Relationship**: Each property owns templates and SLA defaults per module/`typeKey`.
- **Explanation**: `dueAt` and checklists are snapshotted onto work records at create.

#### TaskTemplate → HousekeepingTask / MaintenanceOrder / InventoryTask (One-to-Many, Optional)
- **Relationship**: A template can be copied onto many work records.
- **Explanation**: `templateId` is informational after snapshot.

#### HousekeepingTask / MaintenanceOrder / InventoryTask → TaskAssignment (One-to-Many)
- **Relationship**: Each work record has zero or more assignments (at most one lead).
- **Explanation**: Shared assignment pattern. Completion requires a lead (or a supervisor acting as completer).

#### Employee → TaskAssignment (One-to-Many)
- **Relationship**: An Employee can be lead or helper on many assignments.
- **Explanation**: Replaces `assignedTo` on HousekeepingTask / MaintenanceOrder.

#### User → TaskAssignment (One-to-Many, as assigner)
- **Relationship**: A User records who assigned the lead/helper.
- **Explanation**: `assignedBy` is the authenticated actor, not chosen by the client.

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

#### InventoryTransaction → InventoryTask (Many-to-One, Optional)
- **Relationship**: An InventoryTransaction can reference an InventoryTask.
- **Explanation**: Restock/putaway movements can link to the operational task. Completing restock still does not create a PurchaseOrder.

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
- **Explanation**: Tracks who created and approved each purchase order for accountability and workflow management. Assignees are **not** stored on the PO.

#### Property → InventoryTask (One-to-Many)
- **Relationship**: A Property has many InventoryTasks.
- **Explanation**: Restock and putaway work is property-scoped operational work, separate from procurement.

#### InventoryItem → InventoryTask (One-to-Many)
- **Relationship**: An InventoryItem can have many InventoryTasks over time.
- **Explanation**: At most one **open restock** per item.

#### PurchaseOrder → InventoryTask (One-to-Many, Optional)
- **Relationship**: A received PurchaseOrder can have a putaway InventoryTask (`purchaseOrderId` required when `taskType = putaway`).
- **Explanation**: At most one **open putaway** per received PO.

---

### Payroll Management Relationships

#### Property → Employee (One-to-Many)
- **Relationship**: A Property has many Employees.
- **Explanation**: All employees are scoped to a single property in this phase (no shared multi-property employment).

#### User ↔ Employee (One-to-One, Optional)
- **Relationship**: An Employee may link to a User for login. Casuals/contractors can be paid without a User. `userId` is unique globally — one Staff row per User. Extra UserRoles on other properties are access-only, not paid employment.

#### Employee → Employee (manager, Optional)
- **Relationship**: `managerId` points at another Staff row at the same property. Hours and Time off “own team” = direct reports.

#### Employee → Staff document / Onboarding item / Change request (One-to-Many)
- **Relationship**: HR files, checklist, and self-service edit proposals are scoped to the staff row and property.

#### Property → Payroll settings (One-to-One)
- **Relationship**: Each property has one overtime/export settings row, created when `country` is set at setup and seeded from that country’s jurisdiction pack.

#### Property → Pay item type (One-to-Many)
- **Relationship**: Components (earnings, allowances, deductions) are property-scoped.

#### Employee → This person's pay items (One-to-Many)
- **Relationship**: Assigns or overrides Pay item types per employee.

#### Employee → Hours (One-to-Many)
- **Relationship**: An Employee has many Hours records. Unique `(employeeId, workDate)` at application level.

#### Property → Hours (One-to-Many)
- **Relationship**: All Hours are scoped to a property.

#### User → Hours (Many-to-One, as Approver)
- **Relationship**: A User (supervisor) can approve many Hours records.

#### Shift → Hours (One-to-Many, Optional)
- **Relationship**: End shift or Finalize creates a draft Hours (`source = shift`). Does not overwrite submitted/approved/locked sheets.
- **Explanation**: Attendance Tracker and ad-hoc Shift share the `shifts` table. Template times are expected hours; clock times on Shift feed Hours.

#### Property → Department shift / Roster day / Shift (One-to-Many)
- **Relationship**: All scheduling is property-scoped.

#### Employee → Department shift (Many-to-One, Optional)
- **Relationship**: Staff inherit the department default template on onboard; department change reassigns the default.

#### Employee → Roster day (One-to-Many)
- **Relationship**: A staff member can be `scheduledEmployeeId` and/or `workingEmployeeId` on a date.

#### Department shift → Roster day / Shift (One-to-Many)
- **Relationship**: Roster days and attendance sessions may point at the template.

#### Roster day → Shift (One-to-Many, Optional)
- **Relationship**: Start shift attaches `rosterSlotId` on the session.

#### Hours → Staff pay (Many-to-One, Optional)
- **Relationship**: When a payroll is prepared, included Hours point at the Staff pay that paid them.

#### Property → Payroll (One-to-Many)
- **Relationship**: Each property processes its own Payroll. Only one open (`draft`/`calculated`) Payroll per overlapping period.

#### User → Payroll (Many-to-One, as Creator/Calculator/Approver)
- **Relationship**: A User (finance/HR) creates, calculates, and approves runs. They need not be Employees. **Maker ≠ checker**: approver must not be the creator or last calculator.

#### Pay cycle → Payroll (One-to-Many)
- **Relationship**: Each run is created from a Pay cycle (period, cutoff, pay date).

#### Employee → Pay history (One-to-Many)
- **Relationship**: Dated compensation rows. One current row (`effectiveTo` null).

#### Pay history → Staff pay (One-to-Many, Optional)
- **Relationship**: Line snapshots `payHistoryIdUsed`.

#### Property → Pay cycle (One-to-Many)
- **Relationship**: Property has one or more pay calendars; one may be default.

#### Property → Time-off type (One-to-Many)
#### Employee → Time off (One-to-Many)
#### Time-off type → Time off (One-to-Many)
- **Explanation**: Only approved Time off affects calculation (unpaid proration; paid leave as regular hours).

#### Property → Holidays (One-to-One)
#### Holidays → Holiday (One-to-Many)
#### Property → Extra pay rule (One-to-Many)
- **Explanation**: Country pack seeds calendar and extra pay rules; used to classify Hours.

#### Hours → Payroll (Many-to-One, as Lock)
- **Relationship**: `lockedByPayrollId` points at the run that locked the sheet after calculate.

#### Payroll → Staff pay (One-to-Many)
- **Relationship**: One line per employee in the run. Unique `(payrollId, employeeId)`.

#### Employee → Staff pay (One-to-Many)
- **Relationship**: Payroll history across periods.

#### Staff pay → Pay item (One-to-Many)
- **Relationship**: Queryable earnings/deductions; replaces a deductions JSON blob.

#### Staff pay → Payslip (One-to-One)
- **Relationship**: One immutable payslip per line after approve.

#### Payroll → Payment file (One-to-Many)
- **Relationship**: Bank/CSV files generated on process.

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

#### Supplier → MaintenanceOrder (One-to-Many, Optional)
- **Relationship**: A Supplier can be named on many MaintenanceOrders.
- **Explanation**: Vendor in addition to the staff lead/helpers. The staff lead still owns in-app completion.

#### Property → MaintenanceOrderPart (One-to-Many)
- **Relationship**: A Property has many MaintenanceOrderParts.
- **Explanation**: Parts lines are property-scoped like their parent work orders.

#### MaintenanceOrder → MaintenanceOrderPart (One-to-Many)
- **Relationship**: A MaintenanceOrder has many MaintenanceOrderParts.
- **Explanation**: Purchased/used items are stored as child rows, replaced as a set on create/update. Unbounded — not an array on the order.

#### InventoryItem → MaintenanceOrderPart (One-to-Many, Optional)
- **Relationship**: An InventoryItem can appear on many MaintenanceOrderParts.
- **Explanation**: Optional — one-off purchases use `name` without `inventoryItemId`.

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

#### JournalEntry → Payroll (Many-to-One, Optional)
- **Relationship**: A JournalEntry can reference a Payroll (via referenceType and referenceId).
- **Explanation**: When payroll expenses are posted to the GL, the journal entry links to the source Payroll (`referenceType = Payroll`) for traceability.

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
- **Relationship**: An Employee can submit and approve many Expenses (manual workflow, later).
- **Explanation**: Billed expenses this ship record the **User** who marked paid (`submittedBy` / `paidBy`), matching `payments.createdBy`.

#### Property → BillAccount (One-to-Many)
- **Relationship**: A Property has many BillAccounts.
- **Explanation**: Each standing obligation (meter, subscription, levy) is property-scoped.

#### BillAccount → BillPeriod (One-to-Many)
- **Relationship**: A BillAccount has many BillPeriods.
- **Explanation**: One row per cadence cycle. Cron opens the current period; staff capture and pay.

#### BillPeriod → BillDocument (One-to-Many)
- **Relationship**: A BillPeriod has many BillDocuments (bill and/or receipt).
- **Explanation**: Convex `_storage`. Bill kind required before mark-paid.

#### BillPeriod → Expense (One-to-One, Optional)
- **Relationship**: A paid BillPeriod points at one Expense (`expenseId`); Expense `sourceType`/`sourceId` point back.
- **Explanation**: Funnel on mark-paid. Hard duplicate key.

#### Supplier → BillAccount (One-to-Many, Optional)
- **Relationship**: A Supplier can be named on many BillAccounts.
- **Explanation**: Optional; provider may be a free-text name only.

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

#### Payment → Payroll (Many-to-One, Optional)
- **Relationship**: A Payment can reference a Payroll (via referenceType and referenceId).
- **Explanation**: Tracks payments made for payroll. Enables payroll payment reconciliation.

#### Payment → BillPeriod (Many-to-One, Optional)
- **Relationship**: A Payment can reference a BillPeriod (`referenceType = PropertyBill`).
- **Explanation**: Written on mark-paid together with the Expense. Full amount only this ship.

---

### Document Management Relationships

#### Property → Document (One-to-Many)
- **Relationship**: A Property has many Documents.
- **Explanation**: All documents are scoped to a property for property-level document management and compliance. Enables tenant isolation for document storage.

#### Document → Expense (Many-to-One, Optional but Recommended)
- **Relationship**: A Document can reference an Expense (via referenceType and referenceId).
- **Explanation**: Links invoices, receipts, and other payment evidence to expenses for the future DMS. **This ship:** billed rows use `billDocuments` on the period, not DMS `Document`.

#### BillPeriod → BillDocument (see Financial relationships)
- Period bill and receipt files live on `billDocuments`, not `referenceType = UtilityBill`.

#### Document → PurchaseOrder (Many-to-One, Optional but Recommended)
- **Relationship**: A Document can reference a PurchaseOrder (via referenceType and referenceId).
- **Explanation**: Links supplier invoices, delivery notes, and payment receipts to purchase orders. **Document Requirement**: All purchase orders should have supplier invoices, delivery notes/receipts, and payment confirmations attached. An order can have multiple documents (e.g., PO document, supplier invoice, delivery receipt, payment confirmation). Enables complete procurement audit trail and three-way matching (PO, invoice, receipt) for compliance and cost verification.

#### Document → Payment (Many-to-One, Optional)
- **Relationship**: A Document can reference a Payment (via referenceType and referenceId).
- **Explanation**: Links payment receipts, bank statements, and transaction confirmations to payment records. Enables payment verification and reconciliation with bank statements.

#### Document → MaintenanceOrder (Many-to-One, Optional but Recommended)
- **Relationship**: A Document can reference a MaintenanceOrder (via referenceType and referenceId).
- **Explanation**: Links maintenance invoices, work completion certificates, and warranty documents to maintenance orders. **Document Requirement**: Maintenance orders with vendor services should include vendor invoices and payment receipts. Work completion certificates and warranty documents should be attached for completed maintenance work. Enables cost verification and warranty tracking for audit compliance.

#### Document → Payroll / Payslip / Payment file (Many-to-One, Optional)
- **Relationship**: A Document can reference a Payroll, Payslip, or Payment file (via referenceType and referenceId).
- **Explanation**: Payslip PDFs, bank export files, and payment confirmations attach to the run or the generated artifact. Required when a run is marked paid.

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
- **Explanation**: Each property can have multiple saved report configurations. Reports are property-specific for data isolation. All metrics are calculated from property-scoped entities (Reservation, Order, Employee, InventoryItem, etc.).

#### Report → ReportSnapshot (One-to-Many)
- **Relationship**: A Report can have many ReportSnapshots.
- **Explanation**: Stores historical snapshots of report data with calculated metrics. Enables trend analysis and performance comparison over time. Each snapshot captures metrics for a specific period (daily, monthly, yearly).

#### Employee → Report (One-to-Many, as Creator)
- **Relationship**: An Employee can create many Reports.
- **Explanation**: Tracks who created each report configuration for access control and audit purposes. Report access is controlled by Role permissions, enabling different personas to view different metric categories.

#### Report → Reservation (Many-to-One, via Data Aggregation)
- **Relationship**: Reports aggregate data from Reservation entities.
- **Explanation**: Operational performance metrics (RevPAR, Occupancy Rate, ADR) are calculated by aggregating Reservation records filtered by date range and property. Reports query Reservation.totalAmount, checkInDate, checkOutDate, and status.

#### Report → Order (Many-to-One, via Data Aggregation)
- **Relationship**: Reports aggregate data from Order entities.
- **Explanation**: F&B metrics (Average Check, RevPASH, F&B Cost %) are calculated from Order and OrderLine records. Reports aggregate Order.totalAmount, orderType, and link to InventoryTransaction for COGS calculation.

#### Report → JournalEntry (Many-to-One, via Data Aggregation)
- **Relationship**: Reports aggregate data from JournalEntry entities.
- **Explanation**: Profitability and liquidity metrics (GOPPAR, EBITDA Margin, Net Profit Margin, Current Ratio, etc.) are calculated from JournalEntry and JournalEntryLine records. Reports aggregate by ChartOfAccounts to calculate revenue, expenses, assets, and liabilities.

#### Report → Payroll (Many-to-One, via Data Aggregation)
- **Relationship**: Reports aggregate data from Payroll entities.
- **Explanation**: Labor cost metrics are calculated from Payroll.totalGrossPay aggregated by period. Reports can filter by Employee.department for department-specific labor cost analysis.

#### Report → InventoryTransaction (Many-to-One, via Data Aggregation)
- **Relationship**: Reports aggregate data from InventoryTransaction entities.
- **Explanation**: Cost efficiency metrics (F&B Cost %, Inventory Turnover, Prime Cost) are calculated from InventoryTransaction records. Reports aggregate by transactionType ('usage' for COGS) and referenceType to track inventory consumption.

#### Report → Asset (Many-to-One, via Data Aggregation)
- **Relationship**: Reports aggregate data from Asset entities.
- **Explanation**: ROA and asset-related metrics are calculated from Asset.currentValue (depreciated value). Reports aggregate total assets for profitability and solvency calculations.

#### Report → ChartOfAccounts (Many-to-One, via Data Aggregation)
- **Relationship**: Reports aggregate data from ChartOfAccounts via JournalEntryLine.
- **Explanation**: Financial metrics (liquidity ratios, solvency ratios) are calculated from ChartOfAccounts balances derived from JournalEntryLine records. Reports use account hierarchies to aggregate parent account balances.

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
- Property → Room, RoomType, Guest, Reservation, HousekeepingTask, TaskTemplate, TaskSlaDefault, TaskAssignment, FnbMenuItem, Table, Order, InventoryItem, InventoryTask, Supplier, PurchaseOrder, Employee, Department shift, Roster day, Shift, Hours, Pay item type, Pay cycle, Time-off type, Extra pay rule, Payroll, Asset, MaintenanceOrder, MaintenanceOrderPart, Expense, BillAccount, BillPeriod, BillDocument, Payment, ChartOfAccounts, JournalEntry, Report, Document, Integration, AuditLog, Payroll settings (1:1), Holidays (1:1)
- RoomType → Room, RatePlan, TaskTemplate (optional)
- Room → Reservation, HousekeepingTask, Asset, MaintenanceOrder
- Guest → Reservation
- Employee → TaskAssignment, Order, Hours, PurchaseOrder, MaintenanceOrder (as requester), Expense, Document, This person's pay items, Pay history, Time off, Staff pay, Roster day, Shift
- User → Hours (as approver), Time off (as approver), Payroll (as creator/calculator/approver), TaskAssignment (as assigner)
- Pay cycle → Payroll, Employee, Pay history
- Time-off type → Time off
- Holidays → Holiday
- FnbMenuItem → Recipe, OrderLine
- Recipe → RecipeLine
- InventoryItem → RecipeLine, InventoryTransaction, PurchaseOrderLine, InventoryTask, MaintenanceOrderPart (optional)
- Supplier → InventoryItem, PurchaseOrder, MaintenanceOrder (optional vendor)
- MaintenanceOrder → MaintenanceOrderPart
- PurchaseOrder → PurchaseOrderLine, InventoryTask (putaway)
- Order → OrderLine
- Payroll → Staff pay, Payment file
- Staff pay → Pay item, Payslip (1:1)
- Pay item type → This person's pay items, Pay item
- Asset → MaintenanceOrder
- HousekeepingTask / MaintenanceOrder / InventoryTask → TaskAssignment
- ChartOfAccounts → ChartOfAccounts (self-referential), JournalEntryLine, Expense
- BillAccount → BillPeriod
- BillPeriod → BillDocument, Expense (optional 1:1 after pay)
- JournalEntry → JournalEntryLine
- Report → ReportSnapshot

**Many-to-Many Relationships (via Junction Tables):**
- Property ↔ User (via UserRole)
- User ↔ Role (via UserRole)

**Onboarding:**
- PendingInvite → Role, Property, inviting User; accept → UserRole

**One-to-One Relationships:**
- User ↔ Employee (optional; employee can exist without a user)
- Property ↔ Payroll settings
- Property ↔ Holidays
- FnbMenuItem ↔ Recipe (optional)

**Optional Relationships:**
- Table → Order (current active order)
- Reservation → Order (room service)
- Room → Asset (room-specific assets)
- Room → MaintenanceOrder (room-specific maintenance)
- InventoryItem → MaintenanceOrderPart (stocked parts; custom purchases omit `inventoryItemId`)
- InventoryTransaction → Various entities (via referenceType/referenceId)
- JournalEntry → Various entities (via referenceType/referenceId)
- Payment → Various entities (via referenceType/referenceId)
- Document → Expense, PurchaseOrder, Payment, MaintenanceOrder, Payroll, Payslip, Payment file (via referenceType/referenceId)
- BillPeriod → Payment (`referenceType = PropertyBill`)
- Shift → Hours (draft created on End shift or Finalize)
- Department shift → Employee (assigned default), Roster day, Shift
- Roster day → Shift (optional; Cover changes workingEmployeeId only)
- Hours → Staff pay (when included in a run)
- Hours → Payroll (lock after calculate)
- Pay history → Staff pay (`payHistoryIdUsed`)

### Key Design Patterns

1. **Multi-Property Support**: All major entities are scoped to Property, enabling tenant isolation and multi-property operations.

2. **Audit Trail**: AuditLog tracks all user actions, and InventoryTransaction/JournalEntry provide financial audit trails.

3. **Flexible Reference System**: JournalEntry, InventoryTransaction, Payment, and Document use referenceType/referenceId for polymorphic relationships, enabling flexible linking to various source entities.

4. **Hierarchical Structures**: ChartOfAccounts uses self-referential relationships for account hierarchies.

5. **Workflow Management**: Approval workflows are embedded in entities (Expense, PurchaseOrder, Payroll, Hours, Time off). Payroll enforces maker ≠ checker. Hours records lock after calculate. Operational work uses `taskAssignments` (lead + helpers) on HousekeepingTask, MaintenanceOrder, and InventoryTask.

6. **Cost Tracking**: Recipe costing, inventory costing, and asset depreciation are supported through relationships between InventoryItem, Recipe, RecipeLine, and Asset.

7. **Revenue Recognition**: Reservation and Order entities link to JournalEntry for automatic revenue posting to GL.

8. **Labor Cost Tracking**: Employee, Pay history, Hours, Time off, extra pay rules, Pay item type, Payroll, Staff pay, and Pay item enable labor cost analysis. Only approved / payment-files-ready / paid Payrolls feed Labor Cost %. Task duration does not post Hours.

9. **Document Management**: Document entity provides centralized storage for payment evidence (invoices, receipts, payslips, bank exports) linked to Expense, PurchaseOrder, Payment, MaintenanceOrder, Payroll, Payslip, and Payment file. Billing this ship stores bill/receipt files on `billDocuments` (period-scoped `_storage`).

10. **Comprehensive Reporting & Analytics**: Report and ReportSnapshot entities enable calculation of all four metric categories (Operational Performance, Profitability, Cost & Efficiency, Liquidity & Solvency) from entity data. Reports aggregate data from Reservation, Order, JournalEntry, Payroll, InventoryTransaction, Asset, and ChartOfAccounts entities. Persona-based access control ensures appropriate metric visibility (daily, monthly, yearly) for different user roles. All metrics are derived from transactional data, ensuring accuracy and real-time availability. G3 uses completed housekeeping + maintenance + inventory tasks with `completedAt <= dueAt`.

11. **Task Assignment**: Shared `taskAssignments` / `taskTemplates` / `taskSlaDefaults`. No generic Task table. Room readiness is inferred from open housekeeping tasks.

12. **Organizational billing**: BillAccount (cadence) → BillPeriod (cycle) → Payment + Expense on mark-paid. No `UtilityBill` table. Duplicate check before expense insert. Journals from billing are later.

---

## Notes for Implementation

1. **Indexing Strategy**: Create indexes on foreign keys, date fields, and frequently queried fields (status, propertyId, etc.) for performance optimization.

2. **Soft Deletes**: Terminate Employee (`employmentStatus = terminated`). Never hard-delete staff.

3. **Data Encryption**: Sensitive fields (`accountNumber`, tax IDs, API keys) should be encrypted at rest. Do not store a single opaque `bankAccount` string — use structured bank fields.

4. **Cascading Rules**: Define appropriate cascade rules for deletions (e.g., deleting a Property should cascade to related entities, but deleting a Guest should not delete Reservations).

5. **Concurrency Control**: Implement optimistic locking (version fields) for entities frequently updated concurrently (InventoryItem, Room status, etc.).

6. **Data Retention**: Define retention policies for AuditLog, ReportSnapshot, and Document entities to manage storage costs while maintaining compliance requirements.

7. **Document Storage**: Implement secure document storage (e.g., S3, Azure Blob) with encryption at rest. Consider document versioning, access control, and automated OCR processing for invoice/receipt data extraction. Implement document lifecycle management (archive, delete) based on retention policies.

8. **Multi-Currency Support**: For Phase 2, add currency fields and exchange rate tracking to financial entities.

9. **Time Zone Handling**: Store all timestamps in UTC and convert to property timezone for display.

10. **Payroll uniqueness**: Enforce at application level (Convex indexes are not unique): `(propertyId, employeeNumber)`, `(employeeId, workDate)` on Hours, `(payrollId, employeeId)` on Staff pay, no overlapping open Pay history intervals, one open Payroll per property + overlapping period. Maker ≠ checker on approve. Locked Hours reject edits.

11. **Payroll implementation**: Follow `ai/payroll-implementation.md` for lifecycle, GL template, shift→Hours, and `staffs` migration.

12. **Billing uniqueness**: One `billPeriods` row per `(accountId, periodStart)`. One Expense per paid period (`expenseId` / `sourceType`+`sourceId`). Mark-paid is a single mutation (Payment + Expense + period patch).

