import { eq, and, gte, lte, like, desc, asc, or, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, products, units, orders, orderItems, invoices, discounts, paymentMethods } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ UNITS ============
export async function getAllUnits() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(units).orderBy(asc(units.name));
}

export async function getUnitById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(units).where(eq(units.id, id)).limit(1);
  return result[0];
}

// ============ PRODUCTS ============
export async function getAllProducts(search?: string) {
  const db = await getDb();
  if (!db) return [];
  
  let whereConditions: any[] = [eq(products.isActive, true)];
  
  if (search) {
    whereConditions.push(like(products.name, `%${search}%`));
  }
  
  return db.select().from(products)
    .where(and(...whereConditions))
    .orderBy(desc(products.createdAt));
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function createProduct(data: {
  name: string;
  description?: string;
  price: string;
  unitId: number;
  quantity: string;
  imageUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(products).values({
    name: data.name,
    description: data.description,
    price: data.price,
    unitId: data.unitId,
    quantity: data.quantity,
    imageUrl: data.imageUrl,
  });
  
  return result;
}

export async function updateProduct(id: number, data: Partial<{
  name: string;
  description: string;
  price: string;
  unitId: number;
  quantity: string;
  imageUrl: string;
  isActive: boolean;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(products).where(eq(products.id, id));
}

// ============ DISCOUNTS ============
export async function getActiveDiscounts() {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  return db.select().from(discounts).where(
    and(
      eq(discounts.isActive, true),
      or(
        isNull(discounts.startDate),
        lte(discounts.startDate, now)
      ),
      or(
        isNull(discounts.endDate),
        gte(discounts.endDate, now)
      )
    )
  );
}

export async function getDiscountForProduct(productId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const now = new Date();
  const result = await db.select().from(discounts).where(
    and(
      eq(discounts.productId, productId),
      eq(discounts.isActive, true),
      or(
        isNull(discounts.startDate),
        lte(discounts.startDate, now)
      ),
      or(
        isNull(discounts.endDate),
        gte(discounts.endDate, now)
      )
    )
  ).limit(1);
  
  return result[0];
}

// ============ PAYMENT METHODS ============
export async function getAllPaymentMethods() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(paymentMethods).where(eq(paymentMethods.isActive, true));
}

export async function getPaymentMethodById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id)).limit(1);
  return result[0];
}

// ============ ORDERS ============
export async function createOrder(data: {
  orderNumber: string;
  customerId?: number;
  paymentMethodId: number;
  subtotal: string;
  discountAmount: string;
  total: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(orders).values({
    orderNumber: data.orderNumber,
    customerId: data.customerId,
    paymentMethodId: data.paymentMethodId,
    subtotal: data.subtotal,
    discountAmount: data.discountAmount,
    total: data.total,
    notes: data.notes,
  });
  
  return result;
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0];
}

export async function getOrderByNumber(orderNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  return result[0];
}

export async function getAllOrders(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit).offset(offset);
}

export async function updateOrderStatus(id: number, status: string, paymentStatus?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { status };
  if (paymentStatus) updateData.paymentStatus = paymentStatus;
  
  return db.update(orders).set(updateData).where(eq(orders.id, id));
}

// ============ ORDER ITEMS ============
export async function addOrderItem(data: {
  orderId: number;
  productId: number;
  quantity: string;
  unitId: number;
  pricePerUnit: string;
  subtotal: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(orderItems).values(data);
}

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

// ============ INVOICES ============
export async function createInvoice(data: {
  orderId: number;
  invoiceNumber: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod: string;
  bankDetails?: any;
  subtotal: string;
  discountAmount: string;
  total: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(invoices).values(data);
}

export async function getInvoiceByOrderId(orderId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(invoices).where(eq(invoices.orderId, orderId)).limit(1);
  return result[0];
}

export async function getInvoiceByNumber(invoiceNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(invoices).where(eq(invoices.invoiceNumber, invoiceNumber)).limit(1);
  return result[0];
}

export async function getAllInvoices(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(limit).offset(offset);
}

export async function updateInvoicePaidAmount(id: number, paidAmount: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(invoices).set({ paidAmount }).where(eq(invoices.id, id));
}


