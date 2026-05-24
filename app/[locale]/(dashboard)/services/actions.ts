"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { SuperJSON } from "@/lib/superjson";
import { revalidatePath } from "next/cache";
import {
  POSServiceWorkflowService,
  type ServicePaymentMethod,
  type ServiceWorkflowStatus,
} from "@/modules/services/services/pos-service-workflow.service";
import type {
  ServiceAfterSalesCaseListItem,
  ServiceInvoiceListItem,
  ServiceOrderListItem,
  ServicePaymentListItem,
} from "./types";
import { SalesReturnService } from "@/modules/sales/services/sales-return.service";

type PagingResult<T> = {
  data: T[];
  total: number;
  totalPages: number;
};

function assertAccess(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session?.userId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }
}

export async function getServiceOrders(
  page = 1,
  pageSize = 10,
  search = "",
  status: ServiceWorkflowStatus | "ALL" = "ALL",
): Promise<PagingResult<ServiceOrderListItem>> {
  const session = await getSession();
  assertAccess(session);

  const where = {
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
          select: { quantity: true },
          take: 1,
        },
      },
    }),
    prisma.pOSServiceOrder.count({ where }),
  ]);
  const contacts = await prisma.contact.findMany({
    where: { id: { in: orders.map((o) => o.contactId).filter(Boolean) as string[] } },
    select: { id: true, name: true, phone: true },
  });
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  const invoices = await prisma.salesInvoice.findMany({
    where: { id: { in: orders.map((o) => o.salesInvoiceId) } },
    select: { id: true, invoiceNumber: true },
  });
  const invoiceMap = new Map(invoices.map((i) => [i.id, i.invoiceNumber]));

  const rows: ServiceOrderListItem[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    salesOrderId: order.salesOrderId,
    salesInvoiceId: order.salesInvoiceId,
    status: order.status as ServiceOrderListItem["status"],
    customerName: order.contactId ? (contactMap.get(order.contactId)?.name ?? "Walk-in Customer") : "Walk-in Customer",
    customerPhone: order.contactId ? (contactMap.get(order.contactId)?.phone ?? null) : null,
    invoiceNumber: invoiceMap.get(order.salesInvoiceId) ?? null,
    quantity: order.items[0]?.quantity ?? 1,
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

  const where = {
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
    where: { id: { in: orders.map((o) => o.contactId).filter(Boolean) as string[] } },
    select: { id: true, name: true },
  });
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  const invoices = await prisma.salesInvoice.findMany({
    where: { id: { in: orders.map((o) => o.salesInvoiceId) } },
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

  const where = {
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
    where: { salesInvoiceId: { in: payments.map((payment) => payment.salesInvoiceId).filter(Boolean) as string[] } },
    select: { salesInvoiceId: true, orderNumber: true },
  });
  const orderMap = new Map(serviceOrders.map((o) => [o.salesInvoiceId, o.orderNumber]));

  const rows: ServicePaymentListItem[] = payments
    .filter((payment) => payment.salesInvoiceId && orderMap.has(payment.salesInvoiceId))
    .map((payment) => ({
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      invoiceNumber: payment.salesInvoice?.invoiceNumber ?? payment.reference ?? "-",
      orderNumber: orderMap.get(payment.salesInvoiceId as string) ?? "-",
      customerName: payment.contact?.name ?? "Walk-in Customer",
      method: payment.method ?? "-",
      amount: payment.amount.toString(),
      paymentDate: payment.paymentDate,
    }));

  return {
    data: rows,
    total: rows.length,
    totalPages: Math.ceil(rows.length / pageSize) || 1,
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
  const where = {
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
    where: { id: { in: cases.map((c) => c.salesInvoiceId).filter(Boolean) as string[] } },
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
  const session = await getSession();
  assertAccess(session);

  const order = await prisma.pOSServiceOrder.findUnique({
    where: { id: input.serviceOrderId },
    include: {
      items: true,
    },
  });
  if (!order) throw new Error("Service order not found");
  if (!order.contactId) throw new Error("Service order has no customer");
  if (!order.salesOrderId) throw new Error("Service order has no sales order");

  const salesInvoice = await prisma.salesInvoice.findUnique({
    where: { id: order.salesInvoiceId },
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

  revalidatePath("/services/returns-warranty");
  return SuperJSON.serialize(created);
}

export async function updateServiceOrderStatus(
  orderId: string,
  status: ServiceWorkflowStatus,
) {
  const session = await getSession();
  assertAccess(session);

  const result = await POSServiceWorkflowService.transitionStatus(orderId, status, session!.userId);
  revalidatePath("/services");
  return SuperJSON.serialize(result);
}

export async function settleServiceOrder(
  orderId: string,
  paymentMethod: ServicePaymentMethod,
  amount?: number,
) {
  const session = await getSession();
  assertAccess(session);

  const result = await POSServiceWorkflowService.settle(orderId, paymentMethod, amount);
  revalidatePath("/services");
  return SuperJSON.serialize(result);
}

export async function updateServiceOrderPricing(input: {
  orderId: string;
  unitPrice: number;
  quantity?: number;
  notes?: string;
}) {
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

  revalidatePath("/services");
  return SuperJSON.serialize(result);
}
