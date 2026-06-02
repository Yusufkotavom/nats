"use server";

import { getSession } from "@/lib/auth/auth";
import { revalidateLocalizedPath } from "@/lib/revalidate-localized-path";
import { prisma } from "@/lib/prisma";
import {
  CreateContactInput,
  UpdateContactInput,
  PaginatedResult,
  Contact,
} from "../types";
import { Prisma, ContactType } from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { SuperJSON } from "@/lib/superjson";
import { getTranslations } from "next-intl/server";

export async function getContact(id: string) {
  const contact = await prisma.contact.findUnique({
    where: { id },
  });
  return contact;
}

export async function getContactMessagingContext(contactId: string) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      type: true,
    },
  });

  if (!contact) return null;

  const [
    latestInvoice,
    latestSalesOrder,
    latestServiceOrder,
    recentWhatsAppLogs,
    salesOrders,
    salesInvoices,
    salesPayments,
    serviceOrders,
    cashTransactions,
    purchaseOrders,
    purchaseInvoices,
    purchasePayments,
  ] = await Promise.all([
    prisma.salesInvoice.findFirst({
      where: { contactId },
      include: {
        items: {
          select: {
            description: true,
            product: { select: { name: true } },
            quantity: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.salesOrder.findFirst({
      where: { contactId },
      include: {
        items: {
          select: {
            product: { select: { name: true } },
            quantity: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.pOSServiceOrder.findFirst({
      where: { contactId },
      include: {
        items: {
          select: {
            productName: true,
            quantity: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contactCommunicationLog.findMany({
      where: {
        contactId,
        channel: "WHATSAPP",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.salesOrder.findMany({
      where: { contactId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderDate: true,
        totalAmount: true,
        notes: true,
      },
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.salesInvoice.findMany({
      where: { contactId },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        invoiceDate: true,
        totalAmount: true,
        balanceDue: true,
        notes: true,
      },
      orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.salesPayment.findMany({
      where: { contactId },
      select: {
        id: true,
        paymentNumber: true,
        paymentDate: true,
        amount: true,
        method: true,
        notes: true,
        salesInvoice: {
          select: {
            invoiceNumber: true,
          },
        },
        cashAccount: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.pOSServiceOrder.findMany({
      where: { contactId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        targetDate: true,
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true,
        notes: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.cashTransaction.findMany({
      where: { contactId },
      select: {
        id: true,
        type: true,
        status: true,
        date: true,
        reference: true,
        description: true,
        note: true,
        cashAccount: {
          select: {
            name: true,
          },
        },
        allocations: {
          select: {
            amount: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.purchaseOrder.findMany({
      where: { contactId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderDate: true,
        totalAmount: true,
        notes: true,
      },
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.purchaseInvoice.findMany({
      where: { contactId },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        invoiceDate: true,
        totalAmount: true,
        notes: true,
      },
      orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.purchasePayment.findMany({
      where: { contactId },
      select: {
        id: true,
        paymentNumber: true,
        paymentDate: true,
        amount: true,
        notes: true,
        purchaseInvoice: {
          select: {
            invoiceNumber: true,
          },
        },
        cashAccount: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
  ]);

  const transactionHistory = [
    ...salesOrders.map((order) => ({
      id: `sales-order-${order.id}`,
      area: "Sales",
      type: "Sales Order",
      documentNumber: order.orderNumber,
      status: order.status,
      amount: Number(order.totalAmount || 0),
      balanceDue: null as number | null,
      happenedAt: order.orderDate,
      detail: order.notes || "-",
      href: `/sales/orders/${order.id}`,
    })),
    ...salesInvoices.map((invoice) => ({
      id: `sales-invoice-${invoice.id}`,
      area: "Sales",
      type: "Sales Invoice",
      documentNumber: invoice.invoiceNumber,
      status: invoice.status,
      amount: Number(invoice.totalAmount || 0),
      balanceDue: Number(invoice.balanceDue || 0),
      happenedAt: invoice.invoiceDate,
      detail: invoice.notes || "-",
      href: `/sales/invoices/${invoice.id}`,
    })),
    ...salesPayments.map((payment) => ({
      id: `sales-payment-${payment.id}`,
      area: "Sales",
      type: "Sales Payment",
      documentNumber: payment.paymentNumber,
      status: "POSTED",
      amount: Number(payment.amount || 0),
      balanceDue: null as number | null,
      happenedAt: payment.paymentDate,
      detail: [
        payment.salesInvoice?.invoiceNumber
          ? `Invoice ${payment.salesInvoice.invoiceNumber}`
          : null,
        payment.cashAccount?.name || null,
        payment.method || null,
        payment.notes || null,
      ]
        .filter(Boolean)
        .join(" • ") || "-",
      href: `/sales/payments/${payment.id}`,
    })),
    ...serviceOrders.map((order) => ({
      id: `service-order-${order.id}`,
      area: "Service",
      type: "Service Order",
      documentNumber: order.orderNumber,
      status: order.status,
      amount: Number(order.totalAmount || 0),
      balanceDue: Number(order.remainingAmount || 0),
      happenedAt: order.createdAt,
      detail: [
        order.targetDate
          ? `Target ${order.targetDate.toISOString().slice(0, 10)}`
          : null,
        order.notes || null,
      ]
        .filter(Boolean)
        .join(" • ") || "-",
      href: null as string | null,
    })),
    ...cashTransactions.map((transaction) => ({
      id: `cash-transaction-${transaction.id}`,
      area: "Cash",
      type: transaction.type === "INCOME" ? "Cash Income" : "Cash Expense",
      documentNumber: transaction.reference || transaction.id,
      status: transaction.status,
      amount: transaction.allocations.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      ),
      balanceDue: null as number | null,
      happenedAt: transaction.date,
      detail: [
        transaction.cashAccount?.name || null,
        transaction.description || null,
        transaction.note || null,
      ]
        .filter(Boolean)
        .join(" • ") || "-",
      href: null as string | null,
    })),
    ...purchaseOrders.map((order) => ({
      id: `purchase-order-${order.id}`,
      area: "Purchase",
      type: "Purchase Order",
      documentNumber: order.orderNumber,
      status: order.status,
      amount: Number(order.totalAmount || 0),
      balanceDue: null as number | null,
      happenedAt: order.orderDate,
      detail: order.notes || "-",
      href: `/purchase/orders/${order.id}`,
    })),
    ...purchaseInvoices.map((invoice) => ({
      id: `purchase-invoice-${invoice.id}`,
      area: "Purchase",
      type: "Purchase Invoice",
      documentNumber: invoice.invoiceNumber,
      status: invoice.status,
      amount: Number(invoice.totalAmount || 0),
      balanceDue: null as number | null,
      happenedAt: invoice.invoiceDate,
      detail: invoice.notes || "-",
      href: `/purchase/invoices/${invoice.id}`,
    })),
    ...purchasePayments.map((payment) => ({
      id: `purchase-payment-${payment.id}`,
      area: "Purchase",
      type: "Purchase Payment",
      documentNumber: payment.paymentNumber,
      status: "POSTED",
      amount: Number(payment.amount || 0),
      balanceDue: null as number | null,
      happenedAt: payment.paymentDate,
      detail: [
        payment.purchaseInvoice?.invoiceNumber
          ? `Invoice ${payment.purchaseInvoice.invoiceNumber}`
          : null,
        payment.cashAccount?.name || null,
        payment.notes || null,
      ]
        .filter(Boolean)
        .join(" • ") || "-",
      href: `/purchase/payments/${payment.id}`,
    })),
  ].sort(
    (a, b) => b.happenedAt.getTime() - a.happenedAt.getTime(),
  );

  const totalSalesInvoiced = salesInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.totalAmount || 0),
    0,
  );
  const totalSalesPaid = salesPayments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );
  const outstandingBalance = salesInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.balanceDue || 0),
    0,
  );

  return {
    contact,
    summary: {
      totalTransactions: transactionHistory.length,
      totalSalesInvoiced,
      totalSalesPaid,
      outstandingBalance,
      lastTransactionAt: transactionHistory[0]?.happenedAt ?? null,
    },
    transactionHistory,
    latestInvoice: latestInvoice
      ? {
          id: latestInvoice.id,
          invoiceNumber: latestInvoice.invoiceNumber,
          status: latestInvoice.status,
          invoiceDate: latestInvoice.invoiceDate,
          totalAmount: Number(latestInvoice.totalAmount),
          balanceDue: Number(latestInvoice.balanceDue),
          items: latestInvoice.items.map((item) => ({
            name: item.product?.name || item.description,
            quantity: Number(item.quantity || 0),
          })),
        }
      : null,
    latestSalesOrder: latestSalesOrder
      ? {
          id: latestSalesOrder.id,
          orderNumber: latestSalesOrder.orderNumber,
          status: latestSalesOrder.status,
          orderDate: latestSalesOrder.orderDate,
          items: latestSalesOrder.items.map((item) => ({
            name: item.product?.name || "-",
            quantity: Number(item.quantity || 0),
          })),
        }
      : null,
    latestServiceOrder: latestServiceOrder
      ? {
          id: latestServiceOrder.id,
          orderNumber: latestServiceOrder.orderNumber,
          status: latestServiceOrder.status,
          targetDate: latestServiceOrder.targetDate,
          items: latestServiceOrder.items.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
          })),
        }
      : null,
    recentWhatsAppLogs: recentWhatsAppLogs.map((log) => ({
      id: log.id,
      channel: log.channel,
      eventType: log.eventType,
      status: log.status,
      sourceType: log.sourceType,
      sourceId: log.sourceId,
      target: log.target,
      message: log.message,
      providerMessageId: log.providerMessageId,
      documentLinks: Array.isArray(log.documentLinks) ? log.documentLinks : [],
      queuedAt: log.queuedAt,
      sentAt: log.sentAt,
      deliveredAt: log.deliveredAt,
      readAt: log.readAt,
      createdAt: log.createdAt,
    })),
  };
}

export async function getContactCashTransactions({
  contactId,
  page = 1,
  pageSize = 10,
}: {
  contactId: string;
  page?: number;
  pageSize?: number;
}) {
  const skip = (page - 1) * pageSize;
  const where: Prisma.CashTransactionWhereInput = {
    contactId,
  };

  const [data, total] = await Promise.all([
    prisma.cashTransaction.findMany({
      where,
      include: {
        cashAccount: true,
        allocations: {
          include: {
            account: true,
          },
        },
      },
      orderBy: { date: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.cashTransaction.count({ where }),
  ]);

  return {
    data: SuperJSON.serialize(data),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getContactPurchaseOrders({
  contactId,
  page = 1,
  pageSize = 10,
}: {
  contactId: string;
  page?: number;
  pageSize?: number;
}) {
  const skip = (page - 1) * pageSize;
  const where: Prisma.PurchaseOrderWhereInput = {
    contactId,
  };

  const [data, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      orderBy: { orderDate: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return {
    data: SuperJSON.serialize(data),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getContactPurchaseInvoices({
  contactId,
  page = 1,
  pageSize = 10,
}: {
  contactId: string;
  page?: number;
  pageSize?: number;
}) {
  const skip = (page - 1) * pageSize;
  const where: Prisma.PurchaseInvoiceWhereInput = {
    contactId,
  };

  const [data, total] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      where,
      orderBy: { invoiceDate: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.purchaseInvoice.count({ where }),
  ]);

  return {
    data: SuperJSON.serialize(data),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getContactPurchasePayments({
  contactId,
  page = 1,
  pageSize = 10,
}: {
  contactId: string;
  page?: number;
  pageSize?: number;
}) {
  const skip = (page - 1) * pageSize;
  const where: Prisma.PurchasePaymentWhereInput = {
    contactId,
  };

  const [data, total] = await Promise.all([
    prisma.purchasePayment.findMany({
      where,
      include: {
        purchaseInvoice: true,
        cashAccount: true,
      },
      orderBy: { paymentDate: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.purchasePayment.count({ where }),
  ]);

  return {
    data: SuperJSON.serialize(data),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getContactSalesOrders({
  contactId,
  page = 1,
  pageSize = 10,
}: {
  contactId: string;
  page?: number;
  pageSize?: number;
}) {
  const skip = (page - 1) * pageSize;
  const where: Prisma.SalesOrderWhereInput = {
    contactId,
  };

  const [data, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      orderBy: { orderDate: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.salesOrder.count({ where }),
  ]);

  return {
    data: SuperJSON.serialize(data),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getContactSalesInvoices({
  contactId,
  page = 1,
  pageSize = 10,
}: {
  contactId: string;
  page?: number;
  pageSize?: number;
}) {
  const skip = (page - 1) * pageSize;
  const where: Prisma.SalesInvoiceWhereInput = {
    contactId,
  };

  const [data, total] = await Promise.all([
    prisma.salesInvoice.findMany({
      where,
      orderBy: { invoiceDate: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.salesInvoice.count({ where }),
  ]);

  return {
    data: SuperJSON.serialize(data),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getContactSalesPayments({
  contactId,
  page = 1,
  pageSize = 10,
}: {
  contactId: string;
  page?: number;
  pageSize?: number;
}) {
  const skip = (page - 1) * pageSize;
  const where: Prisma.SalesPaymentWhereInput = {
    contactId,
  };

  const [data, total] = await Promise.all([
    prisma.salesPayment.findMany({
      where,
      include: {
        salesInvoice: true,
        cashAccount: true,
      },
      orderBy: { paymentDate: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.salesPayment.count({ where }),
  ]);

  return {
    data: SuperJSON.serialize(data),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getContactJournalEntries({
  contactId,
  page = 1,
  pageSize = 10,
}: {
  contactId: string;
  page?: number;
  pageSize?: number;
}) {
  const skip = (page - 1) * pageSize;
  const where: Prisma.JournalEntryWhereInput = {
    lines: {
      some: {
        contactId,
      },
    },
  };

  const [data, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
      orderBy: { transactionDate: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.journalEntry.count({ where }),
  ]);

  return {
    data: SuperJSON.serialize(data),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Fetch contacts with pagination and search.
 *
 * @param page     - Page number (default: 1)
 * @param pageSize - Items per page (default: 10)
 * @param search   - Search term for name, email, or phone
 * @param type     - Optional filter by contact type
 * @returns        - Object containing contacts list and pagination metadata
 */
export async function getContacts({
  page = 1,
  pageSize = 20,
  search = "",
  type,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: ContactType;
} = {}): Promise<PaginatedResult<Contact>> {
  const skip = (page - 1) * pageSize;

  const where: Prisma.ContactWhereInput = {
    ...(type ? { type } : {}),
    ...(search
      ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.contact.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export const createContact = authorizedAction(
  "contacts.create",
  async (data: CreateContactInput) => {
    try {
      const session = await getSession();
      const contact = await prisma.contact.create({
        data: {
          ...data,
          companyId: session?.activeCompanyId ?? null,
        },
      });
      revalidateLocalizedPath("/general/contacts");
      return { success: true, contact };
    } catch (error) {
      console.error("Failed to create contact:", error);
      const t = await getTranslations("General.Contacts");
      return { success: false, error: t("create_error") };
    }
  }
);

export const updateContact = authorizedAction(
  "contacts.edit",
  async (id: string, data: UpdateContactInput) => {
    try {
      const contact = await prisma.contact.update({
        where: { id },
        data,
      });
      revalidateLocalizedPath("/general/contacts");
      return { success: true, contact };
    } catch (error) {
      console.error("Failed to update contact:", error);
      const t = await getTranslations("General.Contacts");
      return { success: false, error: t("update_error") };
    }
  }
);

export const deleteContact = authorizedAction(
  "contacts.delete",
  async (id: string) => {
    try {
      const session = await getSession();
      const currentContact = await prisma.contact.findUnique({ where: { id } });
      if (!currentContact || currentContact.companyId !== session?.activeCompanyId) {
        return { success: false, error: "Not found or unauthorized" };
      }
      await prisma.contact.delete({
        where: { id },
      });
      revalidateLocalizedPath("/general/contacts");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete contact:", error);
      const t = await getTranslations("General.Contacts");
      return { success: false, error: t("delete_error") };
    }
  }
);
