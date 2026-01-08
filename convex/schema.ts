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
  })
    .index("byExternalId", ["externalId"])
    .index("by_email", ["email"])
    .index("by_isActive", ["isActive"]),

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
    assignedBy: v.string(), // User ID who assigned the role
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_roleId", ["roleId"])
    .index("by_userId_propertyId", ["userId", "propertyId"]),

  staffs: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    DoB: v.string(),
    stateOfOrigin: v.string(),
    LGA: v.string(),
    address: v.string(),
    salary: v.number(),
    employmentStatus: v.union(v.literal("employed"), v.literal("terminated")),
    dateRecruited: v.string(),
    dateTerminated: v.optional(v.string()),
    role: v.string(),
    email: v.optional(v.string()),
  })
    .index("email", ["email"])
    .searchIndex('search_staff', {
      searchField: 'firstName', //field to index for search \\'lastName', \\
      filterFields: ['employmentStatus', 'role'] //optional fields to filter
    }),

  // Properties table for multiple hospitality locations
  properties: defineTable({
    name: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    timezone: v.optional(v.string()),
    currency: v.optional(v.string()),
    taxId: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_name", ["name"])
    .index("by_email", ["email"]),

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
    amount: v.number(),
    expenseDate: v.number(),
    description: v.optional(v.string()),
  })
    .index("by_propertyId_expenseDate", ["propertyId", "expenseDate"])
    .index("by_category", ["category"]),

  // Inventory items for stock management
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

  // Inventory transactions for tracking stock changes
  inventoryTransactions: defineTable({
    itemId: v.id("inventory"),
    transactionType: v.union(v.literal("add"), v.literal("remove")),
    quantity: v.number(),
    transactionDate: v.number(),
    reason: v.optional(v.string()),
  })
    .index("by_itemId", ["itemId"])
    .index("by_transactionDate", ["transactionDate"]),

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
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_email", ["email"])
    .index("by_loyaltyNumber", ["loyaltyNumber"])
    .searchIndex("search_guests", {
      searchField: "firstName",
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
});