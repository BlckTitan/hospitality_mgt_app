import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================
  // Core Platform
  // ============================================
  
  properties: defineTable({
    name: v.string(),
    address: v.optional(v.string()),
    contactNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    timezone: v.optional(v.string()),
    country: v.string(), // ISO 3166-1 alpha-2; required at property setup
    currency: v.optional(v.string()),
    taxId: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_isActive", ["isActive"])
    .index("by_country", ["country"]),

  users: defineTable({
    externalId: v.string(),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    isActive: v.boolean(),
    lastLoginAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byExternalId", ["externalId"])
    .index("by_email", ["email"])
    .index("by_isActive", ["isActive"]),

  roles: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    permissions: v.any(), // JSON object
    isSystemRole: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_isSystemRole", ["isSystemRole"]),

  userRoles: defineTable({
    userId: v.id("users"),
    roleId: v.id("roles"),
    propertyId: v.id("properties"),
    assignedAt: v.number(),
    assignedBy: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_roleId", ["roleId"])
    .index("by_userId_propertyId", ["userId", "propertyId"]),

  // ============================================
  // Room Management
  // ============================================

  roomTypes: defineTable({
    propertyId: v.id("properties"),
    name: v.string(),
    description: v.optional(v.string()),
    maxOccupancy: v.number(),
    baseRate: v.number(),
    amenities: v.optional(v.any()), // JSON object
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_isActive", ["propertyId", "isActive"]),

  rooms: defineTable({
    propertyId: v.id("properties"),
    roomTypeId: v.id("roomTypes"),
    roomNumber: v.string(),
    floor: v.optional(v.number()),
    status: v.string(), // available, occupied, maintenance, cleaning
    lastCleanedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_roomTypeId", ["roomTypeId"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_propertyId_roomNumber", ["propertyId", "roomNumber"]),

  guests: defineTable({
    propertyId: v.id("properties"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    loyaltyNumber: v.optional(v.string()),
    preferences: v.optional(v.any()), // JSON object
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_email", ["email"])
    .index("by_loyaltyNumber", ["loyaltyNumber"])
    .searchIndex("search_guests", {
      searchField: "firstName",
      filterFields: ["propertyId"],
    }),

  reservations: defineTable({
    propertyId: v.id("properties"),
    roomId: v.id("rooms"),
    guestId: v.id("guests"),
    confirmationNumber: v.string(),
    checkInDate: v.number(),
    checkOutDate: v.number(),
    numberOfGuests: v.number(),
    rate: v.number(),
    totalAmount: v.number(),
    depositAmount: v.optional(v.number()),
    status: v.string(), // pending, confirmed, checked-in, checked-out, cancelled
    source: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
    checkedInAt: v.optional(v.number()),
    checkedOutAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_roomId", ["roomId"])
    .index("by_guestId", ["guestId"])
    .index("by_confirmationNumber", ["confirmationNumber"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_propertyId_checkInDate", ["propertyId", "checkInDate"])
    .index("by_propertyId_checkOutDate", ["propertyId", "checkOutDate"]),

  ratePlans: defineTable({
    propertyId: v.id("properties"),
    roomTypeId: v.id("roomTypes"),
    name: v.string(),
    description: v.optional(v.string()),
    baseRate: v.number(),
    discountPercent: v.optional(v.number()),
    validFrom: v.number(),
    validTo: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_roomTypeId", ["roomTypeId"])
    .index("by_propertyId_isActive", ["propertyId", "isActive"]),

  housekeepingTasks: defineTable({
    propertyId: v.id("properties"),
    roomId: v.id("rooms"),
    assignedTo: v.optional(v.id("staffs")),
    taskType: v.string(), // cleaning, inspection, maintenance
    status: v.string(), // pending, in-progress, completed
    priority: v.string(), // low, medium, high, urgent
    scheduledAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    estimatedDuration: v.optional(v.number()),
    actualDuration: v.optional(v.number()),
    notes: v.optional(v.string()),
    checklist: v.optional(v.any()), // JSON array
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_roomId", ["roomId"])
    .index("by_assignedTo", ["assignedTo"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_propertyId_priority", ["propertyId", "priority"]),

  // ============================================
  // Food & Beverage
  // ============================================

  fnbMenuItems: defineTable({
    propertyId: v.id("properties"),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    subcategory: v.optional(v.string()),
    price: v.number(),
    cost: v.optional(v.number()),
    isAvailable: v.boolean(),
    imageUrl: v.optional(v.string()),
    preparationTime: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_category", ["propertyId", "category"])
    .index("by_propertyId_isAvailable", ["propertyId", "isAvailable"]),

  recipes: defineTable({
    menuItemId: v.id("fnbMenuItems"),
    name: v.string(),
    servings: v.number(),
    instructions: v.optional(v.string()),
    totalCost: v.optional(v.number()),
    lastCalculatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_menuItemId", ["menuItemId"]),

  recipeLines: defineTable({
    recipeId: v.id("recipes"),
    inventoryItemId: v.id("inventoryItems"),
    quantity: v.number(),
    unit: v.string(),
    wastePercent: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_recipeId", ["recipeId"])
    .index("by_inventoryItemId", ["inventoryItemId"]),

  tables: defineTable({
    propertyId: v.id("properties"),
    tableNumber: v.string(),
    capacity: v.number(),
    section: v.optional(v.string()),
    status: v.string(), // available, occupied, reserved, cleaning
    currentOrderId: v.optional(v.id("orders")),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_propertyId_tableNumber", ["propertyId", "tableNumber"]),

  orders: defineTable({
    propertyId: v.id("properties"),
    tableId: v.optional(v.id("tables")),
    reservationId: v.optional(v.id("reservations")),
    orderType: v.string(), // dine-in, takeout, room-service, delivery
    status: v.string(), // pending, preparing, ready, completed, cancelled
    subtotal: v.number(),
    taxAmount: v.number(),
    discountAmount: v.optional(v.number()),
    totalAmount: v.number(),
    serverId: v.optional(v.id("staffs")),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_tableId", ["tableId"])
    .index("by_reservationId", ["reservationId"])
    .index("by_serverId", ["serverId"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_propertyId_createdAt", ["propertyId", "createdAt"]),

  orderLines: defineTable({
    orderId: v.id("orders"),
    menuItemId: v.id("fnbMenuItems"),
    quantity: v.number(),
    unitPrice: v.number(),
    totalPrice: v.number(),
    specialInstructions: v.optional(v.string()),
    status: v.string(), // pending, preparing, ready, served, cancelled
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orderId", ["orderId"])
    .index("by_menuItemId", ["menuItemId"]),

  // ============================================
  // Inventory Management
  // ============================================

  inventoryItems: defineTable({
    propertyId: v.id("properties"),
    supplierId: v.optional(v.id("suppliers")),
    sku: v.string(),
    name: v.string(),
    category: v.string(),
    unit: v.string(),
    currentQuantity: v.number(),
    reorderPoint: v.optional(v.number()),
    reorderQuantity: v.optional(v.number()),
    unitCost: v.optional(v.number()),
    lastCostUpdate: v.optional(v.number()),
    location: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_supplierId", ["supplierId"])
    .index("by_sku", ["sku"])
    .index("by_propertyId_category", ["propertyId", "category"])
    .searchIndex("search_inventoryItems", {
      searchField: "name",
      filterFields: ["propertyId", "category"],
    }),

  inventoryTransactions: defineTable({
    inventoryItemId: v.id("inventoryItems"),
    transactionType: v.string(), // add, remove, adjust, transfer
    quantity: v.number(),
    unitCost: v.optional(v.number()),
    totalCost: v.optional(v.number()),
    referenceType: v.optional(v.string()),
    referenceId: v.optional(v.string()),
    reason: v.optional(v.string()),
    performedBy: v.optional(v.id("staffs")),
    transactionDate: v.number(),
    createdAt: v.number(),
  })
    .index("by_inventoryItemId", ["inventoryItemId"])
    .index("by_transactionDate", ["transactionDate"])
    .index("by_referenceType_referenceId", ["referenceType", "referenceId"]),

  suppliers: defineTable({
    propertyId: v.id("properties"),
    name: v.string(),
    contactPerson: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    paymentTerms: v.optional(v.string()),
    taxId: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_isActive", ["propertyId", "isActive"])
    .searchIndex("search_suppliers", {
      searchField: "name",
      filterFields: ["propertyId"],
    }),

  purchaseOrders: defineTable({
    propertyId: v.id("properties"),
    supplierId: v.id("suppliers"),
    orderNumber: v.string(),
    orderDate: v.number(),
    expectedDeliveryDate: v.optional(v.number()),
    status: v.string(), // draft, pending, approved, received, cancelled
    subtotal: v.number(),
    taxAmount: v.number(),
    shippingAmount: v.optional(v.number()),
    totalAmount: v.number(),
    createdBy: v.id("staffs"),
    approvedBy: v.optional(v.id("staffs")),
    approvedAt: v.optional(v.number()),
    receivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_supplierId", ["supplierId"])
    .index("by_orderNumber", ["orderNumber"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_propertyId_orderDate", ["propertyId", "orderDate"]),

  purchaseOrderLines: defineTable({
    purchaseOrderId: v.id("purchaseOrders"),
    inventoryItemId: v.id("inventoryItems"),
    quantity: v.number(),
    unitPrice: v.number(),
    totalPrice: v.number(),
    receivedQuantity: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_purchaseOrderId", ["purchaseOrderId"])
    .index("by_inventoryItemId", ["inventoryItemId"]),

  // ============================================
  // Payroll Management
  // See ai/payroll-implementation.md. People table is `staffs` only (no `employees` table).
  // Convex indexes are not unique — enforce uniqueness in mutations.
  // Payroll FKs named employeeId are Id<"staffs">.
  // ============================================

  propertyPayrollSettings: defineTable({
    propertyId: v.id("properties"),
    country: v.string(),
    jurisdictionPack: v.string(),
    regularHoursLimitDaily: v.optional(v.number()),
    regularHoursLimitWeekly: v.optional(v.number()),
    overtimeMultiplier: v.number(),
    defaultPayScheduleId: v.optional(v.string()),
    bankExportFormat: v.literal("generic_csv"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_jurisdictionPack", ["jurisdictionPack"]),

  staffs: defineTable({
    propertyId: v.optional(v.id("properties")),
    userId: v.optional(v.id("users")),
    employeeNumber: v.optional(v.string()),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    dateOfBirth: v.optional(v.number()),
    DoB: v.optional(v.string()), // legacy; prefer dateOfBirth
    address: v.string(),
    stateOfOrigin: v.optional(v.string()),
    LGA: v.optional(v.string()),
    hireDate: v.optional(v.number()),
    dateRecruited: v.optional(v.string()), // legacy; prefer hireDate
    terminationDate: v.optional(v.number()),
    dateTerminated: v.optional(v.string()),
    // Keep `employed` until rows are backfilled to `active`
    employmentStatus: v.union(
      v.literal("employed"),
      v.literal("active"),
      v.literal("terminated"),
      v.literal("on-leave")
    ),
    role: v.optional(v.string()), // legacy free-text; prefer department + position
    department: v.optional(
      v.union(
        v.literal("front-office"),
        v.literal("housekeeping"),
        v.literal("fnb"),
        v.literal("maintenance"),
        v.literal("finance"),
        v.literal("admin"),
        v.literal("other")
      )
    ),
    position: v.optional(v.string()),
    salary: v.optional(v.number()), // legacy; prefer baseSalary + staff compensation
    payType: v.optional(v.union(v.literal("hourly"), v.literal("salary"), v.literal("mixed"))),
    baseSalary: v.optional(v.number()),
    hourlyRate: v.optional(v.number()),
    payScheduleId: v.optional(v.string()),
    paymentMethod: v.optional(
      v.union(
        v.literal("bank"),
        v.literal("cash"),
        v.literal("mobile_money"),
        v.literal("check")
      )
    ),
    taxId: v.optional(v.string()),
    bankName: v.optional(v.string()),
    accountName: v.optional(v.string()),
    accountNumber: v.optional(v.string()), // encrypted
    routingCode: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("by_propertyId", ["propertyId"])
    .index("by_userId", ["userId"])
    .index("by_propertyId_employeeNumber", ["propertyId", "employeeNumber"])
    .index("by_propertyId_employmentStatus", ["propertyId", "employmentStatus"])
    .searchIndex("search_staff", {
      searchField: "firstName",
      filterFields: ["employmentStatus", "role", "department"],
    }),

  payComponents: defineTable({
    propertyId: v.id("properties"),
    code: v.string(),
    name: v.string(),
    kind: v.union(v.literal("earning"), v.literal("allowance"), v.literal("deduction")),
    source: v.union(v.literal("statutory"), v.literal("custom")),
    calculation: v.union(v.literal("flat"), v.literal("percent_of_gross"), v.literal("pack_formula")),
    formulaKey: v.optional(v.string()),
    params: v.optional(v.any()),
    defaultAmount: v.optional(v.number()),
    defaultRate: v.optional(v.number()),
    glAccountId: v.optional(v.id("chartOfAccounts")),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_code", ["propertyId", "code"])
    .index("by_propertyId_isActive", ["propertyId", "isActive"]),

  employeePayComponents: defineTable({
    employeeId: v.id("staffs"),
    payComponentId: v.id("payComponents"),
    amount: v.optional(v.number()),
    rate: v.optional(v.number()),
    isEnabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_employeeId", ["employeeId"])
    .index("by_payComponentId", ["payComponentId"])
    .index("by_employeeId_payComponentId", ["employeeId", "payComponentId"]),

  paySchedules: defineTable({
    propertyId: v.id("properties"),
    name: v.string(),
    frequency: v.union(v.literal("weekly"), v.literal("bi-weekly"), v.literal("monthly")),
    anchorDate: v.number(),
    cutoffDaysBeforePayDate: v.number(),
    isDefault: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_isDefault", ["propertyId", "isDefault"]),

  employeeCompensations: defineTable({
    employeeId: v.id("staffs"),
    payType: v.union(v.literal("hourly"), v.literal("salary"), v.literal("mixed")),
    baseSalary: v.optional(v.number()),
    hourlyRate: v.optional(v.number()),
    payScheduleId: v.optional(v.id("paySchedules")),
    effectiveFrom: v.number(),
    effectiveTo: v.optional(v.number()),
    changedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_employeeId", ["employeeId"])
    .index("by_employeeId_effectiveFrom", ["employeeId", "effectiveFrom"]),

  leaveTypes: defineTable({
    propertyId: v.id("properties"),
    code: v.string(),
    name: v.string(),
    paid: v.boolean(),
    countsTowardOvertime: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_code", ["propertyId", "code"]),

  leaveEntries: defineTable({
    propertyId: v.id("properties"),
    employeeId: v.id("staffs"),
    leaveTypeId: v.id("leaveTypes"),
    startDate: v.number(),
    endDate: v.number(),
    days: v.number(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_employeeId", ["employeeId"])
    .index("by_employeeId_startDate", ["employeeId", "startDate"])
    .index("by_propertyId_status", ["propertyId", "status"]),

  holidayCalendars: defineTable({
    propertyId: v.id("properties"),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"]),

  holidays: defineTable({
    holidayCalendarId: v.id("holidayCalendars"),
    date: v.number(),
    name: v.string(),
    isPaid: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_holidayCalendarId", ["holidayCalendarId"])
    .index("by_holidayCalendarId_date", ["holidayCalendarId", "date"]),

  premiumRules: defineTable({
    propertyId: v.id("properties"),
    kind: v.union(
      v.literal("daily_overtime"),
      v.literal("weekly_overtime"),
      v.literal("night"),
      v.literal("weekend"),
      v.literal("public_holiday")
    ),
    multiplier: v.number(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_kind", ["propertyId", "kind"]),

  timesheets: defineTable({
    employeeId: v.id("staffs"),
    propertyId: v.id("properties"),
    workDate: v.number(),
    clockInTime: v.optional(v.number()),
    clockOutTime: v.optional(v.number()),
    regularHours: v.optional(v.number()),
    overtimeHours: v.optional(v.number()),
    breakDuration: v.optional(v.number()),
    source: v.union(v.literal("manual"), v.literal("csv"), v.literal("shift")),
    shiftId: v.optional(v.string()), // bar shifts table id when source = shift
    payrollRunLineId: v.optional(v.id("payrollRunLines")),
    lockedAt: v.optional(v.number()),
    lockedByRunId: v.optional(v.id("payrollRuns")),
    status: v.union(v.literal("draft"), v.literal("submitted"), v.literal("approved"), v.literal("rejected")),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_employeeId", ["employeeId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_employeeId_workDate", ["employeeId", "workDate"])
    .index("by_propertyId_workDate", ["propertyId", "workDate"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_shiftId", ["shiftId"])
    .index("by_payrollRunLineId", ["payrollRunLineId"])
    .index("by_lockedByRunId", ["lockedByRunId"]),

  payrollRuns: defineTable({
    propertyId: v.id("properties"),
    payScheduleId: v.id("paySchedules"),
    runType: v.literal("regular"),
    payPeriodStart: v.number(),
    payPeriodEnd: v.number(),
    payDate: v.number(),
    payFrequency: v.union(v.literal("weekly"), v.literal("bi-weekly"), v.literal("monthly")),
    status: v.union(
      v.literal("draft"),
      v.literal("calculated"),
      v.literal("approved"),
      v.literal("processed"),
      v.literal("paid")
    ),
    totalGrossPay: v.number(),
    totalDeductions: v.number(),
    totalNetPay: v.number(),
    createdBy: v.id("users"),
    calculatedBy: v.optional(v.id("users")),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    processedAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_propertyId_payPeriodStart", ["propertyId", "payPeriodStart"])
    .index("by_payScheduleId", ["payScheduleId"]),

  payrollRunLines: defineTable({
    payrollRunId: v.id("payrollRuns"),
    employeeId: v.id("staffs"),
    compensationIdUsed: v.optional(v.id("employeeCompensations")),
    payTypeUsed: v.union(v.literal("hourly"), v.literal("salary"), v.literal("mixed")),
    hourlyRateUsed: v.optional(v.number()),
    baseSalaryUsed: v.optional(v.number()),
    overtimeMultiplierUsed: v.optional(v.number()),
    regularHours: v.number(),
    overtimeHours: v.optional(v.number()),
    regularPay: v.number(),
    overtimePay: v.optional(v.number()),
    gratuityAmount: v.optional(v.number()),
    grossPay: v.number(),
    totalDeductions: v.number(),
    netPay: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_payrollRunId", ["payrollRunId"])
    .index("by_employeeId", ["employeeId"])
    .index("by_payrollRunId_employeeId", ["payrollRunId", "employeeId"]),

  payrollLineItems: defineTable({
    payrollRunLineId: v.id("payrollRunLines"),
    payComponentId: v.optional(v.id("payComponents")),
    kind: v.union(
      v.literal("earning"),
      v.literal("allowance"),
      v.literal("overtime"),
      v.literal("gratuity"),
      v.literal("deduction")
    ),
    code: v.string(),
    label: v.string(),
    amount: v.number(),
    glAccountId: v.optional(v.id("chartOfAccounts")),
    createdAt: v.number(),
  })
    .index("by_payrollRunLineId", ["payrollRunLineId"])
    .index("by_payComponentId", ["payComponentId"]),

  payslips: defineTable({
    payrollRunLineId: v.id("payrollRunLines"),
    propertyId: v.id("properties"),
    employeeId: v.id("staffs"),
    snapshot: v.any(),
    documentId: v.optional(v.string()),
    generatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_payrollRunLineId", ["payrollRunLineId"])
    .index("by_employeeId", ["employeeId"])
    .index("by_propertyId", ["propertyId"]),

  payrollExports: defineTable({
    payrollRunId: v.id("payrollRuns"),
    format: v.union(v.literal("generic_csv"), v.literal("bank_file"), v.literal("cash_sheet")),
    status: v.union(
      v.literal("pending"),
      v.literal("generated"),
      v.literal("downloaded"),
      v.literal("failed")
    ),
    documentId: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    generatedBy: v.id("users"),
    generatedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_payrollRunId", ["payrollRunId"]),

  // ============================================
  // Maintenance Management
  // ============================================

  assets: defineTable({
    propertyId: v.id("properties"),
    roomId: v.optional(v.id("rooms")),
    assetTag: v.string(),
    name: v.string(),
    category: v.string(),
    manufacturer: v.optional(v.string()),
    model: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    purchaseDate: v.optional(v.number()),
    purchaseCost: v.optional(v.number()),
    depreciationMethod: v.optional(v.string()),
    usefulLife: v.optional(v.number()),
    currentValue: v.optional(v.number()),
    location: v.optional(v.string()),
    status: v.string(), // active, maintenance, retired, disposed
    lastMaintenanceDate: v.optional(v.number()),
    nextMaintenanceDate: v.optional(v.number()),
    warrantyExpiry: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_roomId", ["roomId"])
    .index("by_assetTag", ["assetTag"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .searchIndex("search_assets", {
      searchField: "name",
      filterFields: ["propertyId", "category", "status"],
    }),

  maintenanceOrders: defineTable({
    propertyId: v.id("properties"),
    assetId: v.optional(v.id("assets")),
    roomId: v.optional(v.id("rooms")),
    requestedBy: v.id("staffs"),
    assignedTo: v.optional(v.id("staffs")),
    orderType: v.string(), // preventive, corrective, emergency
    priority: v.string(), // low, medium, high, urgent
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(), // pending, assigned, in-progress, completed, cancelled
    scheduledDate: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    estimatedCost: v.optional(v.number()),
    actualCost: v.optional(v.number()),
    slaDeadline: v.optional(v.number()),
    resolutionNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_assetId", ["assetId"])
    .index("by_roomId", ["roomId"])
    .index("by_requestedBy", ["requestedBy"])
    .index("by_assignedTo", ["assignedTo"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_propertyId_priority", ["propertyId", "priority"]),

  // ============================================
  // Financial Management
  // ============================================

  chartOfAccounts: defineTable({
    propertyId: v.id("properties"),
    accountCode: v.string(),
    accountName: v.string(),
    accountType: v.string(), // asset, liability, equity, revenue, expense
    parentAccountId: v.optional(v.id("chartOfAccounts")),
    isActive: v.boolean(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_accountCode", ["accountCode"])
    .index("by_propertyId_accountType", ["propertyId", "accountType"])
    .index("by_parentAccountId", ["parentAccountId"]),

  journalEntries: defineTable({
    propertyId: v.id("properties"),
    entryNumber: v.string(),
    entryDate: v.number(),
    entryType: v.string(), // manual, automatic, adjustment
    referenceType: v.optional(v.string()),
    referenceId: v.optional(v.string()),
    description: v.optional(v.string()),
    totalDebit: v.number(),
    totalCredit: v.number(),
    status: v.string(), // draft, posted, reversed
    postedAt: v.optional(v.number()),
    postedBy: v.optional(v.id("staffs")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_entryNumber", ["entryNumber"])
    .index("by_propertyId_entryDate", ["propertyId", "entryDate"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_referenceType_referenceId", ["referenceType", "referenceId"]),

  journalEntryLines: defineTable({
    journalEntryId: v.id("journalEntries"),
    accountId: v.id("chartOfAccounts"),
    debitAmount: v.number(),
    creditAmount: v.number(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_journalEntryId", ["journalEntryId"])
    .index("by_accountId", ["accountId"]),

  expenses: defineTable({
    propertyId: v.id("properties"),
    category: v.string(),
    subcategory: v.optional(v.string()),
    amount: v.number(),
    expenseDate: v.number(),
    description: v.optional(v.string()),
    vendor: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
    status: v.string(), // draft, submitted, approved, rejected, paid
    submittedBy: v.id("staffs"),
    approvedBy: v.optional(v.id("staffs")),
    approvedAt: v.optional(v.number()),
    glAccountId: v.optional(v.id("chartOfAccounts")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_submittedBy", ["submittedBy"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_propertyId_expenseDate", ["propertyId", "expenseDate"])
    .index("by_propertyId_category", ["propertyId", "category"]),

  utilityBills: defineTable({
    propertyId: v.id("properties"),
    utilityType: v.string(), // electricity, water, gas, internet, phone
    provider: v.string(),
    accountNumber: v.optional(v.string()),
    billingPeriodStart: v.number(),
    billingPeriodEnd: v.number(),
    dueDate: v.number(),
    amount: v.number(),
    usageAmount: v.optional(v.number()),
    unitRate: v.optional(v.number()),
    meterReading: v.optional(v.number()),
    previousMeterReading: v.optional(v.number()),
    status: v.string(), // pending, paid, overdue
    paidAt: v.optional(v.number()),
    glAccountId: v.optional(v.id("chartOfAccounts")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_propertyId_dueDate", ["propertyId", "dueDate"])
    .index("by_propertyId_utilityType", ["propertyId", "utilityType"]),

  payments: defineTable({
    propertyId: v.id("properties"),
    paymentType: v.string(), // reservation, order, expense, payroll, other
    referenceType: v.string(), // reservation, order, expense, payrollRun
    referenceId: v.string(),
    amount: v.number(),
    paymentMethod: v.string(), // cash, card, bank_transfer, check, other
    paymentDate: v.number(),
    transactionId: v.optional(v.string()),
    status: v.string(), // pending, completed, failed, refunded
    processedBy: v.optional(v.id("staffs")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_referenceType_referenceId", ["referenceType", "referenceId"])
    .index("by_propertyId_paymentDate", ["propertyId", "paymentDate"])
    .index("by_propertyId_status", ["propertyId", "status"]),

  // ============================================
  // Document Management
  // ============================================

  documents: defineTable({
    propertyId: v.id("properties"),
    documentType: v.string(),
    fileName: v.string(),
    fileUrl: v.string(),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    uploadedBy: v.id("staffs"),
    uploadedAt: v.number(),
    description: v.optional(v.string()),
    referenceType: v.optional(v.string()), // Expense, UtilityBill, PurchaseOrder, Payment, MaintenanceOrder, PayrollRun, Payslip, PayrollExport
    referenceId: v.optional(v.string()),
    documentDate: v.optional(v.number()),
    amount: v.optional(v.number()),
    isVerified: v.boolean(),
    verifiedBy: v.optional(v.id("staffs")),
    verifiedAt: v.optional(v.number()),
    ocrData: v.optional(v.any()), // JSON object
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_uploadedBy", ["uploadedBy"])
    .index("by_referenceType_referenceId", ["referenceType", "referenceId"])
    .index("by_propertyId_documentType", ["propertyId", "documentType"]),

  // ============================================
  // Reporting & Analytics
  // ============================================

  reports: defineTable({
    propertyId: v.id("properties"),
    name: v.string(),
    reportType: v.string(),
    configuration: v.any(), // JSON object
    createdBy: v.id("staffs"),
    isScheduled: v.boolean(),
    scheduleFrequency: v.optional(v.string()),
    lastRunAt: v.optional(v.number()),
    nextRunAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_createdBy", ["createdBy"])
    .index("by_propertyId_reportType", ["propertyId", "reportType"]),

  reportSnapshots: defineTable({
    reportId: v.id("reports"),
    snapshotDate: v.number(),
    data: v.any(), // JSON object
    generatedAt: v.number(),
    generatedBy: v.id("staffs"),
  })
    .index("by_reportId", ["reportId"])
    .index("by_reportId_snapshotDate", ["reportId", "snapshotDate"]),

  // ============================================
  // System
  // ============================================

  integrations: defineTable({
    propertyId: v.id("properties"),
    integrationType: v.string(),
    provider: v.string(),
    status: v.string(), // active, inactive, error
    configuration: v.any(), // JSON object
    lastSyncAt: v.optional(v.number()),
    syncFrequency: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_propertyId_integrationType", ["propertyId", "integrationType"]),

  auditLogs: defineTable({
    propertyId: v.id("properties"),
    userId: v.optional(v.id("users")),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    changes: v.optional(v.any()), // JSON object
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_userId", ["userId"])
    .index("by_propertyId_timestamp", ["propertyId", "timestamp"])
    .index("by_entityType_entityId", ["entityType", "entityId"]),
});

