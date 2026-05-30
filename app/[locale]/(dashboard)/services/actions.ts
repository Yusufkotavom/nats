"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { SuperJSON } from "@/lib/superjson";
import { revalidateLocalizedPath, revalidateLocalizedPaths } from "@/lib/revalidate-localized-path";
import { ContactType } from "@/prisma/generated/prisma/client";
import {
  POSServiceWorkflowService,
  type ServiceWorkflowStatus,
} from "@/modules/services/services/pos-service-workflow.service";
import { PaymentMethodCatalogService } from "@/modules/cash-bank/services/payment-method-catalog.service";
import type {
  ServiceAfterSalesCaseListItem,
  ServiceInvoiceListItem,
  ServiceOrderListItem,
  ServicePaymentMethod,
  ServicePaymentListItem,
} from "./types";
import { SalesReturnService } from "@/modules/sales/services/sales-return.service";
import { assertCompanyWriteAccess } from "@/lib/subscription/write-guard";

type PagingResult<T> = {
  data: T[];
  total: number;
  totalPages: number;
};

type AuthSession = NonNullable<Awaited<ReturnType<typeof getSession>>> & {
  activeCompanyId: string;
  userId: string;
};

function assertAccess(
  session: Awaited<ReturnType<typeof getSession>>,
): asserts session is AuthSession {
  const canAccessServices =
    !!session?.permissions &&
    (hasPermission(session.permissions, "pos.access") ||
      hasPermission(session.permissions, "sales.view") ||
      hasPermission(session.permissions, "sales.create"));

  if (!session?.userId || !canAccessServices) {
    throw new Error("Unauthorized");
  }
  if (!session.activeCompanyId) {
    throw new Error("No active company selected");
  }
}

async function ensureServiceSession(companyId: string, userId: string) {
  const existing = await prisma.pOSSession.findFirst({
    where: {
      companyId,
      cashierId: userId,
      status: "OPEN",
    },
    select: { id: true },
    orderBy: { startTime: "desc" },
  });

  if (existing) return existing.id;

  const session = await prisma.pOSSession.create({
    data: {
      companyId,
      cashierId: userId,
      sessionNumber: `SRV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: "OPEN",
      openingCash: 0,
      notes: "Auto session for Services module",
    },
    select: { id: true },
  });

  return session.id;
}

export async function getServiceCreateMeta() {
  const session = await getSession();
  assertAccess(session);
  const companyId = session.activeCompanyId;
  const userId = session.userId;

  const sessionId = await ensureServiceSession(companyId, userId);

  const [products, contacts] = await Promise.all([
    prisma.product.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, price: true, isService: true },
      orderBy: { name: "asc" },
    }),
    prisma.contact.findMany({
      where: { companyId, type: ContactType.CUSTOMER, isActive: true },
      select: { id: true, name: true, phone: true, email: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
  ]);

  return SuperJSON.serialize({
    session: { id: sessionId },
    products: products.map((item) => ({
      ...item,
      price: Number(item.price),
    })),
    contacts,
  });
}

export async function createServiceQuickContact(input: {
  name: string;
  phone?: string;
  email?: string;
}) {
  await assertCompanyWriteAccess();
  const session = await getSession();
  assertAccess(session);
  const companyId = session.activeCompanyId;

  const name = input.name.trim();
  const phone = input.phone?.trim() || null;
  const email = input.email?.trim() || null;

  if (!name) {
    throw new Error("Nama kontak wajib diisi");
  }

  const contact = await prisma.contact.create({
    data: {
      companyId,
      type: ContactType.CUSTOMER,
      name,
      phone,
      email,
      isActive: true,
      taxExempt: false,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
    },
  });

  revalidateLocalizedPath("/services");
  revalidateLocalizedPath("/general/contacts");
  return SuperJSON.serialize(contact);
}

export async function createServiceOrder(input: {
  customerId?: string;
  notes?: string;
  targetDate?: Date;
  downPaymentAmount?: number;
  paymentMethod?: ServicePaymentMethod;
  downPaymentCashAccountId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    price?: number;
    discount?: number;
    notes?: string;
  }>;
}) {
  await assertCompanyWriteAccess();
  const session = await getSession();
  assertAccess(session);
  const companyId = session.activeCompanyId;
  const userId = session.userId;
  const sessionId = await ensureServiceSession(companyId, userId);

  const order = await POSServiceWorkflowService.create(
    {
      ...input,
      sessionId,
    },
    userId,
  );

  const [contact, invoice] = await Promise.all([
    order.contactId
      ? prisma.contact.findFirst({
          where: { id: order.contactId, companyId },
          select: { id: true, name: true, phone: true },
        })
      : Promise.resolve(null),
    prisma.salesInvoice.findFirst({
      where: { id: order.salesInvoiceId, companyId },
      select: { id: true, invoiceNumber: true },
    }),
  ]);

  revalidateLocalizedPaths([
    "/services",
    "/services/orders",
    "/services/invoices",
    "/services/payments",
  ]);
  return SuperJSON.serialize({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customerId: order.contactId,
    customerName: contact?.name || "Walk-in Customer",
    customerPhone: contact?.phone || null,
    invoiceNumber: invoice?.invoiceNumber || null,
    totalAmount: Number(order.totalAmount),
    remainingAmount: Number(order.remainingAmount),
    createdAt: order.createdAt,
  });
}

export async function getServiceOrders(
  page = 1,
  pageSize = 10,
  search = "",
  status: ServiceWorkflowStatus | "ALL" = "ALL",
): Promise<PagingResult<ServiceOrderListItem>> {
  const session = await getSession();
  assertAccess(session);
  const companyId = session.activeCompanyId;

  const where = {
    companyId,
    ...(status !== "ALL" ? { status } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: "insensitive" as const } },
            { contact: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.pOSServiceOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        items: {
          select: {
            quantity: true,
            notes: true,
            unitPrice: true,
            product: {
              select: { name: true },
            },
          },
          take: 1,
        },
      },
    }),
    prisma.pOSServiceOrder.count({ where }),
  ]);
  const contacts = await prisma.contact.findMany({
    where: {
      companyId,
      id: { in: orders.map((o) => o.contactId).filter(Boolean) as string[] },
    },
    select: { id: true, name: true, phone: true },
  });
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  const invoices = await prisma.salesInvoice.findMany({
    where: { companyId, id: { in: orders.map((o) => o.salesInvoiceId) } },
    select: { id: true, invoiceNumber: true },
  });
  const invoiceMap = new Map(invoices.map((i) => [i.id, i.invoiceNumber]));

  const rows: ServiceOrderListItem[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    salesOrderId: order.salesOrderId,
    salesInvoiceId: order.salesInvoiceId,
    status: order.status as ServiceOrderListItem["status"],
    contactId: order.contactId,
    customerName: order.contactId ? (contactMap.get(order.contactId)?.name ?? "Walk-in Customer") : "Walk-in Customer",
    customerPhone: order.contactId ? (contactMap.get(order.contactId)?.phone ?? null) : null,
    invoiceNumber: invoiceMap.get(order.salesInvoiceId) ?? null,
    quantity: order.items[0]?.quantity ?? 1,
    primaryProductName: order.items[0]?.product?.name ?? null,
    primaryItemNotes: order.items[0]?.notes ?? null,
    primaryItemPrice: order.items[0]?.unitPrice?.toString() ?? null,
    totalAmount: order.totalAmount.toString(),
    paidAmount: order.paidAmount.toString(),
    remainingAmount: order.remainingAmount.toString(),
    targetDate: order.targetDate,
    createdAt: order.createdAt,
  }));

  return {
    data: rows,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getServiceInvoices(
  page = 1,
  pageSize = 10,
  search = "",
): Promise<PagingResult<ServiceInvoiceListItem>> {
  const session = await getSession();
  assertAccess(session);
  const companyId = session.activeCompanyId;

  const where = {
    companyId,
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: "insensitive" as const } },
            { notes: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.pOSServiceOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.pOSServiceOrder.count({ where }),
  ]);
  const contacts = await prisma.contact.findMany({
    where: {
      companyId,
      id: { in: orders.map((o) => o.contactId).filter(Boolean) as string[] },
    },
    select: { id: true, name: true },
  });
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  const invoices = await prisma.salesInvoice.findMany({
    where: { companyId, id: { in: orders.map((o) => o.salesInvoiceId) } },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      totalAmount: true,
      balanceDue: true,
      dueDate: true,
      invoiceDate: true,
    },
  });
  const invoiceMap = new Map(invoices.map((i) => [i.id, i]));

  const rows = orders
    .map((order): ServiceInvoiceListItem | null => {
      const invoice = invoiceMap.get(order.salesInvoiceId);
      if (!invoice) return null;
      return {
        id: invoice.id,
        serviceOrderId: order.id,
        invoiceNumber: invoice.invoiceNumber,
        orderNumber: order.orderNumber,
        customerName: order.contactId ? (contactMap.get(order.contactId)?.name ?? "Walk-in Customer") : "Walk-in Customer",
        status: String(invoice.status),
        totalAmount: invoice.totalAmount.toString(),
        balanceDue: invoice.balanceDue.toString(),
        dueDate: invoice.dueDate,
        invoiceDate: invoice.invoiceDate,
      };
    })
    .filter((item): item is ServiceInvoiceListItem => item !== null);

  return {
    data: rows,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getServicePayments(
  page = 1,
  pageSize = 10,
  search = "",
): Promise<PagingResult<ServicePaymentListItem>> {
  const session = await getSession();
  assertAccess(session);
  const companyId = session.activeCompanyId;

  const serviceInvoiceIds = (
    await prisma.pOSServiceOrder.findMany({
      where: { companyId },
      select: { salesInvoiceId: true },
    })
  ).map((order) => order.salesInvoiceId);

  if (!serviceInvoiceIds.length) {
    return { data: [], total: 0, totalPages: 0 };
  }

  const where = {
    salesInvoiceId: { in: serviceInvoiceIds },
    ...(search
      ? {
          OR: [
            { paymentNumber: { contains: search, mode: "insensitive" as const } },
            { reference: { contains: search, mode: "insensitive" as const } },
            { contact: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [payments, total] = await Promise.all([
    prisma.salesPayment.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        contact: { select: { name: true } },
        salesInvoice: { select: { id: true, invoiceNumber: true } },
      },
    }),
    prisma.salesPayment.count({ where }),
  ]);

  const serviceOrders = await prisma.pOSServiceOrder.findMany({
    where: {
      companyId,
      salesInvoiceId: { in: payments.map((payment) => payment.salesInvoiceId).filter(Boolean) as string[] },
    },
    select: { id: true, salesInvoiceId: true, orderNumber: true },
  });
  const orderMap = new Map(
    serviceOrders.map((o) => [o.salesInvoiceId, { orderNumber: o.orderNumber, orderId: o.id }]),
  );

  const rows: ServicePaymentListItem[] = payments
    .filter((payment) => payment.salesInvoiceId && orderMap.has(payment.salesInvoiceId))
    .map((payment) => ({
      serviceOrderId: orderMap.get(payment.salesInvoiceId as string)?.orderId ?? "",
      salesInvoiceId: payment.salesInvoiceId as string,
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      invoiceNumber: payment.salesInvoice?.invoiceNumber ?? payment.reference ?? "-",
      orderNumber: orderMap.get(payment.salesInvoiceId as string)?.orderNumber ?? "-",
      customerName: payment.contact?.name ?? "Walk-in Customer",
      method: payment.method ?? "-",
      amount: payment.amount.toString(),
      paymentDate: payment.paymentDate,
    }));

  return {
    data: rows,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getServiceAfterSales(
  page = 1,
  pageSize = 10,
  search = "",
  status: "ALL" | "DRAFT" | "APPROVED" | "COMPLETED" | "CANCELLED" = "ALL",
  startDate?: string,
  endDate?: string,
): Promise<PagingResult<ServiceAfterSalesCaseListItem>> {
  const session = await getSession();
  assertAccess(session);
  const companyId = session.activeCompanyId;
  const where = {
    companyId,
    ...(status !== "ALL" ? { status } : {}),
    ...(startDate || endDate
      ? {
          returnDate: {
            ...(startDate ? { gte: new Date(`${startDate}T00:00:00`) } : {}),
            ...(endDate ? { lte: new Date(`${endDate}T23:59:59`) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { returnNumber: { contains: search, mode: "insensitive" as const } },
            { reason: { contains: search, mode: "insensitive" as const } },
            { notes: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [cases, total] = await Promise.all([
    prisma.salesReturn.findMany({
      where,
      orderBy: { returnDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        contact: { select: { name: true } },
      },
    }),
    prisma.salesReturn.count({ where }),
  ]);

  const serviceOrders = await prisma.pOSServiceOrder.findMany({
    where: {
      companyId,
      OR: [
        { salesOrderId: { in: cases.map((c) => c.salesOrderId).filter(Boolean) as string[] } },
        { salesInvoiceId: { in: cases.map((c) => c.salesInvoiceId).filter(Boolean) as string[] } },
      ],
    },
    select: {
      salesOrderId: true,
      salesInvoiceId: true,
      orderNumber: true,
    },
  });
  const orderBySalesOrder = new Map(serviceOrders.map((o) => [o.salesOrderId, o.orderNumber]));
  const orderByInvoice = new Map(serviceOrders.map((o) => [o.salesInvoiceId, o.orderNumber]));
  const invoices = await prisma.salesInvoice.findMany({
    where: { companyId, id: { in: cases.map((c) => c.salesInvoiceId).filter(Boolean) as string[] } },
    select: { id: true, invoiceNumber: true },
  });
  const invoiceMap = new Map(invoices.map((i) => [i.id, i.invoiceNumber]));

  const rows: ServiceAfterSalesCaseListItem[] = cases.map((item) => ({
    id: item.id,
    returnNumber: item.returnNumber,
    caseType: item.reason?.toUpperCase().includes("WARRANTY") ? "WARRANTY" : "RETURN",
    serviceOrderNumber:
      (item.salesOrderId ? orderBySalesOrder.get(item.salesOrderId) : null) ||
      (item.salesInvoiceId ? orderByInvoice.get(item.salesInvoiceId) : null) ||
      "-",
    invoiceNumber: item.salesInvoiceId ? (invoiceMap.get(item.salesInvoiceId) ?? null) : null,
    customerName: item.contact.name,
    status: String(item.status),
    totalAmount: item.totalAmount.toString(),
    returnDate: item.returnDate,
    notes: item.notes,
  }));

  return {
    data: rows,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function createServiceAfterSalesCase(input: {
  serviceOrderId: string;
  caseType: "RETURN" | "WARRANTY";
  notes?: string;
}) {
  await assertCompanyWriteAccess();
  const session = await getSession();
  assertAccess(session);
  const companyId = session.activeCompanyId;

  const order = await prisma.pOSServiceOrder.findFirst({
    where: { id: input.serviceOrderId, companyId },
    include: {
      items: true,
    },
  });
  if (!order) throw new Error("Service order not found");
  if (!order.contactId) throw new Error("Service order has no customer");
  if (!order.salesOrderId) throw new Error("Service order has no sales order");

  const salesInvoice = await prisma.salesInvoice.findFirst({
    where: { id: order.salesInvoiceId, companyId },
    select: { id: true },
  });

  const created = await SalesReturnService.create(
    {
      returnNumber: "",
      contactId: order.contactId,
      salesOrderId: order.salesOrderId,
      salesInvoiceId: salesInvoice?.id,
      returnDate: new Date(),
      reason: input.caseType,
      notes: input.notes?.trim() || undefined,
      items: order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
    },
    session!.userId,
  );

  revalidateLocalizedPath("/services/returns-warranty");
  return SuperJSON.serialize(created);
}

export async function updateServiceOrderStatus(
  orderId: string,
  status: ServiceWorkflowStatus,
) {
  await assertCompanyWriteAccess();
  const session = await getSession();
  assertAccess(session);

  const result = await POSServiceWorkflowService.transitionStatus(orderId, status, session!.userId);
  revalidateLocalizedPath("/services");
  return SuperJSON.serialize(result);
}

export async function settleServiceOrder(
  orderId: string,
  cashAccountId?: string,
  amount?: number,
  paymentMethod: ServicePaymentMethod = "CASH",
) {
  const session = await getSession();
  assertAccess(session);

  const result = await POSServiceWorkflowService.settle(
    orderId,
    cashAccountId,
    amount,
    paymentMethod,
  );
  revalidateLocalizedPath("/services");
  return SuperJSON.serialize(result);
}

export async function getServicePaymentMethods() {
  const session = await getSession();
  assertAccess(session);
  const methods = await PaymentMethodCatalogService.list(session.activeCompanyId);
  return SuperJSON.serialize(methods);
}

export async function updateServiceOrderPricing(input: {
  orderId: string;
  unitPrice: number;
  quantity?: number;
  notes?: string;
}) {
  await assertCompanyWriteAccess();
  const session = await getSession();
  assertAccess(session);

  if (input.unitPrice < 0) {
    throw new Error("Harga tidak valid");
  }

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.pOSServiceOrder.findUnique({
      where: { id: input.orderId },
      include: { items: true },
    });
    if (!order) throw new Error("Service order tidak ditemukan");
    if (["DONE", "CLOSED", "CANCELLED"].includes(order.status)) {
      throw new Error("Service order final tidak bisa diubah harga");
    }
    if (!order.items.length) throw new Error("Service order belum punya item");

    const item = order.items[0];
    const quantity = input.quantity && input.quantity > 0 ? input.quantity : item.quantity;
    const unitPrice = input.unitPrice;
    const total = unitPrice * quantity;
    const paidAmount = Number(order.paidAmount);
    const remaining = Math.max(total - paidAmount, 0);

    await tx.pOSServiceOrderItem.update({
      where: { id: item.id },
      data: {
        quantity,
        unitPrice,
        totalPrice: total,
      },
    });

    const updatedOrder = await tx.pOSServiceOrder.update({
      where: { id: order.id },
      data: {
        subtotal: total,
        totalAmount: total,
        remainingAmount: remaining,
        notes: input.notes !== undefined ? input.notes : order.notes,
      },
    });

    if (order.salesOrderId) {
      await tx.salesOrderItem.updateMany({
        where: { salesOrderId: order.salesOrderId },
        data: { quantity, unitPrice, totalPrice: total },
      });
      await tx.salesOrder.update({
        where: { id: order.salesOrderId },
        data: {
          subtotal: total,
          totalAmount: total,
          notes: input.notes !== undefined ? input.notes : undefined,
        },
      });
    }

    if (order.salesInvoiceId) {
      await tx.salesInvoiceItem.updateMany({
        where: { salesInvoiceId: order.salesInvoiceId },
        data: { quantity, unitPrice, totalPrice: total, description: item.productName || "Service" },
      });
      await tx.salesInvoice.update({
        where: { id: order.salesInvoiceId },
        data: {
          subtotal: total,
          totalAmount: total,
          balanceDue: remaining,
          notes: input.notes !== undefined ? input.notes : undefined,
        },
      });
    }

    return updatedOrder;
  });

  revalidateLocalizedPath("/services");
  return SuperJSON.serialize(result);
}

export async function getServiceOrderForEdit(orderId: string) {
  const session = await getSession();
  assertAccess(session);
  const companyId = session.activeCompanyId;

  const order = await prisma.pOSServiceOrder.findFirst({
    where: { id: orderId, companyId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!order) throw new Error("Service order tidak ditemukan");

  const [salesOrder, salesInvoice] = await Promise.all([
    prisma.salesOrder.findFirst({
      where: { id: order.salesOrderId, companyId },
      select: { id: true, orderNumber: true, status: true },
    }),
    prisma.salesInvoice.findFirst({
      where: { id: order.salesInvoiceId, companyId },
      select: { id: true, invoiceNumber: true, status: true },
    }),
  ]);

  const contact = order.contactId
    ? await prisma.contact.findFirst({
        where: { id: order.contactId, companyId },
        select: { id: true, name: true, phone: true },
      })
    : null;

  const latestPayment = await prisma.salesPayment.findFirst({
    where: {
      companyId,
      salesInvoiceId: order.salesInvoiceId,
    },
    orderBy: { paymentDate: "desc" },
    select: {
      id: true,
      paymentNumber: true,
      paymentDate: true,
      method: true,
      amount: true,
    },
  });

  return SuperJSON.serialize({
    id: order.id,
    orderNumber: order.orderNumber,
    contactId: contact?.id || null,
    customerName: contact?.name || "Walk-in Customer",
    customerPhone: contact?.phone || null,
    status: order.status,
    notes: order.notes || "",
    salesOrderId: order.salesOrderId,
    salesOrderNumber: salesOrder?.orderNumber || null,
    salesOrderStatus: salesOrder?.status || null,
    salesInvoiceId: order.salesInvoiceId,
    invoiceNumber: salesInvoice?.invoiceNumber || null,
    invoiceStatus: salesInvoice?.status || null,
    subtotal: Number(order.subtotal),
    totalAmount: Number(order.totalAmount),
    dpAmount: Number(order.dpAmount),
    paidAmount: Number(order.paidAmount),
    remainingAmount: Number(order.remainingAmount),
    latestPayment: latestPayment
      ? {
          id: latestPayment.id,
          paymentNumber: latestPayment.paymentNumber,
          paymentDate: latestPayment.paymentDate,
          method: latestPayment.method,
          amount: Number(latestPayment.amount),
        }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      notes: item.notes || "",
    })),
  });
}

export async function updateServiceOrder(input: {
  orderId: string;
  status: ServiceWorkflowStatus;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
}) {
  await assertCompanyWriteAccess();
  const session = await getSession();
  assertAccess(session);

  if (!input.items.length) throw new Error("Item service order wajib diisi");

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.pOSServiceOrder.findUnique({
      where: { id: input.orderId },
      include: { items: true },
    });
    if (!order) throw new Error("Service order tidak ditemukan");
    if (["DONE", "CLOSED", "CANCELLED"].includes(order.status)) {
      throw new Error("Service order final tidak bisa diedit");
    }

    const products = await tx.product.findMany({
      where: { id: { in: input.items.map((item) => item.productId) } },
      select: { id: true, name: true, isService: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    if (!input.items.some((item) => productMap.get(item.productId)?.isService)) {
      throw new Error("Minimal harus ada 1 item service");
    }

    const normalizedItems = input.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("Produk tidak ditemukan");
      if (item.quantity <= 0) throw new Error("Qty harus lebih dari 0");
      if (item.unitPrice < 0) throw new Error("Harga tidak valid");
      return {
        ...item,
        productName: product.name,
        totalPrice: item.quantity * item.unitPrice,
      };
    });

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const paidAmount = Number(order.paidAmount);
    const remaining = Math.max(subtotal - paidAmount, 0);

    await tx.pOSServiceOrderItem.deleteMany({ where: { posServiceOrderId: order.id } });
    await tx.pOSServiceOrderItem.createMany({
      data: normalizedItems.map((item) => ({
        posServiceOrderId: order.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: 0,
        totalPrice: item.totalPrice,
        notes: item.notes?.trim() || null,
      })),
    });

    await tx.salesOrderItem.deleteMany({ where: { salesOrderId: order.salesOrderId } });
    await tx.salesOrderItem.createMany({
      data: normalizedItems.map((item) => ({
        salesOrderId: order.salesOrderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        discountRate: 0,
      })),
    });

    await tx.salesInvoiceItem.deleteMany({ where: { salesInvoiceId: order.salesInvoiceId } });
    await tx.salesInvoiceItem.createMany({
      data: normalizedItems.map((item) => ({
        salesInvoiceId: order.salesInvoiceId,
        productId: item.productId,
        description: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        discount: 0,
        tax: 0,
      })),
    });

    await tx.salesOrder.update({
      where: { id: order.salesOrderId },
      data: {
        subtotal,
        totalAmount: subtotal,
        notes: input.notes?.trim() || null,
      },
    });

    await tx.salesInvoice.update({
      where: { id: order.salesInvoiceId },
      data: {
        subtotal,
        totalAmount: subtotal,
        balanceDue: remaining,
        notes: input.notes?.trim() || null,
      },
    });

    const updated = await tx.pOSServiceOrder.update({
      where: { id: order.id },
      data: {
        notes: input.notes?.trim() || null,
        subtotal,
        totalAmount: subtotal,
        remainingAmount: remaining,
      },
      include: { items: true },
    });

    return updated;
  });

  const currentStatus = result.status as ServiceWorkflowStatus;
  const updatedOrder =
    currentStatus !== input.status
      ? await POSServiceWorkflowService.transitionStatus(result.id, input.status, session!.userId)
      : result;

  revalidateLocalizedPath("/services");
  return SuperJSON.serialize(updatedOrder);
}

export async function getServiceNotifySettings() {
  const session = await getSession();
  assertAccess(session);
  if (!session?.activeCompanyId) {
    return SuperJSON.serialize({
      serviceTemplateCreated: "",
      serviceTemplateReady: "",
      serviceTemplateCostDone: "",
      serviceTemplatePickedUp: "",
      serviceWarrantyDuration: 0,
      serviceWarrantyUnit: "DAY",
    });
  }

  const profile = await prisma.companyProfile.findUnique({
    where: { companyId: session.activeCompanyId },
    select: {
      serviceTemplateCreated: true,
      serviceTemplateReady: true,
      serviceTemplateCostDone: true,
      serviceTemplatePickedUp: true,
      serviceWarrantyDuration: true,
      serviceWarrantyUnit: true,
    },
  });

  return SuperJSON.serialize({
    serviceTemplateCreated: profile?.serviceTemplateCreated || "",
    serviceTemplateReady: profile?.serviceTemplateReady || "",
    serviceTemplateCostDone: profile?.serviceTemplateCostDone || "",
    serviceTemplatePickedUp: profile?.serviceTemplatePickedUp || "",
    serviceWarrantyDuration: profile?.serviceWarrantyDuration || 0,
    serviceWarrantyUnit: profile?.serviceWarrantyUnit || "DAY",
  });
}
