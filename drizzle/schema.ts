import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Units of measurement for products (kg, pcs, liter, etc)
 */
export const units = mysqlTable("units", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(), // "kg", "pcs", "liter", etc
  label: varchar("label", { length: 100 }).notNull(), // "Kilogram", "Pieces", "Liter", etc
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Unit = typeof units.$inferSelect;
export type InsertUnit = typeof units.$inferInsert;

/**
 * Products in the store
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(), // Price per unit
  unitId: int("unitId").notNull(), // Foreign key to units
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(), // Current stock
  imageUrl: text("imageUrl"), // CDN URL to product image
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Discounts that can be applied to products or orders
 */
export const discounts = mysqlTable("discounts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  discountType: mysqlEnum("discountType", ["percentage", "fixed"]).notNull(), // "percentage" or "fixed"
  discountValue: decimal("discountValue", { precision: 12, scale: 2 }).notNull(), // Percentage (0-100) or fixed amount
  productId: int("productId"), // NULL = applies to all products, or specific product
  minOrderAmount: decimal("minOrderAmount", { precision: 12, scale: 2 }), // Minimum order to apply
  isActive: boolean("isActive").default(true).notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Discount = typeof discounts.$inferSelect;
export type InsertDiscount = typeof discounts.$inferInsert;

/**
 * Payment methods available
 */
export const paymentMethods = mysqlTable("paymentMethods", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(), // "cod", "transfer"
  label: varchar("label", { length: 100 }).notNull(), // "Cash on Delivery", "Bank Transfer"
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = typeof paymentMethods.$inferInsert;

/**
 * Orders placed by customers
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(), // Invoice number like INV-2026-001
  customerId: int("customerId"), // NULL for anonymous/guest orders, or user ID
  paymentMethodId: int("paymentMethodId").notNull(), // Foreign key to paymentMethods
  status: mysqlEnum("status", ["pending", "confirmed", "paid", "completed", "cancelled"]).default("pending").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "partial", "paid"]).default("unpaid").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(), // Total before discount
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(), // Total after discount
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Individual items in an order
 */
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(), // Foreign key to orders
  productId: int("productId").notNull(), // Foreign key to products
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  unitId: int("unitId").notNull(), // Foreign key to units (snapshot at order time)
  pricePerUnit: decimal("pricePerUnit", { precision: 12, scale: 2 }).notNull(), // Price at time of order
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(), // quantity * pricePerUnit
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Invoices/receipts for orders
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().unique(), // Foreign key to orders
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
  customerName: varchar("customerName", { length: 255 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerPhone: varchar("customerPhone", { length: 20 }),
  paymentMethod: varchar("paymentMethod", { length: 50 }).notNull(),
  bankDetails: json("bankDetails"), // For transfer: { bankName, accountNumber, accountHolder }
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paidAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;
