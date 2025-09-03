import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table for authentication and roles
  users: defineTable({
    username: v.string(),
    passwordHash: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("staff"), v.literal("accountant")),
    email: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_username", ["username"]),

  // Properties table for multiple hospitality locations
  properties: defineTable({
    name: v.string(),
    address: v.optional(v.string()),
    contactNumber: v.optional(v.string()),
  })
    .index("by_name", ["name"]),

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
});