import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table for authentication and roles
  users: defineTable({
    externalId: v.string(),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    isActive: v.boolean(),
    lastLoginAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // name + email for login search. Optional until existing users are backfilled.
    searchName: v.optional(v.string()),
  })
    .index("byExternalId", ["externalId"])
    .index("by_email", ["email"])
    .index("by_isActive", ["isActive"])
    .searchIndex("search_users", {
      searchField: "searchName",
      filterFields: ["isActive"],
    }),

  // Roles table for RBAC (Role-Based Access Control)
  roles: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    permissions: v.any(), // JSON object defining permissions
    isSystemRole: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_isSystemRole", ["isSystemRole"]),

  // UserRoles junction table for many-to-many relationships (User-Role-Property)
  userRoles: defineTable({
    userId: v.id("users"),
    roleId: v.id("roles"),
    propertyId: v.id("properties"),
    assignedAt: v.number(),
    assignedBy: v.id("users"),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_roleId", ["roleId"])
    .index("by_userId_propertyId", ["userId", "propertyId"])
    .index("by_roleId_and_propertyId", ["roleId", "propertyId"]),

  // PendingInvites table for tracking Clerk invitations before user signup
  pendingInvites: defineTable({
    email: v.string(),
    roleId: v.id("roles"),
    propertyId: v.id("properties"),
    invitedBy: v.id("users"),
    clerkInvitationId: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("revoked"), v.literal("expired")),
    createdAt: v.number(),
    expiresAt: v.number(),
    lastReminderSentAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_expiresAt", ["expiresAt"])
    .index("by_propertyId", ["propertyId"]),

  // People / payroll master. Do not add an `employees` table — FKs stay Id<"staffs">.
  staffs: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    DoB: v.string(),
    stateOfOrigin: v.string(),
    LGA: v.string(),
    address: v.string(),
    salary: v.number(),
    employmentStatus: v.union(
      v.literal("employed"),
      v.literal("active"),
      v.literal("terminated"),
      v.literal("on-leave")
    ),
    dateRecruited: v.string(),
    dateTerminated: v.optional(v.string()),
    role: v.string(),
    email: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
    userId: v.optional(v.id("users")),
    employeeNumber: v.optional(v.string()),
    department: v.optional(v.string()),
    position: v.optional(v.string()),
    employmentType: v.optional(
      v.union(
        v.literal("full-time"),
        v.literal("part-time"),
        v.literal("casual"),
        v.literal("contractor")
      )
    ),
    managerId: v.optional(v.id("staffs")),
    nationalId: v.optional(v.string()),
    idType: v.optional(
      v.union(
        v.literal("nin"),
        v.literal("passport"),
        v.literal("drivers_license"),
        v.literal("other")
      )
    ),
    emergencyName: v.optional(v.string()),
    emergencyPhone: v.optional(v.string()),
    emergencyRelationship: v.optional(v.string()),
    contractStartDate: v.optional(v.string()),
    contractEndDate: v.optional(v.string()),
    probationEndDate: v.optional(v.string()),
    payType: v.optional(v.union(v.literal("hourly"), v.literal("salary"), v.literal("mixed"))),
    baseSalary: v.optional(v.number()),
    hourlyRate: v.optional(v.number()),
    payCycleId: v.optional(v.id("payCycles")),
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
    accountNumber: v.optional(v.string()),
    routingCode: v.optional(v.string()),
    shiftTemplateId: v.optional(v.id("shiftTemplates")),
    // firstName + lastName for people search. Optional until existing staff are backfilled.
    searchName: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_employeeNumber", ["propertyId", "employeeNumber"])
    .index("by_propertyId_employmentStatus", ["propertyId", "employmentStatus"])
    .index("by_userId", ["userId"])
    .index("by_managerId", ["managerId"])
    .index("by_shiftTemplateId", ["shiftTemplateId"])
    .searchIndex('search_staff', {
      searchField: 'searchName',
      filterFields: ['employmentStatus', 'role']
    }),

  staffDocuments: defineTable({
    propertyId: v.id("properties"),
    employeeId: v.id("staffs"),
    kind: v.union(
      v.literal("contract"),
      v.literal("id"),
      v.literal("tax_form"),
      v.literal("bank_letter"),
      v.literal("policy"),
      v.literal("other")
    ),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    uploadedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_employeeId", ["employeeId"])
    .index("by_propertyId", ["propertyId"]),

  staffOnboardingItems: defineTable({
    propertyId: v.id("properties"),
    employeeId: v.id("staffs"),
    code: v.string(),
    label: v.string(),
    required: v.boolean(),
    completedAt: v.optional(v.number()),
    completedBy: v.optional(v.id("users")),
    skipped: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_employeeId", ["employeeId"])
    .index("by_employeeId_code", ["employeeId", "code"]),

  staffChangeRequests: defineTable({
    propertyId: v.id("properties"),
    employeeId: v.id("staffs"),
    kind: v.union(v.literal("contact"), v.literal("bank"), v.literal("emergency")),
    payload: v.any(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    requestedBy: v.id("users"),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_employeeId", ["employeeId"])
    .index("by_propertyId_status", ["propertyId", "status"]),

  // Properties table for multiple hospitality locations
  properties: defineTable({
    name: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    timezone: v.optional(v.string()),
    currency: v.optional(v.string()),
    // ISO 3166-1 alpha-2. Optional until first payroll seed (widen-migrate-narrow).
    country: v.optional(v.string()),
    taxId: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_name", ["name"])
    .index("by_email", ["email"])
    .index("by_country", ["country"]),

  // Sale categories for bar, restaurant, and lodging
  saleCategories: defineTable({
    categoryName: v.union(v.literal("bar"), v.literal("restaurant"), v.literal("lodging")),
    propertyId: v.id("properties"),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_categoryName", ["categoryName"]),

  // Sales records for tracking bar, restaurant, and lodging sales
  sales: defineTable({
    categoryId: v.id("saleCategories"),
    propertyId: v.id("properties"),
    saleAmount: v.number(),
    saleDate: v.number(),
    description: v.optional(v.string()),
  })
    .index("by_propertyId_saleDate", ["propertyId", "saleDate"])
    .index("by_categoryId", ["categoryId"]),

  // Invoices table for billing clients
  invoices: defineTable({
    propertyId: v.id("properties"),
    clientName: v.string(),
    clientEmail: v.optional(v.string()),
    totalAmount: v.number(),
    issueDate: v.number(),
    dueDate: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("overdue")),
  })
    .index("by_propertyId_issueDate", ["propertyId", "issueDate"])
    .index("by_status", ["status"]),

  // Invoice items for detailed billing
  invoiceItems: defineTable({
    invoiceId: v.id("invoices"),
    description: v.optional(v.string()),
    quantity: v.number(),
    unitPrice: v.number(),
    totalPrice: v.number(), // Computed as quantity * unitPrice
  })
    .index("by_invoiceId", ["invoiceId"]),

  // Receipts table for generated receipts
  receipts: defineTable({
    invoiceId: v.optional(v.id("invoices")),
    saleId: v.optional(v.id("sales")),
    amountPaid: v.number(),
    paymentMethod: v.union(v.literal("cash"), v.literal("card"), v.literal("bank_transfer")),
    receiptDate: v.number(),
  })
    .index("by_invoiceId", ["invoiceId"])
    .index("by_saleId", ["saleId"]),

  // Expenses table for tracking expenses
  expenses: defineTable({
    propertyId: v.id("properties"),
    category: v.union(v.literal("utilities"), v.literal("supplies"), v.literal("staff"), v.literal("maintenance"), v.literal("other")),
    subcategory: v.optional(v.string()),
    amount: v.number(),
    expenseDate: v.number(),
    description: v.optional(v.string()),
    vendor: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
    status: v.optional(v.string()),
    sourceType: v.optional(
      v.union(
        v.literal("PropertyBill"),
        v.literal("Payroll"),
        v.literal("MaintenanceOrder"),
        v.literal("PurchaseOrder"),
        v.literal("Manual"),
      ),
    ),
    sourceId: v.optional(v.string()),
    submittedBy: v.optional(v.id("users")),
    paidBy: v.optional(v.id("users")),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_propertyId_expenseDate", ["propertyId", "expenseDate"])
    .index("by_category", ["category"])
    .index("by_sourceType_sourceId", ["sourceType", "sourceId"]),

  billAccounts: defineTable({
    propertyId: v.id("properties"),
    name: v.string(),
    billType: v.union(
      v.literal("electricity"),
      v.literal("water"),
      v.literal("gas"),
      v.literal("internet"),
      v.literal("cable"),
      v.literal("waste"),
      v.literal("local_government"),
      v.literal("other"),
    ),
    frequency: v.union(
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("annually"),
    ),
    isMetered: v.boolean(),
    provider: v.string(),
    accountNumber: v.optional(v.string()),
    supplierId: v.optional(v.id("suppliers")),
    expectedAmount: v.optional(v.number()),
    contractEndDate: v.optional(v.number()),
    glAccountCode: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_isActive", ["propertyId", "isActive"]),

  billPeriods: defineTable({
    accountId: v.id("billAccounts"),
    propertyId: v.id("properties"),
    periodStart: v.number(),
    periodEnd: v.number(),
    dueDate: v.number(),
    status: v.union(
      v.literal("expected"),
      v.literal("pending"),
      v.literal("paid"),
      v.literal("overdue"),
    ),
    amount: v.optional(v.number()),
    usageAmount: v.optional(v.number()),
    unitRate: v.optional(v.number()),
    meterReading: v.optional(v.number()),
    previousMeterReading: v.optional(v.number()),
    invoiceNumber: v.optional(v.string()),
    expenseId: v.optional(v.id("expenses")),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_accountId", ["accountId"])
    .index("by_accountId_periodStart", ["accountId", "periodStart"])
    .index("by_dueDate", ["dueDate"]),

  billDocuments: defineTable({
    periodId: v.id("billPeriods"),
    kind: v.union(v.literal("bill"), v.literal("receipt")),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    uploadedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_periodId", ["periodId"]),

  // Inventory items for stock management (legacy - keeping for backward compatibility)
  inventory: defineTable({
    propertyId: v.id("properties"),
    itemName: v.string(),
    category: v.union(v.literal("bar"), v.literal("restaurant"), v.literal("lodging"), v.literal("other")),
    quantity: v.number(),
    unitPrice: v.optional(v.number()),
    lastUpdated: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_category", ["category"]),

  // ============================================
  // Inventory Management (New Schema)
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
    transactionType: v.string(), // purchase, usage, adjustment, waste, transfer
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
    status: v.string(), // draft, sent, confirmed, received, cancelled
    subtotal: v.number(),
    taxAmount: v.number(),
    shippingAmount: v.optional(v.number()),
    totalAmount: v.number(),
    createdBy: v.id("staffs"),
    approvedBy: v.optional(v.id("staffs")),
    approvedAt: v.optional(v.number()),
    receivedAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    expenseId: v.optional(v.id("expenses")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_supplierId", ["supplierId"])
    .index("by_orderNumber", ["orderNumber"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_propertyId_orderDate", ["propertyId", "orderDate"]),

  purchaseOrderLines: defineTable({
    propertyId: v.id("properties"),
    purchaseOrderId: v.id("purchaseOrders"),
    inventoryItemId: v.id("inventoryItems"),
    quantity: v.number(),
    unitPrice: v.number(),
    totalPrice: v.number(),
    receivedQuantity: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_purchaseOrderId", ["purchaseOrderId"])
    .index("by_inventoryItemId", ["inventoryItemId"]),

  // Debit accounts for managing debts
  debits: defineTable({
    propertyId: v.id("properties"),
    clientName: v.string(),
    amount: v.number(),
    debitDate: v.number(),
    dueDate: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("overdue")),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_status", ["status"]),

  // Internal communications for staff messaging
  communications: defineTable({
    senderId: v.id("users"),
    recipientId: v.id("users"),
    propertyId: v.id("properties"),
    messageContent: v.string(),
    sentAt: v.number(),
    isRead: v.boolean(),
  })
    .index("by_propertyId_sentAt", ["propertyId", "sentAt"])
    .index("by_recipientId", ["recipientId"]),

  // Room types for categorizing rooms (Standard, Deluxe, Suite, etc.)
  roomTypes: defineTable({
    propertyId: v.id("properties"),
    name: v.string(),
    description: v.optional(v.string()),
    maxOccupancy: v.number(),
    baseRate: v.number(),
    amenities: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_name", ["name"])
    .index("by_isActive", ["isActive"]),

  // Rooms for individual room inventory management
  rooms: defineTable({
    propertyId: v.id("properties"),
    roomTypeId: v.id("roomTypes"),
    roomNumber: v.string(),
    floor: v.number(),
    status: v.union(v.literal("available"), v.literal("occupied"), v.literal("out-of-order"), v.literal("maintenance")),
    lastCleanedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_roomTypeId", ["roomTypeId"])
    .index("by_status", ["status"])
    .index("by_propertyId_roomNumber", ["propertyId", "roomNumber"]),

  // Guests table for customer profiles
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
    // firstName + lastName for people search. Optional until existing guests are backfilled.
    searchName: v.optional(v.string()),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_email", ["email"])
    .index("by_loyaltyNumber", ["loyaltyNumber"])
    .searchIndex("search_guests", {
      searchField: "searchName",
      filterFields: ["propertyId"],
    }),

  // Reservations table for room bookings
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
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("checked-in"), v.literal("checked-out"), v.literal("cancelled")),
    source: v.optional(v.union(v.literal("direct"), v.literal("ota"), v.literal("walk-in"), v.literal("phone"), v.literal("other"))),
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
    assignedTo: v.optional(v.id("staffs")), // legacy; lead lives on taskAssignments
    taskType: v.string(), // checkout, stayover, deep-clean, inspection
    status: v.string(), // pending, in-progress, completed, skipped
    priority: v.string(), // low, medium, high, urgent
    source: v.optional(
      v.union(
        v.literal("manual"),
        v.literal("reservation_checkout"),
        v.literal("reservation_stayover")
      )
    ),
    reservationId: v.optional(v.id("reservations")),
    templateId: v.optional(v.id("taskTemplates")),
    createdBy: v.optional(v.id("users")),
    dueAt: v.optional(v.number()),
    scheduledAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    estimatedDuration: v.optional(v.number()),
    actualDuration: v.optional(v.number()),
    notes: v.optional(v.string()),
    checklist: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_roomId", ["roomId"])
    .index("by_assignedTo", ["assignedTo"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_propertyId_priority", ["propertyId", "priority"])
    .index("by_roomId_taskType_status", ["roomId", "taskType", "status"])
    .index("by_reservationId", ["reservationId"]),

  taskTemplates: defineTable({
    propertyId: v.id("properties"),
    module: v.union(
      v.literal("housekeeping"),
      v.literal("maintenance"),
      v.literal("inventory")
    ),
    typeKey: v.string(),
    roomTypeId: v.optional(v.id("roomTypes")),
    steps: v.array(v.object({ id: v.string(), label: v.string() })),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_module_typeKey", ["propertyId", "module", "typeKey"]),

  taskSlaDefaults: defineTable({
    propertyId: v.id("properties"),
    module: v.union(
      v.literal("housekeeping"),
      v.literal("maintenance"),
      v.literal("inventory")
    ),
    typeKey: v.string(),
    dueMinutes: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_module_typeKey", ["propertyId", "module", "typeKey"]),

  taskAssignments: defineTable({
    propertyId: v.id("properties"),
    housekeepingTaskId: v.optional(v.id("housekeepingTasks")),
    maintenanceOrderId: v.optional(v.id("maintenanceOrders")),
    inventoryTaskId: v.optional(v.id("inventoryTasks")),
    staffId: v.id("staffs"),
    role: v.union(v.literal("lead"), v.literal("helper")),
    assignedAt: v.number(),
    assignedBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_staffId", ["staffId"])
    .index("by_housekeepingTaskId", ["housekeepingTaskId"])
    .index("by_maintenanceOrderId", ["maintenanceOrderId"])
    .index("by_inventoryTaskId", ["inventoryTaskId"]),

  maintenanceOrders: defineTable({
    propertyId: v.id("properties"),
    assetId: v.optional(v.id("assets")),
    roomId: v.optional(v.id("rooms")),
    supplierId: v.optional(v.id("suppliers")),
    requestedBy: v.optional(v.id("staffs")),
    createdBy: v.optional(v.id("users")),
    templateId: v.optional(v.id("taskTemplates")),
    orderType: v.union(
      v.literal("preventive"),
      v.literal("corrective"),
      v.literal("emergency"),
      v.literal("inspection")
    ),
    source: v.union(v.literal("manual"), v.literal("preventive_schedule")),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    scheduledDate: v.optional(v.number()),
    dueAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    estimatedCost: v.optional(v.number()),
    actualCost: v.optional(v.number()),
    expenseId: v.optional(v.id("expenses")),
    resolutionNotes: v.optional(v.string()),
    checklist: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          isComplete: v.boolean(),
        })
      )
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_assetId", ["assetId"])
    .index("by_roomId", ["roomId"])
    .index("by_supplierId", ["supplierId"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_assetId_orderType_status", ["assetId", "orderType", "status"]),

  maintenanceOrderParts: defineTable({
    propertyId: v.id("properties"),
    maintenanceOrderId: v.id("maintenanceOrders"),
    inventoryItemId: v.optional(v.id("inventoryItems")),
    name: v.string(),
    quantity: v.number(),
    unitCost: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_maintenanceOrderId", ["maintenanceOrderId"])
    .index("by_inventoryItemId", ["inventoryItemId"]),

  inventoryTasks: defineTable({
    propertyId: v.id("properties"),
    taskType: v.union(v.literal("restock"), v.literal("putaway")),
    inventoryItemId: v.id("inventoryItems"),
    suggestedQuantity: v.optional(v.number()),
    source: v.union(
      v.literal("reorder_point"),
      v.literal("purchase_order_received"),
      v.literal("manual")
    ),
    purchaseOrderId: v.optional(v.id("purchaseOrders")),
    templateId: v.optional(v.id("taskTemplates")),
    createdBy: v.optional(v.id("users")),
    status: v.union(
      v.literal("pending"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    dueAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    checklist: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          isComplete: v.boolean(),
        })
      )
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_inventoryItemId", ["inventoryItemId"])
    .index("by_purchaseOrderId", ["purchaseOrderId"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_inventoryItemId_taskType_status", [
      "inventoryItemId",
      "taskType",
      "status",
    ]),

  // Bars table for bar outlets
  bars: defineTable({
    propertyId: v.id("properties"),
    name: v.string(),
    location: v.string(),
    barType: v.string(),
    isActive: v.boolean(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_isActive", ["isActive"]),

  // Beverages table for drink products
  beverages: defineTable({
    propertyId: v.id("properties"),
    name: v.string(),
    category: v.union(v.literal("spirits"), v.literal("wine"), v.literal("Lager beer"), v.literal("cocktails"), v.literal("non-alcoholic"), v.literal("liqueurs"), v.literal("whiskey"), v.literal("vodka"), v.literal("rum"), v.literal("gin"), v.literal("tequila"), v.literal("brandy"), v.literal("cognac"), v.literal("champagne"), v.literal("other")),
    unitOfMeasure: v.string(),
    unitPrice: v.number(),
    reorderLevel: v.number(),
    isActive: v.boolean(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_category", ["category"])
    .index("by_isActive", ["isActive"]),

  // Shifts table: property-wide working sessions (any department).
  // barId is required only for F&B. userId is denormalized from staff when they have a login.
  shifts: defineTable({
    propertyId: v.id("properties"),
    employeeId: v.optional(v.id("staffs")),
    userId: v.optional(v.id("users")),
    barId: v.optional(v.id("bars")),
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
    shiftDate: v.string(),
    startTime: v.string(),
    endTime: v.optional(v.string()),
    isFinalized: v.boolean(),
    shiftTemplateId: v.optional(v.id("shiftTemplates")),
    rosterSlotId: v.optional(v.id("rosterSlots")),
    expectedStart: v.optional(v.string()),
    expectedEnd: v.optional(v.string()),
    clockStartLocal: v.optional(v.string()),
    minutesLate: v.optional(v.number()),
    punctualityStatus: v.optional(
      v.union(v.literal("on_time"), v.literal("late"), v.literal("unscheduled"))
    ),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_userId", ["userId"])
    .index("by_employeeId", ["employeeId"])
    .index("by_employeeId_date", ["employeeId", "shiftDate"])
    .index("by_barId", ["barId"])
    .index("by_barId_date", ["barId", "shiftDate"])
    .index("by_userId_date", ["userId", "shiftDate"])
    .index("by_propertyId_date", ["propertyId", "shiftDate"])
    .index("by_rosterSlotId", ["rosterSlotId"]),

  // Department shift definitions (default working hours). Admin/owner owned.
  shiftTemplates: defineTable({
    propertyId: v.id("properties"),
    department: v.union(
      v.literal("front-office"),
      v.literal("housekeeping"),
      v.literal("fnb"),
      v.literal("maintenance"),
      v.literal("finance"),
      v.literal("admin"),
      v.literal("other")
    ),
    name: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    barId: v.optional(v.id("bars")),
    isDefault: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_department", ["propertyId", "department"])
    .index("by_propertyId_department_default", ["propertyId", "department", "isDefault"]),

  // One scheduled day for a staff member. Cover changes workingEmployeeId only.
  rosterSlots: defineTable({
    propertyId: v.id("properties"),
    shiftDate: v.string(),
    shiftTemplateId: v.id("shiftTemplates"),
    scheduledEmployeeId: v.id("staffs"),
    workingEmployeeId: v.id("staffs"),
    coveredAt: v.optional(v.number()),
    coveredBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_date", ["propertyId", "shiftDate"])
    .index("by_scheduled_date", ["scheduledEmployeeId", "shiftDate"])
    .index("by_working_date", ["workingEmployeeId", "shiftDate"])
    .index("by_template_date", ["shiftTemplateId", "shiftDate"]),

  // User Stock Logs table for per-shift, per-beverage stock and sales reconciliation
  // v2.1: barId, userId, logDate, isFinalized added; recordedAt → lastUpdatedAt
  // Natural unique key: (userId, barId, beverageId, logDate)
  userStockLogs: defineTable({
    propertyId: v.id("properties"),
    shiftId: v.id("shifts"),     // back-reference to the shift that opened this day
    userId: v.id("users"),      // denormalized for direct day-scoped lookups
    barId: v.optional(v.id("bars")),       // denormalized for direct day-scoped lookups
    beverageId: v.id("beverages"),
    logDate: v.string(),         // ISO 8601 e.g. "2026-03-26"
    openingStock: v.number(),         // carried over from previous day's closingStock
    newStockReceived: v.number(),         // cumulative qty issued today via storeTransactions
    totalStock: v.number(),         // openingStock + newStockReceived (persisted)
    closingStock: v.number(),         // physical count at end of day
    salesQuantity: v.number(),         // totalStock − closingStock (persisted)
    salesValue: v.number(),         // salesQuantity × unitPrice (persisted)
    isFinalized: v.boolean(),        // true after end-of-day reconciliation
    lastUpdatedAt: v.number(),         // epoch ms of last mutation
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_logDate", ["propertyId", "logDate"])
    .index("by_shiftId", ["shiftId"])
    .index("by_userId_date", ["userId", "logDate"])
    .index("by_userId_barId_date", ["userId", "barId", "logDate"])
    .index("by_userId_barId_bev_date", ["userId", "barId", "beverageId", "logDate"])
    .index("by_userId_beverage_date", ["userId", "beverageId", "logDate"])
    .index("by_beverageId", ["beverageId"])
    .index("by_barId_date", ["barId", "logDate"])
    .index("by_barId_beverage_date", ["barId", "beverageId", "logDate"]),

  // Store Inventory table for live stock balance per beverage
  storeInventories: defineTable({
    propertyId: v.id("properties"),
    beverageId: v.id("beverages"),
    qtyInStore: v.number(),
    reorderThreshold: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_beverageId", ["beverageId"])
    .index("by_propertyId_beverageId", ["propertyId", "beverageId"]),

  // Store Transactions table for logging stock movements
  // v2.1: txnDateKey (ISO string) added for day-scoped userStockLogs lookups
  storeTransactions: defineTable({
    propertyId: v.id("properties"),
    beverageId: v.id("beverages"),
    barId: v.optional(v.id("bars")),
    userId: v.optional(v.id("users")),
    txnType: v.union(v.literal("receive"), v.literal("issue")),
    qty: v.number(),
    txnDate: v.number(),       // epoch ms — for ordering
    txnDateKey: v.string(),       // ISO 8601 e.g. "2026-03-26" — for day-scoped lookups
    notes: v.optional(v.string()),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_beverageId", ["beverageId"])
    .index("by_barId", ["barId"])
    .index("by_userId", ["userId"])
    .index("by_txnType", ["txnType"])
    .index("by_beverageId_date", ["beverageId", "txnDateKey"])
    .index("by_userId_beverage_date", ["userId", "beverageId", "txnDateKey"])
    .index("by_barId_beverage_date", ["barId", "beverageId", "txnDateKey"])
    .index("by_propertyId_txnDate", ["propertyId", "txnDate"]),

  // Reorder Alerts table for low stock notifications
  reorderAlerts: defineTable({
    propertyId: v.id("properties"),
    beverageId: v.id("beverages"),
    qtyAtAlert: v.number(),
    reorderLevel: v.number(),
    alertedAt: v.number(),
    status: v.union(
      v.literal("open"),
      v.literal("acknowledged"),
      v.literal("resolved")
    ),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_beverageId", ["beverageId"])
    .index("by_status", ["status"])
    .index("by_beverageId_status", ["beverageId", "status"])
    .index("by_propertyId_status", ["propertyId", "status"]),

  // Sales Summaries table for pre-aggregated sales data
  salesSummaries: defineTable({
    propertyId: v.id("properties"),
    barId: v.id("bars"),
    userId: v.optional(v.id("users")),
    beverageId: v.id("beverages"),
    periodType: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly")
    ),
    periodKey: v.string(),
    year: v.number(),
    month: v.optional(v.number()),
    weekNumber: v.optional(v.number()),
    totalQtySold: v.number(),
    totalRevenue: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_barId_period", ["barId", "periodType", "periodKey"])
    .index("by_userId_period", ["userId", "periodType", "periodKey"])
    .index("by_beverageId_period", ["beverageId", "periodType", "periodKey"])
    .index("by_barId_beverage_period", ["barId", "beverageId", "periodType", "periodKey"])
    .index("by_year_periodType", ["year", "periodType"])
    .index("by_propertyId_periodType", ["propertyId", "periodType"])
    .index("by_propertyId_barId_period", ["propertyId", "barId", "periodType", "periodKey"]),

  // ============================================
  // Payroll Management
  // People table is `staffs` only. FKs named employeeId are Id<"staffs">.
  // glAccountId is a string until chartOfAccounts is live.
  // ============================================

  payrollSettings: defineTable({
    propertyId: v.id("properties"),
    country: v.string(),
    jurisdictionPack: v.string(),
    regularHoursLimitDaily: v.optional(v.number()),
    regularHoursLimitWeekly: v.optional(v.number()),
    overtimeMultiplier: v.number(),
    punctualityGraceMinutes: v.optional(v.number()),
    defaultPayCycleId: v.optional(v.id("payCycles")),
    bankExportFormat: v.literal("generic_csv"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"]),

  payItemTypes: defineTable({
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
    glAccountId: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_code", ["propertyId", "code"])
    .index("by_propertyId_isActive", ["propertyId", "isActive"]),

  staffPayItems: defineTable({
    employeeId: v.id("staffs"),
    payItemTypeId: v.id("payItemTypes"),
    amount: v.optional(v.number()),
    rate: v.optional(v.number()),
    isEnabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_employeeId", ["employeeId"])
    .index("by_payItemTypeId", ["payItemTypeId"])
    .index("by_employeeId_payItemTypeId", ["employeeId", "payItemTypeId"]),

  payCycles: defineTable({
    propertyId: v.id("properties"),
    name: v.string(),
    frequency: v.union(v.literal("weekly"), v.literal("bi-weekly"), v.literal("monthly"), v.literal("annually")),
    anchorDate: v.number(),
    cutoffDaysBeforePayDate: v.number(),
    isDefault: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_isDefault", ["propertyId", "isDefault"]),

  payHistory: defineTable({
    employeeId: v.id("staffs"),
    payType: v.union(v.literal("hourly"), v.literal("salary"), v.literal("mixed")),
    baseSalary: v.optional(v.number()),
    hourlyRate: v.optional(v.number()),
    payCycleId: v.optional(v.id("payCycles")),
    effectiveFrom: v.number(),
    effectiveTo: v.optional(v.number()),
    changedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_employeeId", ["employeeId"])
    .index("by_employeeId_effectiveFrom", ["employeeId", "effectiveFrom"]),

  timeOffTypes: defineTable({
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

  timeOff: defineTable({
    propertyId: v.id("properties"),
    employeeId: v.id("staffs"),
    timeOffTypeId: v.id("timeOffTypes"),
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

  extraPayRules: defineTable({
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

  hours: defineTable({
    employeeId: v.id("staffs"),
    propertyId: v.id("properties"),
    workDate: v.number(),
    clockInTime: v.optional(v.number()),
    clockOutTime: v.optional(v.number()),
    regularHours: v.number(),
    overtimeHours: v.number(),
    breakDuration: v.optional(v.number()),
    source: v.union(v.literal("manual"), v.literal("csv"), v.literal("shift")),
    shiftId: v.optional(v.id("shifts")),
    staffPayId: v.optional(v.id("staffPay")),
    lockedAt: v.optional(v.number()),
    lockedByPayrollId: v.optional(v.id("payrolls")),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("approved"),
      v.literal("rejected")
    ),
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
    .index("by_lockedByPayrollId", ["lockedByPayrollId"])
    .index("by_shiftId", ["shiftId"]),

  payrolls: defineTable({
    propertyId: v.id("properties"),
    payCycleId: v.id("payCycles"),
    runType: v.literal("regular"),
    payPeriodStart: v.number(),
    payPeriodEnd: v.number(),
    payDate: v.number(),
    payFrequency: v.union(v.literal("weekly"), v.literal("bi-weekly"), v.literal("monthly"), v.literal("annually")),
    cutoffDaysBeforePayDate: v.number(),
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
    expenseId: v.optional(v.id("expenses")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_payCycleId", ["payCycleId"]),

  staffPay: defineTable({
    payrollId: v.id("payrolls"),
    employeeId: v.id("staffs"),
    payHistoryIdUsed: v.optional(v.id("payHistory")),
    payTypeUsed: v.union(v.literal("hourly"), v.literal("salary"), v.literal("mixed")),
    hourlyRateUsed: v.optional(v.number()),
    baseSalaryUsed: v.optional(v.number()),
    overtimeMultiplierUsed: v.optional(v.number()),
    regularHours: v.number(),
    overtimeHours: v.number(),
    regularPay: v.number(),
    overtimePay: v.number(),
    gratuityAmount: v.optional(v.number()),
    grossPay: v.number(),
    totalDeductions: v.number(),
    netPay: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_payrollId", ["payrollId"])
    .index("by_employeeId", ["employeeId"])
    .index("by_payrollId_employeeId", ["payrollId", "employeeId"]),

  payItems: defineTable({
    staffPayId: v.id("staffPay"),
    payItemTypeId: v.optional(v.id("payItemTypes")),
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
    glAccountId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_staffPayId", ["staffPayId"]),

  payslips: defineTable({
    staffPayId: v.id("staffPay"),
    propertyId: v.id("properties"),
    employeeId: v.id("staffs"),
    snapshot: v.any(),
    documentId: v.optional(v.string()),
    generatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_staffPayId", ["staffPayId"])
    .index("by_employeeId", ["employeeId"])
    .index("by_propertyId", ["propertyId"]),

  paymentFiles: defineTable({
    payrollId: v.id("payrolls"),
    format: v.union(v.literal("generic_csv"), v.literal("bank_file"), v.literal("cash_sheet")),
    status: v.union(
      v.literal("pending"),
      v.literal("generated"),
      v.literal("downloaded"),
      v.literal("failed")
    ),
    content: v.optional(v.string()),
    documentId: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    generatedBy: v.id("users"),
    generatedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_payrollId", ["payrollId"]),

  // Lightweight GL + payment records for Approve payroll / Mark as paid.
  // Full chart of accounts can replace string account codes later.
  journalEntries: defineTable({
    propertyId: v.id("properties"),
    referenceType: v.optional(v.string()),
    referenceId: v.optional(v.string()),
    status: v.string(),
    totalDebit: v.number(),
    totalCredit: v.number(),
    postedAt: v.optional(v.number()),
    postedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_reference", ["referenceType", "referenceId"]),

  journalEntryLines: defineTable({
    journalEntryId: v.id("journalEntries"),
    accountCode: v.string(),
    accountName: v.string(),
    debit: v.number(),
    credit: v.number(),
    description: v.optional(v.string()),
  })
    .index("by_journalEntryId", ["journalEntryId"]),

  payments: defineTable({
    propertyId: v.id("properties"),
    paymentType: v.string(),
    referenceType: v.string(),
    referenceId: v.string(),
    amount: v.number(),
    paymentMethod: v.string(),
    status: v.string(),
    paidAt: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_reference", ["referenceType", "referenceId"]),

  assets: defineTable({
    propertyId: v.id("properties"),
    roomId: v.optional(v.id("rooms")),
    assetTag: v.string(),
    name: v.string(),
    category: v.string(),
    status: v.union(
      v.literal("operational"),
      v.literal("maintenance"),
      v.literal("retired")
    ),
    lastMaintenanceDate: v.optional(v.number()),
    nextMaintenanceDate: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_roomId", ["roomId"])
    .index("by_propertyId_status", ["propertyId", "status"])
    .index("by_nextMaintenanceDate", ["nextMaintenanceDate"]),
});
