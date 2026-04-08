import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

// Helper function to generate order number
function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const timestamp = now.getTime().toString().slice(-6);
  return `INV-${year}${month}${day}-${timestamp}`;
}

// Helper function to calculate discount
function calculateDiscount(amount: number, discountType: string, discountValue: number): number {
  if (discountType === "percentage") {
    return (amount * discountValue) / 100;
  } else if (discountType === "fixed") {
    return Math.min(discountValue, amount);
  }
  return 0;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ UNITS ============
  units: router({
    list: publicProcedure.query(async () => {
      return db.getAllUnits();
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getUnitById(input.id);
    }),
  }),

  // ============ PRODUCTS ============
  products: router({
    list: publicProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return db.getAllProducts(input?.search);
      }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const product = await db.getProductById(input.id);
      if (!product) throw new TRPCError({ code: "NOT_FOUND" });
      return product;
    }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          price: z.string(),
          unitId: z.number(),
          quantity: z.string(),
          imageUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return db.createProduct(input);
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          price: z.string().optional(),
          unitId: z.number().optional(),
          quantity: z.string().optional(),
          imageUrl: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { id, ...data } = input;
        return db.updateProduct(id, data);
      }),
  }),

  // ============ DISCOUNTS ============
  discounts: router({
    list: publicProcedure.query(async () => {
      return db.getActiveDiscounts();
    }),
    getForProduct: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return db.getDiscountForProduct(input.productId);
      }),
  }),

  // ============ PAYMENT METHODS ============
  paymentMethods: router({
    list: publicProcedure.query(async () => {
      return db.getAllPaymentMethods();
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getPaymentMethodById(input.id);
    }),
  }),

  // ============ ORDERS ============
  orders: router({
    create: publicProcedure
      .input(
        z.object({
          paymentMethodId: z.number(),
          items: z.array(
            z.object({
              productId: z.number(),
              quantity: z.string(),
            })
          ),
          discountIds: z.array(z.number()).optional(),
          customerName: z.string().optional(),
          customerEmail: z.string().optional(),
          customerPhone: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Validate payment method
        const paymentMethod = await db.getPaymentMethodById(input.paymentMethodId);
        if (!paymentMethod) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Payment method not found" });
        }

        // Calculate order totals
        let subtotal = 0;
        const orderItems: any[] = [];

        for (const item of input.items) {
          const product = await db.getProductById(item.productId);
          if (!product) {
            throw new TRPCError({ code: "NOT_FOUND", message: `Product ${item.productId} not found` });
          }

          const quantity = parseFloat(item.quantity);
          const pricePerUnit = parseFloat(product.price);
          const itemSubtotal = quantity * pricePerUnit;

          subtotal += itemSubtotal;
          orderItems.push({
            productId: product.id,
            quantity: item.quantity,
            unitId: product.unitId,
            pricePerUnit: product.price,
            subtotal: itemSubtotal.toString(),
          });
        }

        // Calculate discount
        let discountAmount = 0;
        if (input.discountIds && input.discountIds.length > 0) {
          // Apply first applicable discount (can be extended for multiple)
          const discount = await db.getActiveDiscounts();
          const applicableDiscount = discount.find(d => input.discountIds?.includes(d.id));
          if (applicableDiscount) {
            discountAmount = calculateDiscount(
              subtotal,
              applicableDiscount.discountType,
              parseFloat(applicableDiscount.discountValue)
            );
          }
        }

        const total = subtotal - discountAmount;

        // Create order
        const orderNumber = generateOrderNumber();
        const orderResult = await db.createOrder({
          orderNumber,
          paymentMethodId: input.paymentMethodId,
          subtotal: subtotal.toString(),
          discountAmount: discountAmount.toString(),
          total: total.toString(),
          notes: input.notes,
        });

        // Get the created order ID
        const orderId = (orderResult as any).insertId || (orderResult as any)[0]?.id;

        // Add order items
        for (const item of orderItems) {
          await db.addOrderItem({
            orderId,
            ...item,
          });
        }

        // Create invoice
        await db.createInvoice({
          orderId,
          invoiceNumber: orderNumber,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          paymentMethod: paymentMethod.name,
          subtotal: subtotal.toString(),
          discountAmount: discountAmount.toString(),
          total: total.toString(),
        });

        return {
          orderId,
          orderNumber,
          subtotal,
          discountAmount,
          total,
        };
      }),

    list: publicProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
      .query(async ({ input }) => {
        return db.getAllOrders(input?.limit, input?.offset);
      }),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const order = await db.getOrderById(input.id);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });

      const items = await db.getOrderItems(input.id);
      const invoice = await db.getInvoiceByOrderId(input.id);

      return {
        ...order,
        items,
        invoice,
      };
    }),

    getByNumber: publicProcedure
      .input(z.object({ orderNumber: z.string() }))
      .query(async ({ input }) => {
        const order = await db.getOrderByNumber(input.orderNumber);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });

        const items = await db.getOrderItems(order.id);
        const invoice = await db.getInvoiceByOrderId(order.id);

        return {
          ...order,
          items,
          invoice,
        };
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          orderId: z.number(),
          status: z.enum(["pending", "confirmed", "paid", "completed", "cancelled"]),
          paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return db.updateOrderStatus(input.orderId, input.status, input.paymentStatus);
      }),
  }),

  // ============ INVOICES ============
  invoices: router({
    getByNumber: publicProcedure
      .input(z.object({ invoiceNumber: z.string() }))
      .query(async ({ input }) => {
        const invoice = await db.getInvoiceByNumber(input.invoiceNumber);
        if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });

        const order = await db.getOrderById(invoice.orderId);
        const items = await db.getOrderItems(invoice.orderId);

        return {
          ...invoice,
          order,
          items,
        };
      }),

    list: publicProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
      .query(async ({ input }) => {
        return db.getAllInvoices(input?.limit, input?.offset);
      }),

    updatePaidAmount: protectedProcedure
      .input(z.object({ invoiceId: z.number(), paidAmount: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return db.updateInvoicePaidAmount(input.invoiceId, input.paidAmount);
      }),
  }),
});

export type AppRouter = typeof appRouter;
