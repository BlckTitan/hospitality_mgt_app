# Page Setup & Data Fetching Requirements
## Hospitality Management Suite

This document outlines which entities should have dedicated pages and the data fetching requirements for each page.

## Rendering Strategy Legend

- **SSR (Server-Side Rendering)**: Data fetched on each request, always fresh, requires authentication
- **SSG (Static Site Generation)**: Pre-rendered at build time, best for rarely-changing content
- **ISR (Incremental Static Regeneration)**: Pre-rendered with periodic revalidation, balances freshness and performance

---

## Core Platform Pages

### 1. Properties Page (`/properties`)
**Purpose**: Manage multiple properties (multi-tenant support)

**Data Fetching:**
- Fetch all `Property` records (with pagination)
- Filter by `isActive` status
- Include summary counts:
  - Total rooms per property
  - Total active reservations
  - Total employees
- Sort by: name, createdAt, updatedAt

**Related Entities to Include:**
- None (standalone entity)

**Rendering Strategy: SSR**
- **Reason**: Requires authentication (admin-only), data changes frequently (new properties, status updates), includes real-time counts that need current data, user-specific view based on permissions

---

### 2. Property Settings Page (`/properties/[propertyId]/settings`)
**Purpose**: Configure individual property settings

**Data Fetching:**
- Fetch single `Property` by `propertyId`
- Include all property attributes
- Fetch related `Integration` records for this property
- Fetch `UserRole` records to show assigned users/roles

**Related Entities to Include:**
- `Integration` (where `propertyId` matches)
- `UserRole` (where `propertyId` matches) with joined `User` and `Role`

**Rendering Strategy: SSR**
- **Reason**: Requires authentication and authorization (property admin), settings change frequently, includes sensitive configuration data, user-specific access control

---

### 3. Users Page (`/users`)
**Purpose**: Manage system users

**Data Fetching:**
- Fetch all `User` records (with pagination)
- Include related `Employee` records (if linked via `userId`)
- Include `UserRole` records with joined `Role` and `Property`
- Filter by: `isActive`, email, name
- Sort by: name, email, lastLoginAt

**Related Entities to Include:**
- `Employee` (where `userId` matches, optional)
- `UserRole` with `Role` and `Property` (joined)

**Rendering Strategy: SSR**
- **Reason**: Requires authentication (admin-only), contains sensitive user data, user list changes frequently, includes real-time status (lastLoginAt), permission-based filtering

---

### 4. User Detail Page (`/users/[userId]`)
**Purpose**: View/edit individual user details

**Data Fetching:**
- Fetch single `User` by `userId`
- Fetch related `Employee` record (if exists)
- Fetch all `UserRole` records with joined `Role` and `Property`
- Fetch `AuditLog` records for this user (recent activity)

**Related Entities to Include:**
- `Employee` (where `userId` matches, optional)
- `UserRole` with `Role` and `Property` (joined)
- `AuditLog` (where `userId` matches, limit 50, ordered by timestamp DESC)

**Rendering Strategy: SSR**
- **Reason**: Requires authentication and authorization, contains sensitive personal data, audit logs are real-time, user-specific access control, data changes frequently

---

### 5. Roles Page (`/roles`)
**Purpose**: Manage RBAC roles and permissions

**Data Fetching:**
- Fetch all `Role` records (with pagination)
- Include count of `UserRole` assignments per role
- Filter by: `isSystemRole`, name
- Sort by: name, createdAt

**Related Entities to Include:**
- Count of `UserRole` records per role (aggregated)

**Rendering Strategy: SSR**
- **Reason**: Requires authentication (admin-only), role assignments change frequently, includes real-time counts, permission-based access

---

### 6. Role Detail Page (`/roles/[roleId]`)
**Purpose**: View/edit role permissions and assignments

**Data Fetching:**
- Fetch single `Role` by `roleId`
- Fetch all `UserRole` records with joined `User` and `Property`
- Show which users have this role at which properties

**Related Entities to Include:**
- `UserRole` with `User` and `Property` (joined, where `roleId` matches)

**Rendering Strategy: SSR**
- **Reason**: Requires authentication and authorization, role assignments change frequently, includes sensitive permission data, user-specific access control

---

## Room Management Pages

### 7. Room Types Page (`/room-types`)
**Purpose**: Manage room type categories

**Data Fetching:**
- Fetch all `RoomType` records for current property (with pagination)
- Include count of `Room` records per room type
- Include active `RatePlan` count per room type
- Filter by: `isActive`, name
- Sort by: name, baseRate

**Related Entities to Include:**
- Count of `Room` records per `roomTypeId` (aggregated)
- Count of active `RatePlan` records per `roomTypeId` (aggregated)

**Rendering Strategy: ISR (revalidate: 300 seconds / 5 minutes)**
- **Reason**: Room types change infrequently but need periodic updates, includes aggregated counts that benefit from caching, property-specific data requires authentication, balances freshness with performance

---

### 8. Room Type Detail Page (`/room-types/[roomTypeId]`)
**Purpose**: View/edit room type details

**Data Fetching:**
- Fetch single `RoomType` by `roomTypeId`
- Fetch all `Room` records of this type
- Fetch all `RatePlan` records for this room type
- Include current availability and pricing

**Related Entities to Include:**
- `Room` (where `roomTypeId` matches)
- `RatePlan` (where `roomTypeId` matches)

**Rendering Strategy: ISR (revalidate: 300 seconds / 5 minutes)**
- **Reason**: Room type details change infrequently, rate plans update periodically, availability data benefits from caching, property-specific access requires authentication

---

### 9. Rooms Page (`/rooms`)
**Purpose**: Manage room inventory and status

**Data Fetching:**
- Fetch all `Room` records for current property (with pagination)
- Include joined `RoomType` data
- Include current `Reservation` status (if occupied)
- Include latest `HousekeepingTask` status
- Filter by: `status`, `roomTypeId`, `floor`, `isActive`
- Sort by: roomNumber, floor, status

**Related Entities to Include:**
- `RoomType` (joined)
- Current `Reservation` (where `roomId` matches and `status IN ('confirmed', 'checked-in')`, limit 1)
- Latest `HousekeepingTask` (where `roomId` matches, ordered by `scheduledAt` DESC, limit 1)

**Rendering Strategy: SSR**
- **Reason**: Room status changes frequently (occupied/available), includes real-time reservation and housekeeping data, critical for operational decisions, requires current data accuracy

---

### 10. Room Detail Page (`/rooms/[roomId]`)
**Purpose**: View room details, status, and history

**Data Fetching:**
- Fetch single `Room` by `roomId`
- Fetch joined `RoomType` data
- Fetch current `Reservation` (if occupied)
- Fetch recent `Reservation` history (last 10)
- Fetch recent `HousekeepingTask` records (last 10)
- Fetch `Asset` records linked to this room (if any)
- Fetch `MaintenanceOrder` records for this room (if any)

**Related Entities to Include:**
- `RoomType` (joined)
- Current `Reservation` (where `roomId` matches and `status IN ('confirmed', 'checked-in')`)
- `Reservation` history (where `roomId` matches, ordered by `checkInDate` DESC, limit 10)
- `HousekeepingTask` (where `roomId` matches, ordered by `scheduledAt` DESC, limit 10)
- `Asset` (where `roomId` matches, optional)
- `MaintenanceOrder` (where `roomId` matches, optional)

**Rendering Strategy: SSR**
- **Reason**: Current reservation status is real-time critical, housekeeping and maintenance status changes frequently, operational page requiring fresh data, property-specific access

---

### 11. Guests Page (`/guests`)
**Purpose**: Manage guest profiles

**Data Fetching:**
- Fetch all `Guest` records for current property (with pagination)
- Include count of `Reservation` records per guest
- Include total revenue per guest (sum of `Reservation.totalAmount`)
- Filter by: name, email, phone, `loyaltyNumber`
- Sort by: lastName, firstName, createdAt

**Related Entities to Include:**
- Count of `Reservation` records per `guestId` (aggregated)
- Sum of `Reservation.totalAmount` per `guestId` (aggregated)

**Rendering Strategy: SSR**
- **Reason**: Contains sensitive guest data (PII), guest list updates frequently, includes real-time aggregated revenue data, requires authentication and data privacy compliance

---

### 12. Guest Detail Page (`/guests/[guestId]`)
**Purpose**: View guest profile and booking history

**Data Fetching:**
- Fetch single `Guest` by `guestId`
- Fetch all `Reservation` records for this guest (with pagination)
- Include joined `Room` and `RoomType` data for each reservation
- Calculate guest lifetime value (sum of all reservation totals)
- Show guest preferences and loyalty information

**Related Entities to Include:**
- `Reservation` (where `guestId` matches, with joined `Room` and `RoomType`)

**Rendering Strategy: SSR**
- **Reason**: Contains sensitive PII, reservation history updates in real-time, guest preferences change, requires authentication and GDPR compliance, data privacy critical

---

### 13. Reservations Page (`/reservations`)
**Purpose**: Manage room bookings

**Data Fetching:**
- Fetch all `Reservation` records for current property (with pagination)
- Include joined `Guest`, `Room`, and `RoomType` data
- Include `Payment` records for each reservation
- Filter by: `status`, `checkInDate`, `checkOutDate`, `guestId`, `roomId`, `source`
- Sort by: `checkInDate`, `createdAt`, `confirmationNumber`

**Related Entities to Include:**
- `Guest` (joined)
- `Room` with `RoomType` (joined)
- `Payment` (where `referenceType = 'Reservation'` and `referenceId` matches, optional)

**Rendering Strategy: SSR**
- **Reason**: Reservation status changes frequently (check-in/check-out), payment status is real-time, critical operational data, requires current accuracy for front desk operations

---

### 14. Reservation Detail Page (`/reservations/[reservationId]`)
**Purpose**: View/edit reservation details

**Data Fetching:**
- Fetch single `Reservation` by `reservationId`
- Fetch joined `Guest`, `Room`, `RoomType`, and `Property` data
- Fetch all `Payment` records for this reservation
- Fetch `Order` records (room service orders linked to this reservation)
- Fetch related `Document` records (if any)

**Related Entities to Include:**
- `Guest` (joined)
- `Room` with `RoomType` (joined)
- `Property` (joined)
- `Payment` (where `referenceType = 'Reservation'` and `referenceId` matches)
- `Order` (where `reservationId` matches, optional)
- `Document` (where `referenceType = 'Reservation'` and `referenceId` matches, optional)

**Rendering Strategy: SSR**
- **Reason**: Reservation status and payments update in real-time, room service orders link dynamically, critical for guest service operations, requires fresh data

---

### 15. Rate Plans Page (`/rate-plans`)
**Purpose**: Manage pricing plans and promotions

**Data Fetching:**
- Fetch all `RatePlan` records for current property (with pagination)
- Include joined `RoomType` data
- Filter by: `isActive`, `validFrom`, `validTo`, `roomTypeId`
- Sort by: `validFrom`, name

**Related Entities to Include:**
- `RoomType` (joined)

**Rendering Strategy: ISR (revalidate: 600 seconds / 10 minutes)**
- **Reason**: Rate plans change periodically but not constantly, pricing updates benefit from caching, property-specific data, balances freshness with performance

---

### 16. Housekeeping Dashboard (`/housekeeping`)
**Purpose**: Manage housekeeping tasks and room readiness

**Data Fetching:**
- Fetch all `HousekeepingTask` records for current property (with pagination)
- Include joined `Room`, `RoomType`, and `Employee` data
- Filter by: `status`, `taskType`, `priority`, `assignedTo`, `scheduledAt`
- Sort by: `priority`, `scheduledAt`, `status`
- Include task completion statistics

**Related Entities to Include:**
- `Room` with `RoomType` (joined)
- `Employee` (joined, where `assignedTo` matches)

**Rendering Strategy: SSR**
- **Reason**: Task status changes frequently (pending/in-progress/completed), real-time operational dashboard, critical for room readiness, requires current data for scheduling decisions

---

### 17. Housekeeping Task Detail Page (`/housekeeping/[taskId]`)
**Purpose**: View/edit housekeeping task details

**Data Fetching:**
- Fetch single `HousekeepingTask` by `taskId`
- Fetch joined `Room`, `RoomType`, `Property`, and `Employee` data
- Fetch related `InventoryTransaction` records (supplies used)
- Show task checklist and completion status

**Related Entities to Include:**
- `Room` with `RoomType` (joined)
- `Property` (joined)
- `Employee` (joined, where `assignedTo` matches)
- `InventoryTransaction` (where `referenceType = 'HousekeepingTask'` and `referenceId` matches, optional)

**Rendering Strategy: SSR**
- **Reason**: Task status and completion updates in real-time, checklist progress changes frequently, operational page requiring fresh data, inventory transactions are time-sensitive

---

## Food & Beverage Management Pages

### 18. Menu Items Page (`/menu-items`)
**Purpose**: Manage F&B menu catalog

**Data Fetching:**
- Fetch all `FnbMenuItem` records for current property (with pagination)
- Include joined `Recipe` data (if exists)
- Include calculated cost from recipe
- Filter by: `category`, `subcategory`, `isAvailable`, `isActive`
- Sort by: category, name, price

**Related Entities to Include:**
- `Recipe` (joined, optional)

**Rendering Strategy: ISR (revalidate: 600 seconds / 10 minutes)**
- **Reason**: Menu items change periodically but not constantly, availability status updates benefit from caching, calculated costs from recipes are relatively stable, balances freshness with performance

---

### 19. Menu Item Detail Page (`/menu-items/[menuItemId]`)
**Purpose**: View/edit menu item details and recipe

**Data Fetching:**
- Fetch single `FnbMenuItem` by `menuItemId`
- Fetch related `Recipe` with all `RecipeLine` records
- Include joined `InventoryItem` data for each recipe line
- Show calculated recipe cost
- Include sales statistics (from `OrderLine`)

**Related Entities to Include:**
- `Recipe` (where `menuItemId` matches, optional)
- `RecipeLine` with `InventoryItem` (where `recipeId` matches, if recipe exists)
- Count and sum from `OrderLine` (where `menuItemId` matches, aggregated)

**Rendering Strategy: ISR (revalidate: 600 seconds / 10 minutes)**
- **Reason**: Menu item details change infrequently, recipe costs update periodically, sales statistics can be slightly stale, benefits from caching for performance

---

### 20. Recipes Page (`/recipes`)
**Purpose**: Manage recipes and costing

**Data Fetching:**
- Fetch all `Recipe` records (with pagination)
- Include joined `FnbMenuItem` data
- Show calculated `totalCost` and cost per serving
- Filter by: `menuItemId`, name
- Sort by: name, `totalCost`

**Related Entities to Include:**
- `FnbMenuItem` (joined)

**Rendering Strategy: ISR (revalidate: 600 seconds / 10 minutes)**
- **Reason**: Recipes change infrequently, cost calculations update when ingredient prices change (periodic), benefits from caching, property-specific data

---

### 21. Recipe Detail Page (`/recipes/[recipeId]`)
**Purpose**: View/edit recipe details and ingredients

**Data Fetching:**
- Fetch single `Recipe` by `recipeId`
- Fetch joined `FnbMenuItem` data
- Fetch all `RecipeLine` records with joined `InventoryItem` data
- Show current ingredient costs and total recipe cost
- Show cost impact if ingredient prices change

**Related Entities to Include:**
- `FnbMenuItem` (joined)
- `RecipeLine` with `InventoryItem` (where `recipeId` matches)

**Rendering Strategy: ISR (revalidate: 600 seconds / 10 minutes)**
- **Reason**: Recipe details change infrequently, ingredient costs update periodically, cost calculations benefit from caching, balances freshness with performance

---

### 22. Tables Page (`/tables`)
**Purpose**: Manage restaurant table layout

**Data Fetching:**
- Fetch all `Table` records for current property (with pagination)
- Include current `Order` status (if occupied)
- Filter by: `status`, `section`, `capacity`
- Sort by: `tableNumber`, section

**Related Entities to Include:**
- Current `Order` (where `tableId` matches and `status IN ('pending', 'in-progress')`, limit 1)

**Rendering Strategy: SSR**
- **Reason**: Table status changes frequently (occupied/available), current order status is real-time critical, operational page for restaurant floor management, requires fresh data

---

### 23. Table Detail Page (`/tables/[tableId]`)
**Purpose**: View table status and current order

**Data Fetching:**
- Fetch single `Table` by `tableId`
- Fetch current active `Order` (if any)
- Fetch `OrderLine` records for current order with joined `FnbMenuItem` data
- Fetch recent order history

**Related Entities to Include:**
- Current `Order` (where `tableId` matches and `status IN ('pending', 'in-progress')`)
- `OrderLine` with `FnbMenuItem` (where `orderId` matches current order)
- Recent `Order` history (where `tableId` matches, ordered by `createdAt` DESC, limit 10)

**Rendering Strategy: SSR**
- **Reason**: Current order status updates in real-time, order items and status change frequently, critical for POS operations, requires fresh data for service staff

---

### 24. Orders Page (`/orders`)
**Purpose**: Manage POS orders (dine-in, takeout, room service, bar)

**Data Fetching:**
- Fetch all `Order` records for current property (with pagination)
- Include joined `Table`, `Reservation`, and `Employee` data
- Include order total and status
- Filter by: `orderType`, `status`, `createdAt`, `tableId`, `serverId`
- Sort by: `createdAt` DESC, `status`

**Related Entities to Include:**
- `Table` (joined, optional)
- `Reservation` (joined, optional)
- `Employee` (joined, where `serverId` matches)

**Rendering Strategy: SSR**
- **Reason**: Order status changes frequently (pending/in-progress/ready/completed), real-time POS operations, critical for restaurant operations, requires fresh data for kitchen and service staff

---

### 25. Order Detail Page (`/orders/[orderId]`)
**Purpose**: View/edit order details and items

**Data Fetching:**
- Fetch single `Order` by `orderId`
- Fetch joined `Table`, `Reservation`, `Property`, and `Employee` data
- Fetch all `OrderLine` records with joined `FnbMenuItem` data
- Fetch `Payment` records for this order
- Show order status and preparation progress

**Related Entities to Include:**
- `Table` (joined, optional)
- `Reservation` (joined, optional)
- `Property` (joined)
- `Employee` (joined, where `serverId` matches)
- `OrderLine` with `FnbMenuItem` (where `orderId` matches)
- `Payment` (where `referenceType = 'Order'` and `referenceId` matches, optional)

**Rendering Strategy: SSR**
- **Reason**: Order status and item preparation progress update in real-time, payment status changes, critical for POS operations, requires fresh data

---

## Inventory Management Pages

### 26. Inventory Items Page (`/inventory`)
**Purpose**: Manage inventory stock

**Data Fetching:**
- Fetch all `InventoryItem` records for current property (with pagination)
- Include joined `Supplier` data (if any)
- Include current stock levels and reorder status
- Filter by: `category`, `isActive`, low stock (below `reorderPoint`)
- Sort by: name, `currentQuantity`, `category`

**Related Entities to Include:**
- `Supplier` (joined, optional)

**Rendering Strategy: SSR**
- **Reason**: Stock levels change frequently (purchases, usage, adjustments), reorder status is critical for operations, real-time inventory accuracy required, prevents stockouts

---

### 27. Inventory Item Detail Page (`/inventory/[inventoryItemId]`)
**Purpose**: View inventory item details and transaction history

**Data Fetching:**
- Fetch single `InventoryItem` by `inventoryItemId`
- Fetch joined `Supplier` and `Property` data
- Fetch recent `InventoryTransaction` records (last 50)
- Show current stock level, reorder point, and cost
- Include usage in `RecipeLine` records

**Related Entities to Include:**
- `Supplier` (joined, optional)
- `Property` (joined)
- `InventoryTransaction` (where `inventoryItemId` matches, ordered by `transactionDate` DESC, limit 50)
- `RecipeLine` (where `inventoryItemId` matches, with joined `Recipe` and `FnbMenuItem`)

**Rendering Strategy: SSR**
- **Reason**: Current stock level is real-time critical, transaction history updates frequently, cost changes affect recipe calculations, requires fresh data for inventory management

---

### 28. Inventory Transactions Page (`/inventory/transactions`)
**Purpose**: View all inventory movements

**Data Fetching:**
- Fetch all `InventoryTransaction` records for current property (with pagination)
- Include joined `InventoryItem` data
- Include reference entity information (based on `referenceType` and `referenceId`)
- Filter by: `transactionType`, `inventoryItemId`, `transactionDate`, `performedBy`
- Sort by: `transactionDate` DESC

**Related Entities to Include:**
- `InventoryItem` (joined)
- `Employee` (joined, where `performedBy` matches)
- Reference entities (polymorphic based on `referenceType`)

**Rendering Strategy: SSR**
- **Reason**: Transactions are created in real-time, audit trail requires current data, filtering and search need fresh results, critical for inventory reconciliation

---

### 29. Suppliers Page (`/suppliers`)
**Purpose**: Manage vendor/supplier relationships

**Data Fetching:**
- Fetch all `Supplier` records for current property (with pagination)
- Include count of `PurchaseOrder` records per supplier
- Include total spend per supplier (sum of `PurchaseOrder.totalAmount`)
- Filter by: `isActive`, name
- Sort by: name, createdAt

**Related Entities to Include:**
- Count of `PurchaseOrder` records per `supplierId` (aggregated)
- Sum of `PurchaseOrder.totalAmount` per `supplierId` (aggregated)

**Rendering Strategy: ISR (revalidate: 1800 seconds / 30 minutes)**
- **Reason**: Supplier list changes infrequently, aggregated spend data updates periodically, benefits from caching, balances freshness with performance

---

### 30. Supplier Detail Page (`/suppliers/[supplierId]`)
**Purpose**: View supplier details and purchase history

**Data Fetching:**
- Fetch single `Supplier` by `supplierId`
- Fetch all `PurchaseOrder` records for this supplier (with pagination)
- Include total spend and average order value
- Show `InventoryItem` records linked to this supplier

**Related Entities to Include:**
- `PurchaseOrder` (where `supplierId` matches, ordered by `orderDate` DESC)
- `InventoryItem` (where `supplierId` matches, optional)

**Rendering Strategy: ISR (revalidate: 1800 seconds / 30 minutes)**
- **Reason**: Supplier details change infrequently, purchase history updates periodically, aggregated data benefits from caching, property-specific access

---

### 31. Purchase Orders Page (`/purchase-orders`)
**Purpose**: Manage procurement and restocking

**Data Fetching:**
- Fetch all `PurchaseOrder` records for current property (with pagination)
- Include joined `Supplier` and `Employee` data
- Include `Document` records (invoices, receipts)
- Filter by: `status`, `supplierId`, `orderDate`, `expectedDeliveryDate`
- Sort by: `orderDate` DESC, `status`

**Related Entities to Include:**
- `Supplier` (joined)
- `Employee` (joined, where `createdBy` or `approvedBy` matches)
- `Document` (where `referenceType = 'PurchaseOrder'` and `referenceId` matches, optional)

**Rendering Strategy: SSR**
- **Reason**: PO status changes frequently (draft/sent/confirmed/received), approval workflows require real-time updates, delivery tracking is time-sensitive, requires fresh data

---

### 32. Purchase Order Detail Page (`/purchase-orders/[purchaseOrderId]`)
**Purpose**: View/edit purchase order details

**Data Fetching:**
- Fetch single `PurchaseOrder` by `purchaseOrderId`
- Fetch joined `Supplier`, `Property`, and `Employee` data
- Fetch all `PurchaseOrderLine` records with joined `InventoryItem` data
- Fetch related `Document` records (invoices, delivery notes, payment confirmations)
- Fetch related `InventoryTransaction` records (when received)

**Related Entities to Include:**
- `Supplier` (joined)
- `Property` (joined)
- `Employee` (joined, where `createdBy` or `approvedBy` matches)
- `PurchaseOrderLine` with `InventoryItem` (where `purchaseOrderId` matches)
- `Document` (where `referenceType = 'PurchaseOrder'` and `referenceId` matches)
- `InventoryTransaction` (where `referenceType = 'PurchaseOrder'` and `referenceId` matches, optional)

**Rendering Strategy: SSR**
- **Reason**: PO status and approval workflows update in real-time, received quantities change, document attachments are time-sensitive, requires fresh data for procurement operations

---

## Payroll Management Pages

### 33. Employees Page (`/employees`)
**Purpose**: Manage staff/employee records

**Data Fetching:**
- Fetch all `Employee` records for current property (with pagination)
- Include joined `User` data (if linked)
- Include employment status and department
- Filter by: `employmentStatus`, `department`, `position`, name
- Sort by: lastName, firstName, `hireDate`

**Related Entities to Include:**
- `User` (joined, optional, where `userId` matches)

**Rendering Strategy: SSR**
- **Reason**: Contains sensitive employee data (PII), employment status changes, requires authentication and data privacy compliance, HR-sensitive information

---

### 34. Employee Detail Page (`/employees/[employeeId]`)
**Purpose**: View employee profile and history

**Data Fetching:**
- Fetch single `Employee` by `employeeId`
- Fetch joined `User` and `Property` data
- Fetch recent `Timesheet` records (last 10)
- Fetch recent `PayrollRunLine` records (last 5 payroll runs)
- Show employment history and current assignments

**Related Entities to Include:**
- `User` (joined, optional, where `userId` matches)
- `Property` (joined)
- `Timesheet` (where `employeeId` matches, ordered by `workDate` DESC, limit 10)
- `PayrollRunLine` with `PayrollRun` (where `employeeId` matches, ordered by `payrollRunId` DESC, limit 5)

**Rendering Strategy: SSR**
- **Reason**: Contains highly sensitive PII and payroll data, timesheet and payroll history updates, requires strict authentication and authorization, GDPR/HIPAA compliance critical

---

### 35. Timesheets Page (`/timesheets`)
**Purpose**: Manage work hours and attendance

**Data Fetching:**
- Fetch all `Timesheet` records for current property (with pagination)
- Include joined `Employee` data
- Filter by: `status`, `workDate`, `employeeId`, `approvedBy`
- Sort by: `workDate` DESC, `status`

**Related Entities to Include:**
- `Employee` (joined)

**Rendering Strategy: SSR**
- **Reason**: Timesheet status changes frequently (draft/submitted/approved), approval workflows require real-time updates, critical for payroll accuracy, requires fresh data

---

### 36. Timesheet Detail Page (`/timesheets/[timesheetId]`)
**Purpose**: View/edit timesheet details

**Data Fetching:**
- Fetch single `Timesheet` by `timesheetId`
- Fetch joined `Employee`, `Property`, and approver `Employee` data
- Show hours breakdown and approval status

**Related Entities to Include:**
- `Employee` (joined, where `employeeId` matches)
- `Property` (joined)
- `Employee` as approver (joined, where `approvedBy` matches, optional)

**Rendering Strategy: SSR**
- **Reason**: Approval status updates in real-time, hours breakdown is critical for payroll, requires fresh data for accuracy, approval workflows are time-sensitive

---

### 37. Payroll Runs Page (`/payroll`)
**Purpose**: Manage payroll processing

**Data Fetching:**
- Fetch all `PayrollRun` records for current property (with pagination)
- Include summary totals (gross pay, deductions, net pay)
- Filter by: `status`, `payPeriodStart`, `payPeriodEnd`, `payDate`
- Sort by: `payPeriodEnd` DESC, `status`

**Related Entities to Include:**
- None (summary data in entity)

**Rendering Strategy: SSR**
- **Reason**: Payroll status changes frequently (draft/calculated/approved/processed/paid), contains sensitive financial data, approval workflows require real-time updates, critical for compliance

---

### 38. Payroll Run Detail Page (`/payroll/[payrollRunId]`)
**Purpose**: View payroll run details and employee entries

**Data Fetching:**
- Fetch single `PayrollRun` by `payrollRunId`
- Fetch joined `Property` and `Employee` data (creator/approver)
- Fetch all `PayrollRunLine` records with joined `Employee` data
- Show totals and breakdown by employee

**Related Entities to Include:**
- `Property` (joined)
- `Employee` as creator (joined, where `createdBy` matches)
- `Employee` as approver (joined, where `approvedBy` matches, optional)
- `PayrollRunLine` with `Employee` (where `payrollRunId` matches)

**Rendering Strategy: SSR**
- **Reason**: Contains highly sensitive payroll data, approval status updates in real-time, financial accuracy critical, requires strict access control and fresh data

---

## Maintenance Management Pages

### 39. Assets Page (`/assets`)
**Purpose**: Manage physical assets and equipment

**Data Fetching:**
- Fetch all `Asset` records for current property (with pagination)
- Include joined `Room` data (if room-specific)
- Include maintenance status and next maintenance date
- Filter by: `status`, `category`, `roomId`, `location`
- Sort by: name, `nextMaintenanceDate`, `status`

**Related Entities to Include:**
- `Room` (joined, optional, where `roomId` matches)

**Rendering Strategy: ISR (revalidate: 1800 seconds / 30 minutes)**
- **Reason**: Asset list changes infrequently, maintenance dates update periodically, status changes are not real-time critical, benefits from caching

---

### 40. Asset Detail Page (`/assets/[assetId]`)
**Purpose**: View asset details and maintenance history

**Data Fetching:**
- Fetch single `Asset` by `assetId`
- Fetch joined `Room`, `RoomType`, and `Property` data
- Fetch all `MaintenanceOrder` records for this asset
- Show depreciation schedule and current value
- Show warranty information

**Related Entities to Include:**
- `Room` with `RoomType` (joined, optional, where `roomId` matches)
- `Property` (joined)
- `MaintenanceOrder` (where `assetId` matches, ordered by `scheduledDate` DESC)

**Rendering Strategy: ISR (revalidate: 1800 seconds / 30 minutes)**
- **Reason**: Asset details change infrequently, depreciation calculations are periodic, maintenance history updates are not real-time, benefits from caching

---

### 41. Maintenance Orders Page (`/maintenance`)
**Purpose**: Manage maintenance work orders

**Data Fetching:**
- Fetch all `MaintenanceOrder` records for current property (with pagination)
- Include joined `Asset`, `Room`, and `Employee` data
- Include `Document` records (invoices, completion certificates)
- Filter by: `status`, `orderType`, `priority`, `assetId`, `roomId`, `assignedTo`
- Sort by: `priority`, `scheduledDate`, `status`

**Related Entities to Include:**
- `Asset` (joined, optional)
- `Room` (joined, optional)
- `Employee` as requester (joined, where `requestedBy` matches)
- `Employee` as assignee (joined, where `assignedTo` matches, optional)
- `Document` (where `referenceType = 'MaintenanceOrder'` and `referenceId` matches, optional)

**Rendering Strategy: SSR**
- **Reason**: Maintenance order status changes frequently (open/assigned/in-progress/completed), priority and assignment updates are real-time, critical for operations, requires fresh data

---

### 42. Maintenance Order Detail Page (`/maintenance/[maintenanceOrderId]`)
**Purpose**: View/edit maintenance work order details

**Data Fetching:**
- Fetch single `MaintenanceOrder` by `maintenanceOrderId`
- Fetch joined `Asset`, `Room`, `Property`, and `Employee` data
- Fetch related `Document` records (invoices, completion certificates, warranty docs)
- Show cost breakdown and SLA status

**Related Entities to Include:**
- `Asset` (joined, optional)
- `Room` (joined, optional)
- `Property` (joined)
- `Employee` as requester (joined, where `requestedBy` matches)
- `Employee` as assignee (joined, where `assignedTo` matches, optional)
- `Document` (where `referenceType = 'MaintenanceOrder'` and `referenceId` matches)

**Rendering Strategy: SSR**
- **Reason**: Order status and SLA updates in real-time, cost breakdown changes, document attachments are time-sensitive, requires fresh data for operations

---

## Financial Management Pages

### 43. Chart of Accounts Page (`/chart-of-accounts`)
**Purpose**: Manage GL account structure

**Data Fetching:**
- Fetch all `ChartOfAccounts` records for current property
- Build hierarchical tree structure (using `parentAccountId`)
- Include account balances (calculated from `JournalEntryLine`)
- Filter by: `accountType`, `isActive`
- Sort by: `accountCode`, name

**Related Entities to Include:**
- Account balances (aggregated from `JournalEntryLine`)

**Rendering Strategy: ISR (revalidate: 3600 seconds / 1 hour)**
- **Reason**: Chart of accounts structure changes very infrequently, account balances update periodically (when journal entries are posted), benefits significantly from caching, balances can be slightly stale

---

### 44. Chart of Accounts Detail Page (`/chart-of-accounts/[accountId]`)
**Purpose**: View account details and transactions

**Data Fetching:**
- Fetch single `ChartOfAccounts` by `accountId`
- Fetch child accounts (if parent)
- Fetch parent account (if child)
- Fetch recent `JournalEntryLine` records (last 100)
- Show account balance and transaction history

**Related Entities to Include:**
- Child `ChartOfAccounts` (where `parentAccountId` matches)
- Parent `ChartOfAccounts` (where `accountId` matches parent, optional)
- `JournalEntryLine` with `JournalEntry` (where `accountId` matches, ordered by `createdAt` DESC, limit 100)

**Rendering Strategy: ISR (revalidate: 3600 seconds / 1 hour)**
- **Reason**: Account structure changes infrequently, transaction history is historical (not real-time), account balance updates periodically, benefits from caching

---

### 45. Journal Entries Page (`/journal-entries`)
**Purpose**: Manage accounting journal entries

**Data Fetching:**
- Fetch all `JournalEntry` records for current property (with pagination)
- Include entry totals and status
- Filter by: `status`, `entryType`, `entryDate`, `referenceType`
- Sort by: `entryDate` DESC, `entryNumber`

**Related Entities to Include:**
- None (summary data in entity)

**Rendering Strategy: SSR**
- **Reason**: Journal entry status changes (draft/posted/reversed), posting workflows require real-time updates, critical for accounting accuracy, requires fresh data for audit compliance

---

### 46. Journal Entry Detail Page (`/journal-entries/[journalEntryId]`)
**Purpose**: View/edit journal entry details

**Data Fetching:**
- Fetch single `JournalEntry` by `journalEntryId`
- Fetch joined `Property` and `Employee` data
- Fetch all `JournalEntryLine` records with joined `ChartOfAccounts` data
- Show reference entity (based on `referenceType` and `referenceId`)
- Verify debits equal credits

**Related Entities to Include:**
- `Property` (joined)
- `Employee` (joined, where `postedBy` matches, optional)
- `JournalEntryLine` with `ChartOfAccounts` (where `journalEntryId` matches)
- Reference entity (polymorphic based on `referenceType`)

**Rendering Strategy: SSR**
- **Reason**: Journal entry status and posting updates in real-time, critical for accounting accuracy, audit trail requires fresh data, posting workflows are time-sensitive

---

### 47. Expenses Page (`/expenses`)
**Purpose**: Manage business expenses

**Data Fetching:**
- Fetch all `Expense` records for current property (with pagination)
- Include joined `Employee` and `ChartOfAccounts` data
- Include `Document` records (invoices, receipts)
- Filter by: `status`, `category`, `subcategory`, `expenseDate`, `submittedBy`, `approvedBy`
- Sort by: `expenseDate` DESC, `status`

**Related Entities to Include:**
- `Employee` as submitter (joined, where `submittedBy` matches)
- `Employee` as approver (joined, where `approvedBy` matches, optional)
- `ChartOfAccounts` (joined, where `glAccountId` matches)
- `Document` (where `referenceType = 'Expense'` and `referenceId` matches, optional)

**Rendering Strategy: SSR**
- **Reason**: Expense status changes frequently (draft/submitted/approved/paid), approval workflows require real-time updates, critical for financial operations, requires fresh data

---

### 48. Expense Detail Page (`/expenses/[expenseId]`)
**Purpose**: View/edit expense details and documents

**Data Fetching:**
- Fetch single `Expense` by `expenseId`
- Fetch joined `Property`, `Employee`, and `ChartOfAccounts` data
- Fetch all related `Document` records (invoices, receipts, payment confirmations)
- Fetch related `Payment` records (if paid)
- Fetch related `JournalEntry` (if posted to GL)

**Related Entities to Include:**
- `Property` (joined)
- `Employee` as submitter (joined, where `submittedBy` matches)
- `Employee` as approver (joined, where `approvedBy` matches, optional)
- `ChartOfAccounts` (joined, where `glAccountId` matches)
- `Document` (where `referenceType = 'Expense'` and `referenceId` matches)
- `Payment` (where `referenceType = 'Expense'` and `referenceId` matches, optional)
- `JournalEntry` (where `referenceType = 'Expense'` and `referenceId` matches, optional)

**Rendering Strategy: SSR**
- **Reason**: Expense status and approval updates in real-time, payment status changes, document attachments are time-sensitive, requires fresh data for financial operations

---

### 49. Utility Bills Page (`/utility-bills`)
**Purpose**: Manage utility bills and payments

**Data Fetching:**
- Fetch all `UtilityBill` records for current property (with pagination)
- Include joined `ChartOfAccounts` data
- Include `Document` records (bill documents, payment receipts)
- Filter by: `utilityType`, `status`, `billingPeriodStart`, `billingPeriodEnd`, `dueDate`
- Sort by: `billingPeriodEnd` DESC, `status`

**Related Entities to Include:**
- `ChartOfAccounts` (joined, where `glAccountId` matches)
- `Document` (where `referenceType = 'UtilityBill'` and `referenceId` matches, optional)

**Rendering Strategy: SSR**
- **Reason**: Bill status changes (pending/paid/overdue), payment status updates in real-time, due date tracking is time-sensitive, requires fresh data for financial management

---

### 50. Utility Bill Detail Page (`/utility-bills/[utilityBillId]`)
**Purpose**: View utility bill details and documents

**Data Fetching:**
- Fetch single `UtilityBill` by `utilityBillId`
- Fetch joined `Property` and `ChartOfAccounts` data
- Fetch all related `Document` records (bill documents, payment receipts)
- Fetch related `Payment` records (if paid)
- Fetch related `JournalEntry` (if posted to GL)

**Related Entities to Include:**
- `Property` (joined)
- `ChartOfAccounts` (joined, where `glAccountId` matches)
- `Document` (where `referenceType = 'UtilityBill'` and `referenceId` matches)
- `Payment` (where `referenceType = 'UtilityBill'` and `referenceId` matches, optional)
- `JournalEntry` (where `referenceType = 'UtilityBill'` and `referenceId` matches, optional)

**Rendering Strategy: SSR**
- **Reason**: Bill payment status updates in real-time, document attachments are time-sensitive, requires fresh data for financial operations and compliance

---

### 51. Payments Page (`/payments`)
**Purpose**: Manage all payments (received and made)

**Data Fetching:**
- Fetch all `Payment` records for current property (with pagination)
- Include reference entity information (based on `referenceType` and `referenceId`)
- Include `Document` records (receipts, bank statements)
- Filter by: `paymentType`, `status`, `paymentMethod`, `paymentDate`, `referenceType`
- Sort by: `paymentDate` DESC, `status`

**Related Entities to Include:**
- `Employee` (joined, where `processedBy` matches, optional)
- Reference entity (polymorphic based on `referenceType`)
- `Document` (where `referenceType = 'Payment'` and `referenceId` matches, optional)

**Rendering Strategy: SSR**
- **Reason**: Payment status changes frequently (pending/completed/failed/refunded), real-time payment processing, critical for cash flow management, requires fresh data for reconciliation

---

### 52. Payment Detail Page (`/payments/[paymentId]`)
**Purpose**: View payment details and documents

**Data Fetching:**
- Fetch single `Payment` by `paymentId`
- Fetch joined `Property` and `Employee` data
- Fetch reference entity (based on `referenceType` and `referenceId`)
- Fetch all related `Document` records (receipts, bank statements, transaction confirmations)

**Related Entities to Include:**
- `Property` (joined)
- `Employee` (joined, where `processedBy` matches, optional)
- Reference entity (polymorphic based on `referenceType`)
- `Document` (where `referenceType = 'Payment'` and `referenceId` matches)

**Rendering Strategy: SSR**
- **Reason**: Payment status updates in real-time, transaction confirmations are time-sensitive, critical for financial reconciliation, requires fresh data

---

## Reporting & Analytics Pages

### 53. Reports Dashboard (`/reports`)
**Purpose**: View and manage reports

**Data Fetching:**
- Fetch all `Report` records for current property (with pagination)
- Include `ReportSnapshot` data (latest snapshot per report)
- Filter by: `reportType`, `isScheduled`
- Sort by: `lastRunAt` DESC, name

**Related Entities to Include:**
- Latest `ReportSnapshot` per report (where `reportId` matches, ordered by `snapshotDate` DESC, limit 1)

**Rendering Strategy: ISR (revalidate: 1800 seconds / 30 minutes)**
- **Reason**: Report configurations change infrequently, snapshot data is pre-calculated and cached, report generation is periodic, benefits from caching for performance

---

### 54. Report Detail Page (`/reports/[reportId]`)
**Purpose**: View report configuration and results

**Data Fetching:**
- Fetch single `Report` by `reportId`
- Fetch all `ReportSnapshot` records (with pagination)
- Show report configuration and metrics
- Display latest snapshot data

**Related Entities to Include:**
- `ReportSnapshot` (where `reportId` matches, ordered by `snapshotDate` DESC)

**Rendering Strategy: ISR (revalidate: 1800 seconds / 30 minutes)**
- **Reason**: Report snapshots are pre-calculated and cached, configuration changes infrequently, historical data doesn't need real-time updates, benefits from caching

---

### 55. Report Builder Page (`/reports/new`)
**Purpose**: Create custom report configurations

**Data Fetching:**
- Fetch available metrics and date range options
- Fetch `Property` data for filtering
- No entity data needed (creation form)

**Related Entities to Include:**
- `Property` (for property selection)

**Rendering Strategy: SSG or SSR**
- **Reason**: Static form page, property list changes infrequently, can use SSG for performance or SSR for property-specific filtering, no real-time data needed

---

## Document Management Pages

### 56. Documents Page (`/documents`)
**Purpose**: Manage uploaded documents

**Data Fetching:**
- Fetch all `Document` records for current property (with pagination)
- Include reference entity information (based on `referenceType` and `referenceId`)
- Include `Employee` data (uploader, verifier)
- Filter by: `documentType`, `referenceType`, `isVerified`, `uploadedBy`, `uploadedAt`
- Sort by: `uploadedAt` DESC, `documentType`

**Related Entities to Include:**
- `Employee` as uploader (joined, where `uploadedBy` matches)
- `Employee` as verifier (joined, where `verifiedBy` matches, optional)
- Reference entity (polymorphic based on `referenceType`)

**Rendering Strategy: SSR**
- **Reason**: Documents are uploaded in real-time, verification status changes, document list updates frequently, requires fresh data for compliance and audit trails

---

### 57. Document Detail Page (`/documents/[documentId]`)
**Purpose**: View document details and metadata

**Data Fetching:**
- Fetch single `Document` by `documentId`
- Fetch joined `Property` and `Employee` data
- Fetch reference entity (based on `referenceType` and `referenceId`)
- Show OCR extracted data (if available)
- Display document file

**Related Entities to Include:**
- `Property` (joined)
- `Employee` as uploader (joined, where `uploadedBy` matches)
- `Employee` as verifier (joined, where `verifiedBy` matches, optional)
- Reference entity (polymorphic based on `referenceType`)

**Rendering Strategy: SSR**
- **Reason**: Verification status updates in real-time, OCR processing status changes, document access requires authentication, requires fresh data for compliance

---

## Integration & System Pages

### 58. Integrations Page (`/integrations`)
**Purpose**: Manage external system integrations

**Data Fetching:**
- Fetch all `Integration` records for current property
- Include sync status and last sync timestamp
- Filter by: `integrationType`, `status`
- Sort by: `integrationType`, `status`

**Related Entities to Include:**
- None (standalone entity)

**Rendering Strategy: SSR**
- **Reason**: Integration status changes frequently (active/inactive/error), sync status updates in real-time, error messages are time-sensitive, requires fresh data for monitoring

---

### 59. Integration Detail Page (`/integrations/[integrationId]`)
**Purpose**: View/edit integration configuration

**Data Fetching:**
- Fetch single `Integration` by `integrationId`
- Fetch joined `Property` data
- Show configuration (masked/encrypted)
- Show sync history and error logs

**Related Entities to Include:**
- `Property` (joined)

**Rendering Strategy: SSR**
- **Reason**: Integration status and sync history update in real-time, error logs are time-sensitive, configuration changes require authentication, requires fresh data for troubleshooting

---

### 60. Audit Logs Page (`/audit-logs`)
**Purpose**: View system audit trail

**Data Fetching:**
- Fetch all `AuditLog` records for current property (with pagination)
- Include joined `User` and `Property` data
- Filter by: `userId`, `action`, `entityType`, `entityId`, `timestamp`
- Sort by: `timestamp` DESC

**Related Entities to Include:**
- `User` (joined)
- `Property` (joined)

**Rendering Strategy: SSR**
- **Reason**: Audit logs are created in real-time, security and compliance critical, requires immediate visibility of system actions, filtering needs fresh results

---

## Dashboard Pages

### 61. Main Dashboard (`/dashboard`)
**Purpose**: Overview of key metrics and recent activity

**Data Fetching:**
- Fetch summary statistics:
  - Today's reservations (count, revenue)
  - Today's orders (count, revenue)
  - Pending housekeeping tasks
  - Low stock inventory items
  - Pending maintenance orders
  - Recent payments
- Fetch recent `Reservation` records (last 10)
- Fetch recent `Order` records (last 10)
- Fetch upcoming `Reservation` records (next 7 days)
- Fetch key metrics from latest `ReportSnapshot` (if available)

**Related Entities to Include:**
- `Reservation` (where `checkInDate` = today or `status IN ('confirmed', 'checked-in')`, limit 10)
- `Order` (where `createdAt` >= today, limit 10)
- `Reservation` (where `checkInDate` BETWEEN today AND today+7 days)
- `HousekeepingTask` (where `status = 'pending'`, count)
- `InventoryItem` (where `currentQuantity < reorderPoint`, count)
- `MaintenanceOrder` (where `status IN ('open', 'assigned')`, count)
- Latest `ReportSnapshot` (for key metrics)

**Rendering Strategy: SSR**
- **Reason**: Dashboard shows real-time operational data (today's reservations, orders, pending tasks), metrics update frequently, critical for daily operations, requires fresh data for decision-making

---

## Summary

### Total Pages: 61

**Breakdown by Category:**
- Core Platform: 6 pages
- Room Management: 11 pages
- Food & Beverage: 8 pages
- Inventory Management: 7 pages
- Payroll Management: 6 pages
- Maintenance Management: 4 pages
- Financial Management: 10 pages
- Reporting & Analytics: 3 pages
- Document Management: 2 pages
- Integration & System: 3 pages
- Dashboard: 1 page

### Rendering Strategy Distribution

**SSR (Server-Side Rendering): ~45 pages (74%)**
- **Use Cases**: Real-time operational data, status changes, approval workflows, sensitive data, authentication-required pages
- **Examples**: Reservations, Orders, Rooms, Payments, Expenses, Timesheets, Dashboard
- **Revalidation**: None (always fresh on each request)

**ISR (Incremental Static Regeneration): ~15 pages (25%)**
- **Use Cases**: Data that changes periodically but not constantly, benefits from caching, can tolerate slight staleness
- **Revalidation Intervals**:
  - **5 minutes (300s)**: Room Types, Room Type Details
  - **10 minutes (600s)**: Rate Plans, Menu Items, Recipes, Recipe Details
  - **30 minutes (1800s)**: Suppliers, Assets, Reports, Report Details
  - **1 hour (3600s)**: Chart of Accounts, Chart of Accounts Detail
- **Examples**: Room Types, Menu Items, Recipes, Suppliers, Assets, Reports

**SSG (Static Site Generation): ~1 page (1%)**
- **Use Cases**: Static forms, rarely-changing configuration pages
- **Examples**: Report Builder (can also use SSR for property-specific filtering)

### Rendering Strategy Decision Guidelines

1. **Use SSR when:**
   - Data changes frequently (status updates, real-time operations)
   - Requires authentication/authorization
   - Contains sensitive data (PII, financial, payroll)
   - Approval workflows or time-sensitive operations
   - Real-time dashboards and operational pages

2. **Use ISR when:**
   - Data changes periodically but not constantly
   - Can benefit from caching for performance
   - Slight data staleness is acceptable
   - Reference data (room types, menu items, suppliers)
   - Pre-calculated reports and snapshots

3. **Use SSG when:**
   - Content is truly static or changes very rarely
   - No user-specific data required
   - Public-facing pages (if applicable)
   - Configuration forms with minimal dynamic data

### Revalidation Interval Recommendations

- **5 minutes**: Frequently referenced but relatively stable data (room types)
- **10 minutes**: Periodic updates with moderate change frequency (menu items, rate plans)
- **30 minutes**: Infrequently changing reference data (suppliers, assets, reports)
- **1 hour**: Very stable data with periodic updates (chart of accounts)

### Key Data Fetching Patterns

1. **List Pages**: Always include pagination, filtering, and sorting
2. **Detail Pages**: Include the main entity + all related entities via joins
3. **Polymorphic References**: Use `referenceType` and `referenceId` to fetch related entities dynamically
4. **Aggregations**: Include counts, sums, and averages for summary statistics
5. **Recent History**: Limit to last 10-50 records for performance
6. **Status Filtering**: Always filter by active/status fields where applicable
7. **Property Scoping**: All queries should be scoped to current property (except system-wide pages like Users, Roles)

### Performance Considerations

- Use pagination for all list pages (default: 20-50 items per page)
- Limit related entity queries (e.g., "last 10 reservations")
- Use database indexes on foreign keys and frequently filtered fields
- Consider caching for frequently accessed data (e.g., room types, menu items)
- Use eager loading for required joins, lazy loading for optional relationships
- Implement virtual scrolling for large lists

