"use server";

import { prisma } from "@/lib/prisma";
import { SuperJSON } from "@/lib/superjson";
import { revalidateLocalizedPaths } from "@/lib/revalidate-localized-path";
import {
  Prisma,
  SalesInvoiceStatus,
} from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { SalesPaymentInput } from "./types";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { PaymentMethodCatalogService } from "@/modules/cash-bank/services/payment-method-catalog.service";
import {
  enqueueIntegrationEventOnce,
  maybeProcessIntegrationOutboxEvent,
} from "@/modules/integration/outbox";

type PostSalesPaymentResult = {
  processed: boolean;
  alreadyQueued?: boolean;
  outboxId?: string;
  communicationCandidate?: {
    contactId: string;
    customerName: string;
    customerPhone: string | null;
    paymentId: string;
    paymentNumber: string;
    amount: string;
    remainingAmount: string;
  };
};

export async function getSalesPayments(
  page: number = 1,
  limit: number = 10,
  search?: string
) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "sales.view")) {
    return {
      payments: [],
      total: 0,
      totalPages: 0,
    };
  }
  if (!session.activeCompanyId) {
    return {
      payments: [],
      total: 0,
      totalPages: 0,
    };
  }

  const skip = (page - 1) * limit;
  const where: Prisma.SalesPaymentWhereInput = { companyId: session.activeCompanyId };

  if (search) {
    (where.AND as Prisma.SalesPaymentWhereInput[]).push({
      OR: [
        { paymentNumber: { contains: search, mode: "insensitive" } },
        { contact: { name: { contains: search, mode: "insensitive" } } },
        {
          salesInvoice: {
            invoiceNumber: { contains: search, mode: "insensitive" },
          },
        },
      ],
    });
  }

  const [payments, total] = await Promise.all([
    prisma.salesPayment.findMany({
      where,
      include: {
        contact: true,
        salesInvoice: true,
        cashAccount: true,
        journalEntry: true,
        attachments: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.salesPayment.count({ where }),
  ]);

  return {
    payments: SuperJSON.serialize(payments),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getSalesPayment(id: string) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "sales.view")) {
    return null;
  }
  if (!session.activeCompanyId) {
    return null;
  }

  const payment = await prisma.salesPayment.findFirst({
    where: {
      id,
      companyId: session.activeCompanyId,
    },
    include: {
      contact: true,
      salesInvoice: {
        include: {
          items: {
            include: {
              product: true,
            },
          },
          salesOrder: true,
          contact: true,
          payments: true,
        },
      },
      cashAccount: true,
      journalEntry: {
        include: {
          lines: {
            include: { account: true },
          },
        },
      },
      attachments: true,
    },
  });
  if (!payment) return null;
  return SuperJSON.serialize(payment);
}

export async function getUnpaidSalesInvoices() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "sales.view")) {
    return [];
  }
  if (!session.activeCompanyId) {
    return [];
  }

  const invoices = await prisma.salesInvoice.findMany({
    where: {
      companyId: session.activeCompanyId,
      status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
    },
    include: {
      contact: true,
      salesOrder: true,
      payments: true,
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });
  return SuperJSON.serialize(invoices);
}

export async function getCashAccounts() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "sales.view")) {
    return [];
  }
  if (!session.activeCompanyId) {
    return [];
  }

  const methods = await PaymentMethodCatalogService.list(session.activeCompanyId);
  return SuperJSON.serialize({ methods });
}

import { salesPaymentSchema } from "@/lib/validation/schemas";
import { SalesPaymentService } from "@/modules/sales/services/sales-payment.service";
import { SalesShipmentService } from "@/modules/sales/services/sales-shipment.service";
import { SalesReturnService } from "@/modules/sales/services/sales-return.service";

export const createSalesPayment = authorizedAction(
  "sales.payments",
  async (rawData: SalesPaymentInput) => {
    try {
      const parseResult = salesPaymentSchema.safeParse(rawData);
      if (!parseResult.success) {
        return { success: false, error: parseResult.error.message };
      }
      const data = parseResult.data;

      const session = await getSession();
      if (!session) throw new Error("Unauthorized");
      if (!session.activeCompanyId) throw new Error("No active company selected");

      const result = await SalesPaymentService.create(data, session.userId, session.activeCompanyId);

      revalidateLocalizedPaths(["/sales/payments", "/sales/invoices"]);
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to create Payment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create Payment",
      };
    }
  }
);

export const ensureSalesShipmentForInvoice = authorizedAction(
  "sales.edit",
  async (salesInvoiceId: string) => {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");
    if (!session.activeCompanyId) throw new Error("No active company selected");

    const invoice = await prisma.salesInvoice.findFirst({
      where: { id: salesInvoiceId, companyId: session.activeCompanyId },
      include: {
        salesOrder: {
          include: {
            items: true,
            shipments: true,
          },
        },
      },
    });

    if (!invoice) throw new Error("Invoice not found");
    if (!invoice.salesOrderId || !invoice.salesOrder) {
      throw new Error("Invoice is not linked to sales order");
    }

    if (invoice.salesOrder.shipments.length > 0) {
      return { success: true, data: { created: false, shipmentId: invoice.salesOrder.shipments[0]?.id } };
    }

    const shipment = await SalesShipmentService.create(
      {
        salesOrderId: invoice.salesOrderId,
        contactId: invoice.contactId,
        shipmentDate: new Date(),
        notes: `Auto shipment from payment flow for invoice ${invoice.invoiceNumber}`,
        items: invoice.salesOrder.items.map((item) => ({
          salesOrderItemId: item.id,
          productId: item.productId,
          quantity: item.quantity,
        })),
      },
      session.userId,
      session.activeCompanyId,
    );

    return { success: true, data: { created: true, shipmentId: shipment.id } };
  },
);

export const postSalesPayment = authorizedAction<PostSalesPaymentResult, [string]>(
  "sales.payments",
  async (id: string) => {
    try {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");
      if (!session.activeCompanyId) throw new Error("No active company selected");

      const payment = await prisma.salesPayment.findFirst({
        where: {
          id,
          companyId: session.activeCompanyId,
        },
        include: {
          salesInvoice: true,
          cashAccount: true,
        },
      });

      if (!payment) throw new Error("Payment not found");
      if (payment.journalEntryId) throw new Error("Payment already posted");
      const payload = {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        paymentDate: payment.paymentDate.toISOString(),
        amount: payment.amount.toString(),
        reference: payment.reference ?? undefined,
        notes: payment.notes ?? undefined,
        cashAccountId: payment.cashAccountId,
        contactId: payment.contactId,
        salesInvoiceId: payment.salesInvoiceId,
        userId: session.userId,
      };

      const outbox = await prisma.$transaction(async (tx) => {
        return enqueueIntegrationEventOnce(tx, {
          topic: "sales",
          type: "SALES_PAYMENT_POSTED",
          aggregateType: "SalesPayment",
          aggregateId: payment.id,
          payload,
        });
      });

      if (outbox.alreadyQueued) {
        return {
          success: true,
          data: { processed: false as const, alreadyQueued: true as const, outboxId: outbox.id },
        };
      }

      const processed = await maybeProcessIntegrationOutboxEvent(outbox.id);

      const contact = payment.contactId
        ? await prisma.contact.findFirst({
            where: { id: payment.contactId, companyId: session.activeCompanyId },
            select: { id: true, name: true, phone: true },
          })
        : null;

      revalidateLocalizedPaths([
        "/sales/payments",
        "/sales/invoices",
        `/sales/payments/${id}`,
      ]);
      return {
        success: true,
        data: {
          outboxId: outbox.id,
          ...processed,
          communicationCandidate: contact
            ? {
                contactId: contact.id,
                customerName: contact.name || "Pelanggan",
                customerPhone: contact.phone || null,
                paymentId: payment.id,
                paymentNumber: payment.paymentNumber,
                amount: payment.amount.toString(),
                remainingAmount: payment.salesInvoice.balanceDue.toString(),
              }
            : undefined,
        },
      };
    } catch (error) {
      console.error("Failed to post Payment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to post Payment",
      };
    }
  }
);

export const applyServiceWarrantyFromPayment = authorizedAction(
  "sales.payments",
  async (input: { paymentId: string; mode: "NO_WARRANTY" | "COMPANY_POLICY" }) => {
    if (input.mode === "NO_WARRANTY") {
      return { success: true, data: { created: false, reason: "NO_WARRANTY", id: null } };
    }

    const session = await getSession();
    if (!session) throw new Error("Unauthorized");
    if (!session.activeCompanyId) throw new Error("No active company selected");

    const payment = await prisma.salesPayment.findFirst({
      where: { id: input.paymentId, companyId: session.activeCompanyId },
      include: {
        salesInvoice: {
          include: {
            salesOrder: {
              include: {
                items: {
                  include: { product: true },
                },
              },
            },
            items: true,
          },
        },
      },
    });

    if (!payment) throw new Error("Payment not found");
    if (!payment.salesInvoice?.salesOrderId || !payment.salesInvoice.salesOrder) {
      return { success: true, data: { created: false, reason: "NO_SALES_ORDER", id: null } };
    }

    const isService = payment.salesInvoice.salesOrder.items.some((item) => item.product?.isService);
    if (!isService) {
      return { success: true, data: { created: false, reason: "NOT_SERVICE_ORDER", id: null } };
    }

    const existing = await prisma.salesReturn.findFirst({
      where: {
        companyId: session.activeCompanyId,
        salesOrderId: payment.salesInvoice.salesOrderId,
        salesInvoiceId: payment.salesInvoiceId,
        reason: "WARRANTY",
      },
      select: { id: true },
    });
    if (existing) {
      return { success: true, data: { created: false, reason: "ALREADY_EXISTS", id: null } };
    }

    const created = await SalesReturnService.create(
      {
        returnNumber: "",
        contactId: payment.contactId,
        salesOrderId: payment.salesInvoice.salesOrderId,
        salesInvoiceId: payment.salesInvoiceId,
        returnDate: new Date(),
        reason: "WARRANTY",
        notes: `Auto warranty case from payment ${payment.paymentNumber}`,
        items: payment.salesInvoice.items.filter((item) => !!item.productId).map((item) => ({
          productId: item.productId as string,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        })),
      },
      session.userId,
    );

    return { success: true, data: { created: true, reason: "CREATED", id: null } };
  },
);

export const deleteSalesPayment = authorizedAction(
  "sales.payments",
  async (id: string) => {
    try {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");
      if (!session.activeCompanyId) throw new Error("No active company selected");

      const payment = await prisma.salesPayment.findFirst({
        where: {
          id,
          companyId: session.activeCompanyId,
        },
        include: {
          salesInvoice: {
            include: { payments: true },
          },
        },
      });

      if (!payment) throw new Error("Payment not found");

      if (payment.journalEntryId) {
        throw new Error("Cannot delete a posted payment.");
      }

      const invoice = payment.salesInvoice;

      await prisma.$transaction(async (tx) => {
        // 1. Delete Sales Payment
        await tx.salesPayment.delete({
          where: { id },
        });

        // 2. Update Invoice Status
        const currentTotalPaid = invoice.payments.reduce(
          (sum, p) => sum + Number(p.amount),
          0
        );
        const newTotalPaid = currentTotalPaid - Number(payment.amount);

        const newStatus =
          newTotalPaid >= Number(invoice.totalAmount) - 0.01
            ? "PAID"
            : newTotalPaid > 0
              ? "PARTIALLY_PAID"
              : "ISSUED";

        await tx.salesInvoice.update({
          where: { id: invoice.id },
          data: {
            status: newStatus as SalesInvoiceStatus,
          },
        });
      });

      revalidateLocalizedPaths(["/sales/payments", "/sales/invoices"]);
      return { success: true };
    } catch (error) {
      console.error("Failed to delete Payment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete Payment",
      };
    }
  }
);

export const updateSalesPayment = authorizedAction(
  "sales.payments",
  async (id: string, rawData: SalesPaymentInput) => {
    try {
      const parseResult = salesPaymentSchema.safeParse(rawData);
      if (!parseResult.success) {
        return { success: false, error: parseResult.error.message };
      }
      const data = parseResult.data;

      const session = await getSession();
      if (!session) throw new Error("Unauthorized");
      if (!session.activeCompanyId) throw new Error("No active company selected");

      const existingPayment = await prisma.salesPayment.findFirst({
        where: {
          id,
          companyId: session.activeCompanyId,
        },
        include: { salesInvoice: { include: { payments: true } } },
      });

      if (!existingPayment) throw new Error("Payment not found");
      if (existingPayment.journalEntryId) throw new Error("Cannot edit a posted payment");

      // Check if invoice is changing (usually not allowed in UI but good to check)
      if (data.salesInvoiceId !== existingPayment.salesInvoiceId) {
        throw new Error("Cannot change invoice for existing payment");
      }

      const invoice = existingPayment.salesInvoice;

      // Calculate new totals
      // Remove old amount from invoice payments calculation
      const otherPaymentsTotal = invoice.payments
        .filter(p => p.id !== id)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const remaining = Number(invoice.totalAmount) - otherPaymentsTotal;

      if (data.amount > remaining + 0.01) {
        throw new Error(`Amount exceeds remaining balance of ${remaining}`);
      }

      await prisma.$transaction(async (tx) => {
        // Update Payment
        await tx.salesPayment.update({
          where: { id },
          data: {
            paymentDate: data.paymentDate,
            amount: data.amount,
            reference: data.reference,
            notes: data.notes,
            method: data.method,
            cashAccountId: data.cashAccountId,
            attachments: {
              set: data.attachmentIds?.map((id) => ({ id })),
            },
          },
        });

        // Update Invoice Status
        const newTotalPaid = otherPaymentsTotal + Number(data.amount);
        const newStatus =
          newTotalPaid >= Number(invoice.totalAmount) - 0.01
            ? "PAID"
            : "PARTIALLY_PAID";

        await tx.salesInvoice.update({
          where: { id: invoice.id },
          data: {
            status: newStatus,
          },
        });
      });

      revalidateLocalizedPaths([
        "/sales/payments",
        "/sales/invoices",
        `/sales/payments/${id}`,
      ]);
      return { success: true };
    } catch (error) {
      console.error("Failed to update Payment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update Payment",
      };
    }
  }
);
