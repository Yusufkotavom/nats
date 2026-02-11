'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { InventoryService } from '@/app/(dashboard)/inventory/inventory-service';
import { getSession } from '@/lib/auth/auth';
import { MovementType, CashTransactionType } from "@/prisma/generated/prisma/client";
import { Decimal } from '@/prisma/generated/prisma/internal/prismaNamespace';
import { getRequiredDefaultAccount } from "@/app/(dashboard)/accounting/accounting-service";

import { SuperJSON } from "@/lib/superjson";

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
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });
  return SuperJSON.serialize(categories);
}

export async function getWarehouses() {
  const warehouses = await prisma.warehouse.findMany({
    orderBy: { name: 'asc' },
  });
  return SuperJSON.serialize(warehouses);
}

export async function getOpenPOSSession() {
  const session = await getSession();
  const userId = session?.userId;

  if (!userId) return null;

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
  if (!userId) throw new Error('Unauthorized');

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

export async function processPOSTransaction(
  sessionId: string,
  items: { productId: string; quantity: number; price: number; discount: number }[],
  paymentMethod: 'CASH' | 'CARD' | 'QRIS',
  amountPaid: number,
  globalDiscount: number = 0,
  customerId?: string
) {
  return await prisma.$transaction(async (tx) => {
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

    // 3.5. Prepare Accounting Accounts
    const arAccount = await getRequiredDefaultAccount("ACCOUNTS_RECEIVABLE");
    const revenueAccount = await getRequiredDefaultAccount("SALES_REVENUE");
    const taxAccount = await getRequiredDefaultAccount("SALES_TAX_PAYABLE");
    const discountAccount = await getRequiredDefaultAccount("SALES_DISCOUNT");
    const shippingAccount = await getRequiredDefaultAccount("UNCATEGORIZED_INCOME");

    // 4. Create Sales Invoice
    const invoiceNumber = `INV-POS-${Date.now()}`;
    const salesInvoice = await tx.salesInvoice.create({
      data: {
        invoiceNumber,
        contactId: contactId!,
        salesOrderId: salesOrder.id,
        invoiceDate: new Date(),
        dueDate: new Date(), // Immediate payment
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

    // 4.5. Create Invoice Journal Entry (Revenue Recognition)
    const invoiceJeLines: any[] = [];
    let lineNum = 1;

    // Debit AR
    invoiceJeLines.push({
      accountId: arAccount.accountId,
      debitAmount: totalAmount,
      creditAmount: 0,
      description: `Receivable for Invoice #${invoiceNumber}`,
      lineNumber: lineNum++,
      contactId: contactId,
    });

    // Credit Revenue & Tax
    for (const item of items) {
      // Ideally we fetch product income account, but using default revenue for now
      const itemTotal = item.price * item.quantity;
      const itemDiscount = item.discount;
      const netAmount = itemTotal - itemDiscount;

      // Assuming no tax calculation in POS for now (as per current logic)
      // If tax is added later, it should be split here

      invoiceJeLines.push({
        accountId: revenueAccount.accountId,
        debitAmount: 0,
        creditAmount: netAmount,
        description: `POS Item - ${item.productId}`, // We should probably improve description
        lineNumber: lineNum++,
      });
    }

    // Debit Global Discount
    if (globalDiscount > 0) {
      invoiceJeLines.push({
        accountId: discountAccount.accountId,
        debitAmount: globalDiscount,
        creditAmount: 0,
        description: "Global Discount",
        lineNumber: lineNum++,
      });
    }

    const invoiceJe = await tx.journalEntry.create({
      data: {
        userId: session.cashierId,
        entryNumber: `INV-POS-${Date.now()}`, // Or match invoice?
        transactionDate: new Date(),
        description: `Invoice #${invoiceNumber}`,
        status: "posted",
        postedAt: new Date(),
        lines: {
          create: invoiceJeLines
        }
      }
    });

    await tx.salesInvoice.update({
      where: { id: salesInvoice.id },
      data: { journalEntryId: invoiceJe.id }
    });


    // 5. Create Payment
    const paymentNumber = `PAY-POS-${Date.now()}`;
    const cashAccount = await tx.cashAccount.findFirst({
      where: { type: paymentMethod === 'CASH' ? 'CASH' : 'BANK' },
    });

    if (!cashAccount) throw new Error('No Cash/Bank account configured');

    const payment = await tx.salesPayment.create({
      data: {
        paymentNumber,
        contactId: contactId!,
        amount: new Decimal(totalAmount),
        paymentDate: new Date(),
        method: paymentMethod,
        reference: invoiceNumber,
        cashAccountId: cashAccount.id,
        posSessionId: sessionId,
        salesInvoiceId: salesInvoice.id,
      },
    });

    // 5.5 Create Payment Journal Entry & Cash Transaction
    const paymentJe = await tx.journalEntry.create({
      data: {
        userId: session.cashierId,
        entryNumber: `PAY-POS-${Date.now()}`,
        transactionDate: new Date(),
        description: `Payment for Invoice #${invoiceNumber}`,
        status: "posted",
        postedAt: new Date(),
        lines: {
          create: [
            {
              accountId: cashAccount.glAccountId,
              debitAmount: new Decimal(totalAmount),
              creditAmount: 0,
              description: `Payment to ${cashAccount.name}`,
              lineNumber: 1,
            },
            {
              accountId: arAccount.accountId,
              debitAmount: 0,
              creditAmount: new Decimal(totalAmount),
              description: `Payment for Invoice #${invoiceNumber}`,
              lineNumber: 2,
              contactId: contactId,
            },
          ],
        },
      },
    });

    await tx.cashTransaction.create({
      data: {
        cashAccountId: cashAccount.id,
        type: CashTransactionType.INCOME,
        date: new Date(),
        reference: invoiceNumber,
        description: `Payment for Invoice #${invoiceNumber}`,
        journalEntryId: paymentJe.id,
        status: "APPROVED",
        approvedAt: new Date(),
        allocations: {
          create: {
            accountId: arAccount.accountId,
            amount: new Decimal(totalAmount),
            description: `Payment for Invoice #${invoiceNumber}`,
          },
        },
      },
    });

    await tx.salesPayment.update({
      where: { id: payment.id },
      data: { journalEntryId: paymentJe.id }
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

    return { invoiceId: salesInvoice.id };
  });
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
