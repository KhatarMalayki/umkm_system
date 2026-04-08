import { describe, expect, it, beforeAll, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

// Mock database functions
vi.mock("./db", () => ({
  getAllUnits: vi.fn(),
  getUnitById: vi.fn(),
  getAllProducts: vi.fn(),
  getProductById: vi.fn(),
  getAllPaymentMethods: vi.fn(),
  getPaymentMethodById: vi.fn(),
  getActiveDiscounts: vi.fn(),
  getDiscountForProduct: vi.fn(),
  getAllOrders: vi.fn(),
  getOrderById: vi.fn(),
  getOrderByNumber: vi.fn(),
  getOrderItems: vi.fn(),
  getInvoiceByOrderId: vi.fn(),
  getInvoiceByNumber: vi.fn(),
  getAllInvoices: vi.fn(),
  createOrder: vi.fn(),
  addOrderItem: vi.fn(),
  createInvoice: vi.fn(),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Products Router", () => {
  it("should list all products", async () => {
    const mockProducts = [
      { id: 1, name: "Beras", price: "10000", quantity: "100", unitId: 1 },
      { id: 2, name: "Gula", price: "12000", quantity: "50", unitId: 1 },
    ];

    vi.mocked(db.getAllProducts).mockResolvedValue(mockProducts as any);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.products.list();

    expect(result).toEqual(mockProducts);
    expect(db.getAllProducts).toHaveBeenCalled();
  });

  it("should search products by name", async () => {
    const mockProducts = [{ id: 1, name: "Beras", price: "10000", quantity: "100", unitId: 1 }];

    vi.mocked(db.getAllProducts).mockResolvedValue(mockProducts as any);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.products.list({ search: "Beras" });

    expect(result).toEqual(mockProducts);
    expect(db.getAllProducts).toHaveBeenCalledWith("Beras");
  });

  it("should get product by id", async () => {
    const mockProduct = { id: 1, name: "Beras", price: "10000", quantity: "100", unitId: 1 };

    vi.mocked(db.getProductById).mockResolvedValue(mockProduct as any);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.products.getById({ id: 1 });

    expect(result).toEqual(mockProduct);
    expect(db.getProductById).toHaveBeenCalledWith(1);
  });
});

describe("Units Router", () => {
  it("should list all units", async () => {
    const mockUnits = [
      { id: 1, name: "kg", label: "Kilogram" },
      { id: 2, name: "pcs", label: "Pieces" },
    ];

    vi.mocked(db.getAllUnits).mockResolvedValue(mockUnits as any);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.units.list();

    expect(result).toEqual(mockUnits);
    expect(db.getAllUnits).toHaveBeenCalled();
  });
});

describe("Payment Methods Router", () => {
  it("should list all payment methods", async () => {
    const mockMethods = [
      { id: 1, name: "cod", label: "Cash on Delivery" },
      { id: 2, name: "transfer", label: "Bank Transfer" },
    ];

    vi.mocked(db.getAllPaymentMethods).mockResolvedValue(mockMethods as any);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.paymentMethods.list();

    expect(result).toEqual(mockMethods);
    expect(db.getAllPaymentMethods).toHaveBeenCalled();
  });
});

describe("Discounts Router", () => {
  it("should list active discounts", async () => {
    const mockDiscounts = [
      { id: 1, name: "Diskon 10%", discountType: "percentage", discountValue: "10" },
    ];

    vi.mocked(db.getActiveDiscounts).mockResolvedValue(mockDiscounts as any);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.discounts.list();

    expect(result).toEqual(mockDiscounts);
    expect(db.getActiveDiscounts).toHaveBeenCalled();
  });
});

describe("Orders Router", () => {
  it("should list all orders", async () => {
    const mockOrders = [
      { id: 1, orderNumber: "INV-20260408-001", status: "pending", total: "50000" },
    ];

    vi.mocked(db.getAllOrders).mockResolvedValue(mockOrders as any);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.orders.list();

    expect(result).toEqual(mockOrders);
    expect(db.getAllOrders).toHaveBeenCalled();
  });

  it("should get order by number", async () => {
    const mockOrder = { id: 1, orderNumber: "INV-20260408-001", status: "pending", total: "50000" };
    const mockItems = [{ id: 1, productId: 1, quantity: "2", pricePerUnit: "25000" }];
    const mockInvoice = { id: 1, invoiceNumber: "INV-20260408-001", total: "50000" };

    vi.mocked(db.getOrderByNumber).mockResolvedValue(mockOrder as any);
    vi.mocked(db.getOrderItems).mockResolvedValue(mockItems as any);
    vi.mocked(db.getInvoiceByOrderId).mockResolvedValue(mockInvoice as any);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.orders.getByNumber({ orderNumber: "INV-20260408-001" });

    expect(result.orderNumber).toEqual("INV-20260408-001");
    expect(result.items).toEqual(mockItems);
    expect(result.invoice).toEqual(mockInvoice);
  });
});

describe("Invoices Router", () => {
  it("should get invoice by number", async () => {
    const mockInvoice = { id: 1, invoiceNumber: "INV-20260408-001", total: "50000", orderId: 1 };
    const mockOrder = { id: 1, orderNumber: "INV-20260408-001", status: "pending" };
    const mockItems = [{ id: 1, productId: 1, quantity: "2" }];

    vi.mocked(db.getInvoiceByNumber).mockResolvedValue(mockInvoice as any);
    vi.mocked(db.getOrderById).mockResolvedValue(mockOrder as any);
    vi.mocked(db.getOrderItems).mockResolvedValue(mockItems as any);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.invoices.getByNumber({ invoiceNumber: "INV-20260408-001" });

    expect(result.invoiceNumber).toEqual("INV-20260408-001");
    expect(result.order).toEqual(mockOrder);
    expect(result.items).toEqual(mockItems);
  });

  it("should list all invoices", async () => {
    const mockInvoices = [
      { id: 1, invoiceNumber: "INV-20260408-001", total: "50000" },
    ];

    vi.mocked(db.getAllInvoices).mockResolvedValue(mockInvoices as any);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.invoices.list();

    expect(result).toEqual(mockInvoices);
    expect(db.getAllInvoices).toHaveBeenCalled();
  });
});
