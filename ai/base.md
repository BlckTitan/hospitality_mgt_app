# TypeScript Interfaces - Hospitality Management Suite

This document defines TypeScript interfaces for all entities in the Hospitality Management Suite based on the ERD and PRD.

## Core Platform Interfaces

### Property
```typescript
interface Property {
  propertyId: string;
  name: string;
  address: string;
  contactNumber: string;
  email: string;
  timezone: string;
  country: string; // ISO 3166-1 alpha-2; selects payroll jurisdiction pack
  currency: string;
  taxId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### User
```typescript
interface User {
  userId: string;
  externalId?: string;
  email: string;
  name: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Role
```typescript
interface Role {
  roleId: string;
  name: string;
  description?: string;
  permissions: Record<string, boolean>;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### UserRole
```typescript
interface UserRole {
  userRoleId: string;
  userId: string;
  roleId: string;
  propertyId: string;
  assignedAt: Date;
  assignedBy: string;
}
```

---

## Room Management Interfaces

### RoomType
```typescript
interface RoomType {
  roomTypeId: string;
  propertyId: string;
  name: string;
  description?: string;
  maxOccupancy: number;
  baseRate: number;
  amenities: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Room
```typescript
interface Room {
  roomId: string;
  propertyId: string;
  roomTypeId: string;
  roomNumber: string;
  floor: number;
  status: 'available' | 'occupied' | 'out-of-order' | 'maintenance';
  lastCleanedAt?: Date;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Guest
```typescript
interface Guest {
  guestId: string;
  propertyId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  loyaltyNumber?: string;
  preferences?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Reservation
```typescript
interface Reservation {
  reservationId: string;
  propertyId: string;
  roomId: string;
  guestId: string;
  confirmationNumber: string;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfGuests: number;
  rate: number;
  totalAmount: number;
  depositAmount: number;
  status: 'pending' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';
  source: 'direct' | 'ota' | 'walk-in' | 'phone' | 'other';
  specialRequests?: string;
  createdAt: Date;
  updatedAt: Date;
  checkedInAt?: Date;
  checkedOutAt?: Date;
}
```

### RatePlan
```typescript
interface RatePlan {
  ratePlanId: string;
  propertyId: string;
  roomTypeId: string;
  name: string;
  description?: string;
  baseRate: number;
  discountPercent?: number;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### HousekeepingTask
```typescript
interface HousekeepingTask {
  taskId: string;
  propertyId: string;
  roomId: string;
  assignedTo: string; // Employee ID
  taskType: 'checkout' | 'stayover' | 'deep-clean' | 'inspection';
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  priority: 'low' | 'medium' | 'high';
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number; // minutes
  actualDuration?: number; // minutes
  notes?: string;
  checklist?: ChecklistItem[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChecklistItem {
  id: string;
  name: string;
  isComplete: boolean;
}
```

---

## Food & Beverage Management Interfaces

### FnbMenuItem
```typescript
interface FnbMenuItem {
  menuItemId: string;
  propertyId: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  price: number;
  cost?: number;
  isAvailable: boolean;
  imageUrl?: string;
  preparationTime?: number; // minutes
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Recipe
```typescript
interface Recipe {
  recipeId: string;
  menuItemId: string;
  name: string;
  servings: number;
  instructions?: string;
  totalCost?: number;
  lastCalculatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### RecipeLine
```typescript
interface RecipeLine {
  recipeLineId: string;
  recipeId: string;
  inventoryItemId: string;
  quantity: number;
  unit: string;
  wastePercent?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Table
```typescript
interface Table {
  tableId: string;
  propertyId: string;
  tableNumber: string;
  capacity: number;
  section?: string;
  status: 'available' | 'occupied' | 'reserved' | 'out-of-service';
  currentOrderId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Order
```typescript
interface Order {
  orderId: string;
  propertyId: string;
  tableId?: string;
  reservationId?: string;
  orderType: 'dine-in' | 'takeout' | 'room-service' | 'bar';
  status: 'pending' | 'in-progress' | 'ready' | 'completed' | 'cancelled';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  serverId: string; // Employee ID
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
```

### OrderLine
```typescript
interface OrderLine {
  orderLineId: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Inventory Management Interfaces

### InventoryItem
```typescript
interface InventoryItem {
  inventoryItemId: string;
  propertyId: string;
  supplierId?: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  currentQuantity: number;
  reorderPoint: number;
  reorderQuantity: number;
  unitCost: number;
  lastCostUpdate?: Date;
  location?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### InventoryTransaction
```typescript
interface InventoryTransaction {
  transactionId: string;
  inventoryItemId: string;
  transactionType: 'purchase' | 'usage' | 'adjustment' | 'waste' | 'transfer';
  quantity: number;
  unitCost: number;
  totalCost: number;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  performedBy?: string; // Employee ID
  transactionDate: Date;
  createdAt: Date;
}
```

### Supplier
```typescript
interface Supplier {
  supplierId: string;
  propertyId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  taxId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### PurchaseOrder
```typescript
interface PurchaseOrder {
  purchaseOrderId: string;
  propertyId: string;
  supplierId: string;
  orderNumber: string;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  createdBy: string; // Employee ID
  approvedBy?: string;
  approvedAt?: Date;
  receivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### PurchaseOrderLine
```typescript
interface PurchaseOrderLine {
  purchaseOrderLineId: string;
  purchaseOrderId: string;
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Payroll Management Interfaces

See `ai/payroll-implementation.md` for lifecycle and uniqueness rules.
People table is Convex `staffs`. `employeeId` in these interfaces is `Id<"staffs">`.

### Employee
```typescript
type PayType = 'hourly' | 'salary' | 'mixed';
type PayFrequency = 'weekly' | 'bi-weekly' | 'monthly';
type Department =
  | 'front-office'
  | 'housekeeping'
  | 'fnb'
  | 'maintenance'
  | 'finance'
  | 'admin'
  | 'other';

interface Employee {
  employeeId: string;
  propertyId: string;
  userId?: string; // optional; casuals/contractors need no login
  employeeNumber: string; // unique per property
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  address?: string;
  stateOfOrigin?: string;
  LGA?: string;
  hireDate: Date;
  terminationDate?: Date;
  employmentStatus: 'active' | 'terminated' | 'on-leave';
  department: Department;
  position: string;
  payType: PayType; // denormalized from current Pay history (EmployeeCompensation)
  baseSalary?: number;
  hourlyRate?: number;
  payScheduleId?: string;
  paymentMethod: 'bank' | 'cash' | 'mobile_money' | 'check';
  taxId?: string; // required when the property country pack has statutory deductions
  bankName?: string;
  accountName?: string;
  accountNumber?: string; // encrypted
  routingCode?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Payroll settings
UI: **Payroll settings**. Schema table: `propertyPayrollSettings`. Interface: `PropertyPayrollSettings`.
```typescript
interface PropertyPayrollSettings {
  propertyPayrollSettingsId: string;
  propertyId: string;
  country: string;
  jurisdictionPack: string; // e.g. NG, US, generic
  regularHoursLimitDaily?: number;
  regularHoursLimitWeekly?: number;
  overtimeMultiplier: number; // fallback daily OT if no extra pay rule
  defaultPayScheduleId?: string;
  bankExportFormat: 'generic_csv';
  createdAt: Date;
  updatedAt: Date;
}
```

### Pay item type
UI: **Pay item type**. Schema table: `payComponents`. Interface: `PayComponent`.
```typescript
interface PayComponent {
  payComponentId: string;
  propertyId: string;
  code: string;
  name: string;
  kind: 'earning' | 'allowance' | 'deduction';
  source: 'statutory' | 'custom';
  calculation: 'flat' | 'percent_of_gross' | 'pack_formula';
  formulaKey?: string;
  params?: Record<string, unknown>;
  defaultAmount?: number;
  defaultRate?: number;
  glAccountId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### This person's pay items
UI: **This person’s pay items**. Schema table: `employeePayComponents`. Interface: `EmployeePayComponent`.
```typescript
interface EmployeePayComponent {
  employeePayComponentId: string;
  employeeId: string;
  payComponentId: string;
  amount?: number;
  rate?: number;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Pay history
UI: **Pay rate** / **Pay history**. Schema table: `employeeCompensations`. Interface: `EmployeeCompensation`.
```typescript
interface EmployeeCompensation {
  employeeCompensationId: string;
  employeeId: string;
  payType: PayType;
  baseSalary?: number;
  hourlyRate?: number;
  payScheduleId?: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  changedBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Pay cycle
UI: **Pay cycle**. Schema table: `paySchedules`. Interface: `PaySchedule`.
```typescript
interface PaySchedule {
  payScheduleId: string;
  propertyId: string;
  name: string;
  frequency: PayFrequency;
  anchorDate: Date;
  cutoffDaysBeforePayDate: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Time-off type
UI: **Time-off type**. Schema table: `leaveTypes`. Interface: `LeaveType`.
```typescript
interface LeaveType {
  leaveTypeId: string;
  propertyId: string;
  code: string;
  name: string;
  paid: boolean;
  countsTowardOvertime: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Time off
UI: **Time off**. Schema table: `leaveEntries`. Interface: `LeaveEntry`.
```typescript
interface LeaveEntry {
  leaveEntryId: string;
  propertyId: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Holidays
UI: **Holidays**. Schema table: `holidayCalendars`. Interface: `HolidayCalendar`.
```typescript
interface HolidayCalendar {
  holidayCalendarId: string;
  propertyId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Holiday
```typescript
interface Holiday {
  holidayId: string;
  holidayCalendarId: string;
  date: Date;
  name: string;
  isPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Extra pay rules
UI: **Extra pay rules**. Schema table: `premiumRules`. Interface: `PremiumRule`.
```typescript
interface PremiumRule {
  premiumRuleId: string;
  propertyId: string;
  kind: 'daily_overtime' | 'weekly_overtime' | 'night' | 'weekend' | 'public_holiday';
  multiplier: number;
  startTime?: string;
  endTime?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Hours
UI: **Hours**. Schema table: `timesheets`. Interface: `Timesheet`.
```typescript
interface Timesheet {
  timesheetId: string;
  employeeId: string;
  propertyId: string;
  workDate: Date;
  clockInTime?: Date;
  clockOutTime?: Date;
  regularHours: number;
  overtimeHours: number;
  breakDuration?: number; // minutes
  source: 'manual' | 'csv' | 'shift';
  shiftId?: string;
  payrollRunLineId?: string;
  lockedAt?: Date;
  lockedByRunId?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approvedBy?: string; // User id
  approvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Payroll
UI: **Payroll**. Schema table: `payrollRuns`. Interface: `PayrollRun`.
```typescript
interface PayrollRun {
  payrollRunId: string;
  propertyId: string;
  payScheduleId: string;
  runType: 'regular';
  payPeriodStart: Date;
  payPeriodEnd: Date;
  payDate: Date;
  payFrequency: PayFrequency;
  status: 'draft' | 'calculated' | 'approved' | 'processed' | 'paid';
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  createdBy: string; // User id
  calculatedBy?: string; // User id; must not equal approvedBy
  approvedBy?: string; // User id; must not equal createdBy or calculatedBy
  approvedAt?: Date;
  processedAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Staff pay
UI: **Staff pay**. Schema table: `payrollRunLines`. Interface: `PayrollRunLine`.
```typescript
interface PayrollRunLine {
  payrollRunLineId: string;
  payrollRunId: string;
  employeeId: string;
  compensationIdUsed?: string;
  payTypeUsed: PayType;
  hourlyRateUsed?: number;
  baseSalaryUsed?: number;
  overtimeMultiplierUsed?: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  gratuityAmount?: number; // manual only
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Pay item
UI: **Pay item**. Schema table: `payrollLineItems`. Interface: `PayrollLineItem`.
```typescript
interface PayrollLineItem {
  payrollLineItemId: string;
  payrollRunLineId: string;
  payComponentId?: string;
  kind: 'earning' | 'allowance' | 'overtime' | 'gratuity' | 'deduction';
  code: string;
  label: string;
  amount: number;
  glAccountId?: string;
  createdAt: Date;
}
```

### Payslip
UI: **Payslip**. Schema table: `payslips`. Interface: `Payslip`.
```typescript
interface Payslip {
  payslipId: string;
  payrollRunLineId: string;
  propertyId: string;
  employeeId: string;
  snapshot: Record<string, unknown>;
  documentId?: string;
  generatedAt: Date;
  createdAt: Date;
}
```

### Payment file
UI: **Payment file**. Schema table: `payrollExports`. Interface: `PayrollExport`.
```typescript
interface PayrollExport {
  payrollExportId: string;
  payrollRunId: string;
  format: 'generic_csv' | 'bank_file' | 'cash_sheet';
  status: 'pending' | 'generated' | 'downloaded' | 'failed';
  documentId?: string;
  fileUrl?: string;
  generatedBy: string; // User id
  generatedAt?: Date;
  createdAt: Date;
}
```

---

## Maintenance Management Interfaces

### Asset
```typescript
interface Asset {
  assetId: string;
  propertyId: string;
  roomId?: string;
  assetTag: string;
  name: string;
  category: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: Date;
  purchaseCost?: number;
  depreciationMethod?: string;
  usefulLife?: number; // years
  currentValue?: number;
  location?: string;
  status: 'operational' | 'maintenance' | 'retired';
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  warrantyExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### MaintenanceOrder
```typescript
interface MaintenanceOrder {
  maintenanceOrderId: string;
  propertyId: string;
  assetId?: string;
  roomId?: string;
  requestedBy: string;
  assignedTo?: string;
  orderType: 'preventive' | 'corrective' | 'emergency' | 'inspection';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description?: string;
  status: 'open' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  scheduledDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedCost?: number;
  actualCost?: number;
  slaDeadline?: Date;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Financial Management Interfaces

### ChartOfAccounts
```typescript
interface ChartOfAccounts {
  accountId: string;
  propertyId: string;
  accountCode: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentAccountId?: string;
  isActive: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### JournalEntry
```typescript
interface JournalEntry {
  journalEntryId: string;
  propertyId: string;
  entryNumber: string;
  entryDate: Date;
  entryType: 'manual' | 'automatic' | 'adjustment' | 'reversal';
  referenceType?: string;
  referenceId?: string;
  description: string;
  totalDebit: number;
  totalCredit: number;
  status: 'draft' | 'posted' | 'reversed';
  postedAt?: Date;
  postedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### JournalEntryLine
```typescript
interface JournalEntryLine {
  journalEntryLineId: string;
  journalEntryId: string;
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
  createdAt: Date;
}
```

### Expense
```typescript
interface Expense {
  expenseId: string;
  propertyId: string;
  category: string;
  subcategory?: string;
  amount: number;
  expenseDate: Date;
  description: string;
  vendor?: string;
  invoiceNumber?: string;
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected';
  submittedBy?: string;
  approvedBy?: string;
  approvedAt?: Date;
  glAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### UtilityBill
```typescript
interface UtilityBill {
  utilityBillId: string;
  propertyId: string;
  utilityType: 'electricity' | 'water' | 'gas' | 'internet' | 'phone' | 'other';
  provider: string;
  accountNumber?: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  dueDate: Date;
  amount: number;
  usageAmount?: number;
  unitRate?: number;
  meterReading?: number;
  previousMeterReading?: number;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: Date;
  glAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Payment
```typescript
interface Payment {
  paymentId: string;
  propertyId: string;
  paymentType: 'reservation' | 'order' | 'expense' | 'payroll' | 'other';
  referenceType: string;
  referenceId: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'check';
  paymentDate: Date;
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  processedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Reporting & Analytics Interfaces

### Report
```typescript
interface Report {
  reportId: string;
  propertyId: string;
  name: string;
  reportType:
    | 'daily-flash'
    | 'monthly-statement'
    | 'yearly-trend'
    | 'operational-performance'
    | 'profitability'
    | 'cost-efficiency'
    | 'liquidity-solvency'
    | 'custom';
  configuration: ReportConfiguration;
  createdBy: string;
  isScheduled: boolean;
  scheduleFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ReportConfiguration {
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  metrics?: string[];
  personaAccess?: string[];
}
```

### ReportSnapshot
```typescript
interface ReportSnapshot {
  snapshotId: string;
  reportId: string;
  snapshotDate: Date;
  periodType: 'daily' | 'monthly' | 'yearly';
  data: ReportMetricsData;
  generatedAt: Date;
  generatedBy?: string;
}

interface ReportMetricsData {
  operational_performance?: OperationalPerformanceMetrics;
  profitability?: ProfitabilityMetrics;
  cost_efficiency?: CostEfficiencyMetrics;
  liquidity_solvency?: LiquiditySolvencyMetrics;
}

interface OperationalPerformanceMetrics {
  revpar?: number;
  occupancy_rate?: number;
  adr?: number;
  trevpar?: number;
  average_check?: number;
  revpash?: number;
}

interface ProfitabilityMetrics {
  goppar?: number;
  ebitda_margin?: number;
  net_profit_margin?: number;
  gross_profit_margin?: number;
  roa?: number;
  roe?: number;
}

interface CostEfficiencyMetrics {
  labor_cost_percentage?: number;
  f_and_b_cost_percentage?: number;
  cpor?: number;
  prime_cost?: number;
  inventory_turnover?: number;
}

interface LiquiditySolvencyMetrics {
  current_ratio?: number;
  quick_ratio?: number;
  debt_to_equity?: number;
  interest_coverage?: number;
  cash_flow_from_operations?: number;
}
```

---

## Document Management Interfaces

### Document
```typescript
interface Document {
  documentId: string;
  propertyId: string;
  documentType:
    | 'invoice'
    | 'receipt'
    | 'contract'
    | 'delivery-note'
    | 'payment-confirmation'
    | 'utility-bill'
    | 'other';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  documentDate?: Date;
  amount?: number;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  ocrData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Integration & System Interfaces

### Integration
```typescript
interface Integration {
  integrationId: string;
  propertyId: string;
  integrationType: 'pms' | 'pos' | 'accounting' | 'payment-gateway' | 'ota' | 'other';
  provider: string;
  status: 'active' | 'inactive' | 'error';
  configuration: Record<string, any>; // encrypted
  lastSyncAt?: Date;
  syncFrequency?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### AuditLog
```typescript
interface AuditLog {
  auditLogId: string;
  propertyId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}
```

---

## Enum Definitions

```typescript
// Room Status
enum RoomStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  OUT_OF_ORDER = 'out-of-order',
  MAINTENANCE = 'maintenance',
}

// Reservation Status
enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked-in',
  CHECKED_OUT = 'checked-out',
  CANCELLED = 'cancelled',
}

// Booking Source
enum BookingSource {
  DIRECT = 'direct',
  OTA = 'ota',
  WALK_IN = 'walk-in',
  PHONE = 'phone',
  OTHER = 'other',
}

// Order Type
enum OrderType {
  DINE_IN = 'dine-in',
  TAKEOUT = 'takeout',
  ROOM_SERVICE = 'room-service',
  BAR = 'bar',
}

// Order Status
enum OrderStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  READY = 'ready',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Transaction Type
enum InventoryTransactionType {
  PURCHASE = 'purchase',
  USAGE = 'usage',
  ADJUSTMENT = 'adjustment',
  WASTE = 'waste',
  TRANSFER = 'transfer',
}

// Payroll Status
enum PayrollStatus {
  DRAFT = 'draft',
  CALCULATED = 'calculated',
  APPROVED = 'approved',
  PROCESSED = 'processed',
  PAID = 'paid',
}

// Maintenance Order Type
enum MaintenanceOrderType {
  PREVENTIVE = 'preventive',
  CORRECTIVE = 'corrective',
  EMERGENCY = 'emergency',
  INSPECTION = 'inspection',
}

// Maintenance Order Priority
enum MaintenanceOrderPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Journal Entry Type
enum JournalEntryType {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic',
  ADJUSTMENT = 'adjustment',
  REVERSAL = 'reversal',
}

// Expense Status
enum ExpenseStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  PAID = 'paid',
  REJECTED = 'rejected',
}

// Payment Method
enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  DIGITAL_WALLET = 'digital_wallet',
  CHECK = 'check',
}

// Payment Status
enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// Document Type
enum DocumentType {
  INVOICE = 'invoice',
  RECEIPT = 'receipt',
  CONTRACT = 'contract',
  DELIVERY_NOTE = 'delivery-note',
  PAYMENT_CONFIRMATION = 'payment-confirmation',
  UTILITY_BILL = 'utility-bill',
  OTHER = 'other',
}

// Account Type
enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}
```

---

## Union Types & Complex Types

```typescript
// Financial entities that can have documents
type DocumentReferenceable =
  | 'Expense'
  | 'UtilityBill'
  | 'PurchaseOrder'
  | 'Payment'
  | 'MaintenanceOrder'
  | 'PayrollRun'
  | 'Payslip'
  | 'PayrollExport';

// Journal entry reference types
type JournalEntryReference =
  | 'Reservation'
  | 'Order'
  | 'PayrollRun'
  | 'Expense'
  | 'UtilityBill'
  | 'Manual';

// Inventory transaction reference types
type InventoryTransactionReference =
  | 'PurchaseOrder'
  | 'OrderLine'
  | 'HousekeepingTask'
  | 'Adjustment'
  | 'Other';

// Payment reference types
type PaymentReference =
  | 'Reservation'
  | 'Order'
  | 'Expense'
  | 'PayrollRun'
  | 'Other';

// Report metric categories
type ReportMetricCategory =
  | 'operational_performance'
  | 'profitability'
  | 'cost_efficiency'
  | 'liquidity_solvency';

// User persona types
type UserPersona =
  | 'hotel_owner'
  | 'general_manager'
  | 'finance_team'
  | 'front_office'
  | 'housekeeping'
  | 'maintenance'
  | 'f_and_b_manager'
  | 'storekeeper'
  | 'external_vendor'
  | 'external_auditor';
```

---

## API Request/Response Types

```typescript
// Pagination
interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// API Response Wrapper
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: Date;
}

// Filter Object
interface FilterOptions {
  propertyId: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  status?: string;
  [key: string]: any;
}

// Search Query
interface SearchQuery {
  query: string;
  filters?: FilterOptions;
  pagination?: PaginationParams;
}
```

---

## Notes

1. All timestamps (createdAt, updatedAt) should be stored as UTC and converted to property timezone for display.
2. Sensitive fields (bankAccount, configuration in Integration, password) should be encrypted at rest.
3. Foreign key fields use string IDs and should reference the actual entity by its primary key.
4. Optional fields are marked with `?` in the interface definitions.
5. Complex objects (permissions, configuration, ocrData, payslip snapshot) use `Record<string, any>` for flexibility. Payroll deductions are Pay item rows, not a JSON blob.
6. Enums provide type safety for status and category fields.
7. Union types enable polymorphic relationships for flexible referencing.
8. Document linking supports multiple entity types through referenceType/referenceId pattern.
9. All metrics in ReportMetricsData are optional as different reports include different metrics.
10. Persona-based access can be controlled via the Role.permissions object in the User/UserRole relationship.