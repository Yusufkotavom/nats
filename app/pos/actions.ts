'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { InventoryService } from '@/app/(dashboard)/inventory/inventory-service';
import { getSession } from '@/lib/auth/auth';
import { MovementType } from "@/prisma/generated/prisma/client";
import { Decimal } from "decimal.js";
import { hasPermission } from "@/lib/permissions/utils";
import {
  enqueueIntegrationEventOnce,
  maybeProcessIntegrationOutboxEvent,
} from "@/modules/integration/outbox";

import { SuperJSON } from "@/lib/superjson";
import type { ActionResponse } from "@/lib/permissions/protected-action";

// Types
export type POSProduct = {
  id: string;
  name: string;
  sku: string;
  price: number;
  image: string | null;
  categoryId: string | null;
  stock: number;
  categoryName: string | null;
  availableDiscounts: {
    code: string;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT';
    value: number;
  }[];
};

export type POSCartItem = POSProduct & {
  quantity: number;
  discount: number;
};

export async function getPOSSessions() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize([]);
  }

  const sessions = await prisma.pOSSession.findMany({
    orderBy: { startTime: 'desc' },
    include: {
      cashier: {
        select: {
          name: true,
        },
      },
      warehouse: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          salesOrders: true,
        },
      },
    },
  });
  return SuperJSON.serialize(sessions);
}

export async function getPOSProducts(query?: string, categoryId?: string) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize([]);
  }

  const where: any = {
    isActive: true,
  };

  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { sku: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (categoryId && categoryId !== 'all') {
    where.categoryId = categoryId;
  }

  const now = new Date();

  const products = await prisma.product.findMany({
    where,
    include: {
      category: true,
      inventory: {
        include: {
          warehouse: true,
        },
      },
      discounts: {
        where: {
          isActive: true,
          startDate: { lte: now },
          OR: [
            { endDate: null },
            { endDate: { gte: now } }
          ]
        }
      }
    },
    orderBy: { name: 'asc' },
  });

  const mapped = products.map((p) => {
    const totalStock = p.inventory.reduce((acc, inv) => acc + inv.quantity, 0);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price.toNumber(),
      image: p.image,
      categoryId: p.categoryId,
      categoryName: p.category?.name || null,
      stock: totalStock,
      availableDiscounts: p.discounts.map(d => ({
        code: d.code,
        type: d.type,
        value: d.value.toNumber()
      }))
    };
  });

  return SuperJSON.serialize(mapped);
}

export async function getPOSCategories() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize([]);
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });
  return SuperJSON.serialize(categories);
}

export async function getWarehouses() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize([]);
  }

  const warehouses = await prisma.warehouse.findMany({
    orderBy: { name: 'asc' },
  });
  return SuperJSON.serialize(warehouses);
}

export async function getOpenPOSSession() {
  const session = await getSession();
  const userId = session?.userId;

  if (!userId || !hasPermission(session.permissions, "pos.access")) return null;

  const posSession = await prisma.pOSSession.findFirst({
    where: {
      status: 'OPEN',
      cashierId: userId
    },
    include: {
      cashier: true,
      warehouse: true,
    },
  });

  if (!posSession) return null;

  return SuperJSON.serialize(posSession);
}

export async function openPOSSession(openingCash: number, warehouseId: string) {
  const session = await getSession();
  const userId = session?.userId;
  if (!userId || !hasPermission(session.permissions, "pos.access")) throw new Error('Unauthorized');

  // Close any existing open sessions for this user just in case
  await prisma.pOSSession.updateMany({
    where: { cashierId: userId, status: 'OPEN' },
    data: { status: 'CLOSED', endTime: new Date() },
  });

  const sessionNumber = `SES-${Date.now()}`;

  const newSession = await prisma.pOSSession.create({
    data: {
      sessionNumber,
      cashierId: userId,
      openingCash: new Decimal(openingCash),
      status: 'OPEN',
      startTime: new Date(),
      warehouseId,
    },
  });

  revalidatePath('/pos');
  return SuperJSON.serialize(newSession);
}

export async function closePOSSession(sessionId: string, actualCash: number, notes?: string) {
  const sessionUser = await getSession();
  if (!sessionUser || !hasPermission(sessionUser.permissions, "pos.access")) {
     throw new Error("Unauthorized");
  }

  const payments = await prisma.salesPayment.findMany({
    where: {
      posSessionId: sessionId,
      method: 'CASH',
    }
  });

  const session = await prisma.pOSSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) throw new Error('Session not found');

  const cashSales = payments.reduce((acc, p) => acc.add(p.amount), new Decimal(0));
  const systemCash = new Decimal(session.openingCash).add(cashSales);

  await prisma.pOSSession.update({
    where: { id: sessionId },
    data: {
      status: 'CLOSED',
      endTime: new Date(),
      actualCash: new Decimal(actualCash),
      closingCash: systemCash,
      difference: new Decimal(actualCash).sub(systemCash),
      notes,
    },
  });

  revalidatePath('/pos');
}

export async function getPOSSessionTransactions(sessionId: string) {
  const transactions = await prisma.salesInvoice.findMany({
    where: { posSessionId: sessionId },
    orderBy: { createdAt: 'desc' },
    include: {
      contact: {
        select: {
          name: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
  });
  return SuperJSON.serialize(transactions);
}

export async function processPOSTransaction(
  sessionId: string,
  items: { productId: string; quantity: number; price: number; discount: number }[],
  paymentMethod: 'CASH' | 'CARD' | 'QRIS',
  amountPaid: number,
  globalDiscount: number = 0,
  customerId?: string
): Promise<
  ActionResponse<{
    invoiceId: string;
    outbox: { outboxIds: string[]; alreadyQueuedIds: string[]; processed: boolean };
  }>
> {
  try {
    const result = await prisma.$transaction(async (tx) => {
    // 1. Validate Session
    const session = await tx.pOSSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.status !== 'OPEN') throw new Error('Session is not open');

    // 2. Resolve Customer
    let contactId = customerId;
    if (!contactId) {
      const walkIn = await tx.contact.findFirst({
        where: { name: 'Walk-in Customer', type: 'CUSTOMER' },
      });
      if (walkIn) {
        contactId = walkIn.id;
      } else {
        const newWalkIn = await tx.contact.create({
          data: {
            name: 'Walk-in Customer',
            type: 'CUSTOMER',
          },
        });
        contactId = newWalkIn.id;
      }
    }

    // 3. Create Sales Order
    const orderNumber = `SO-POS-${Date.now()}`;
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalItemDiscounts = items.reduce((acc, item) => acc + item.discount, 0);
    const totalDiscount = new Decimal(totalItemDiscounts).add(globalDiscount);
    const totalAmount = new Decimal(subtotal).sub(totalDiscount);

    const salesOrder = await tx.salesOrder.create({
      data: {
        orderNumber,
        contactId: contactId!,
        status: 'SHIPPED', // Direct shipped for POS
        orderDate: new Date(),
        subtotal: new Decimal(subtotal),
        discountAmount: totalDiscount,
        totalAmount: totalAmount,
        posSessionId: sessionId,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: new Decimal(item.price),
            totalPrice: new Decimal(item.price * item.quantity - item.discount),
            discountRate: new Decimal(0), // We don't have rate calculated, storing net in totalPrice
          })),
        },
      },
      include: { items: true },
    });

    // 4. Create Sales Invoice
    const invoiceNumber = `INV-POS-${Date.now()}`;
    const invoiceDate = new Date();
    const salesInvoice = await tx.salesInvoice.create({
      data: {
        invoiceNumber,
        contactId: contactId!,
        salesOrderId: salesOrder.id,
        invoiceDate,
        dueDate: invoiceDate, // Immediate payment
        status: 'PAID',
        subtotal: new Decimal(subtotal),
        globalDiscount: new Decimal(globalDiscount),
        totalAmount: totalAmount,
        balanceDue: new Decimal(0),
        posSessionId: sessionId,
        items: {
          create: items.map(item => ({
            description: 'POS Item',
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: new Decimal(item.price),
            totalPrice: new Decimal(item.price * item.quantity - item.discount),
            discount: new Decimal(item.discount),
          })),
        },
      },
      include: { items: true },
    });

    // 5. Create Payment
    const paymentNumber = `PAY-POS-${Date.now()}`;
    const cashAccount = await tx.cashAccount.findFirst({
      where: { type: paymentMethod === 'CASH' ? 'CASH' : 'BANK' },
    });

    if (!cashAccount) throw new Error('No Cash/Bank account configured');

    const paymentDate = new Date();
    const payment = await tx.salesPayment.create({
      data: {
        paymentNumber,
        contactId: contactId!,
        amount: new Decimal(totalAmount),
        paymentDate,
        method: paymentMethod,
        reference: invoiceNumber,
        cashAccountId: cashAccount.id,
        posSessionId: sessionId,
        salesInvoiceId: salesInvoice.id,
      },
    });

    // 6. Create Shipment
    const shipmentNumber = `SHP-POS-${Date.now()}`;
    const shipment = await tx.salesShipment.create({
      data: {
        shipmentNumber,
        salesOrderId: salesOrder.id,
        contactId: contactId!,
        status: 'COMPLETED',
        shipmentDate: new Date(),
        items: {
          create: salesOrder.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            salesOrderItemId: item.id,
          })),
        },
      },
      include: { items: true },
    });

    // 7. Inventory Movement. Need to fix to use specific warehouse
    await InventoryService.createInventoryMovement(tx, {
      type: MovementType.OUT,
      reference: shipment.shipmentNumber,
      items: shipment.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      notes: `POS Sale ${orderNumber}`,
      transactionDate: new Date(),
      warehouseId: session.warehouseId || undefined,
    });

    const invoiceOutbox = await enqueueIntegrationEventOnce(tx, {
      topic: "sales",
      type: "SALES_INVOICE_ISSUED",
      aggregateType: "SalesInvoice",
      aggregateId: salesInvoice.id,
      payload: {
        invoiceId: salesInvoice.id,
        invoiceNumber: salesInvoice.invoiceNumber,
        invoiceDate: invoiceDate.toISOString(),
        contactId: contactId!,
        userId: session.cashierId,
        totalAmount: salesInvoice.totalAmount.toString(),
        globalDiscount: salesInvoice.globalDiscount?.toString(),
        shippingCost: undefined,
        items: items.map((item) => {
          const subtotal = new Decimal(item.price).mul(item.quantity);
          const discountPercent =
            subtotal.gt(0) && item.discount > 0
              ? new Decimal(item.discount).div(subtotal).mul(100)
              : new Decimal(0);

          return {
            description: `POS Item - ${item.productId}`,
            quantity: item.quantity,
            unitPrice: new Decimal(item.price).toString(),
            discount: discountPercent.toString(),
            tax: undefined,
            accountId: undefined,
          };
        }),
      },
    });

    const paymentOutbox = await enqueueIntegrationEventOnce(tx, {
      topic: "sales",
      type: "SALES_PAYMENT_POSTED",
      aggregateType: "SalesPayment",
      aggregateId: payment.id,
      payload: {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        paymentDate: paymentDate.toISOString(),
        amount: payment.amount.toString(),
        reference: payment.reference ?? undefined,
        notes: undefined,
        cashAccountId: payment.cashAccountId,
        contactId: payment.contactId,
        salesInvoiceId: payment.salesInvoiceId,
        userId: session.cashierId,
      },
    });

    const outboxIds = [invoiceOutbox.id, paymentOutbox.id];
    const alreadyQueuedIds = [
      ...(invoiceOutbox.alreadyQueued ? [invoiceOutbox.id] : []),
      ...(paymentOutbox.alreadyQueued ? [paymentOutbox.id] : []),
    ];

    return { invoiceId: salesInvoice.id, outboxIds, alreadyQueuedIds };
  });

    const processingResults = await Promise.all(
      result.outboxIds.map((outboxId) => maybeProcessIntegrationOutboxEvent(outboxId)),
    );

    const processedAll = processingResults.every((r) => r.processed);

    return {
      success: true,
      data: {
        invoiceId: result.invoiceId,
        outbox: {
          outboxIds: result.outboxIds,
          alreadyQueuedIds: result.alreadyQueuedIds,
          processed: processedAll,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process POS transaction",
    };
  }
}

export async function holdOrder(
  cart: POSCartItem[],
  totalAmount: number,
  note?: string,
  customerId?: string,
  customerName?: string,
  globalDiscount: number = 0
) {
  const session = await getSession();
  const userId = session?.userId;
  if (!userId) throw new Error('Unauthorized');

  const posSession = await prisma.pOSSession.findFirst({
    where: { cashierId: userId, status: 'OPEN' },
  });

  const holdId = `HOLD-${Date.now().toString().slice(-6)}`;

  // Store structured data to include globalDiscount
  const orderData = {
    cart,
    globalDiscount
  };

  const heldOrder = await prisma.heldOrder.create({
    data: {
      holdId,
      userId,
      posSessionId: posSession?.id,
      items: orderData as any,
      totalAmount: new Decimal(totalAmount),
      note,
      customerId,
      customerName,
    },
  });

  revalidatePath('/pos');
  return SuperJSON.serialize(heldOrder);
}

export async function validateDiscountCode(code: string) {
  const discount = await prisma.discount.findUnique({
    where: { code, isActive: true },
    include: {
      products: {
        select: { id: true }
      }
    }
  });

  if (!discount) {
    throw new Error('Invalid discount code');
  }

  const now = new Date();
  if (discount.startDate > now || (discount.endDate && discount.endDate < now)) {
    throw new Error('Discount code is expired or not yet active');
  }

  return SuperJSON.serialize(discount);
}

export async function getHeldOrders() {
  const session = await getSession();
  if (!session?.userId) throw new Error('Unauthorized');

  // Cleanup old held orders (> 24h)
  const expirationDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.heldOrder.deleteMany({
    where: {
      createdAt: { lt: expirationDate },
    },
  });

  const heldOrders = await prisma.heldOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: { customer: true, user: true },
  });

  return SuperJSON.serialize(heldOrders);
}

export async function getPOSInvoice(id: string) {
  const session = await getSession();
  if (!session?.userId) throw new Error('Unauthorized');

  const invoice = await prisma.salesInvoice.findUnique({
    where: { id },
    include: {
      contact: true,
      items: {
        include: {
          product: true,
        },
      },
      payments: {
        include: {
          cashAccount: true,
        },
      },
      salesOrder: true,
      posSession: {
        include: {
          cashier: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!invoice) return null;

  return SuperJSON.serialize(invoice);
}

export async function resumeOrder(heldOrderId: string) {
  const session = await getSession();
  if (!session?.userId) throw new Error('Unauthorized');

  const heldOrder = await prisma.heldOrder.findUnique({
    where: { id: heldOrderId },
  });

  if (!heldOrder) throw new Error('Held order not found');

  await prisma.heldOrder.delete({
    where: { id: heldOrderId },
  });

  revalidatePath('/pos');
  return SuperJSON.serialize(heldOrder);
}

export async function deleteHeldOrder(heldOrderId: string) {
  const session = await getSession();
  if (!session?.userId) throw new Error('Unauthorized');

  await prisma.heldOrder.delete({
    where: { id: heldOrderId },
  });

  revalidatePath('/pos');
}
