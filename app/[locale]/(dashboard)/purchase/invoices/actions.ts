"use server";

import { prisma } from "@/lib/prisma";
import { SuperJSON } from "@/lib/superjson";
import { revalidateLocalizedPath } from "@/lib/revalidate-localized-path";
import {
  Prisma,
  PurchaseInvoiceStatus,
} from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { PurchaseInvoiceInput } from "./types";
import { getPurchaseOrder } from "../orders/actions";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import {
  enqueueIntegrationEventOnce,
  maybeProcessIntegrationOutboxEvent,
} from "@/modules/integration/outbox";
import { PurchaseInvoiceService } from "@/modules/purchase/services/purchase-invoice.service";

type PostPurchaseInvoiceResult = {
  processed: boolean;
  alreadyQueued?: boolean;
  outboxId?: string;
};

export { getPurchaseOrder };

export async function getPurchaseInvoices(
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "purchase.view")) {
    return {
      invoices: [],
      total: 0,
      totalPages: 0,
    };
  }
  if (!session.activeCompanyId) {
    return {
      invoices: [],
      total: 0,
      totalPages: 0,
    };
  }

  const skip = (page - 1) * limit;
  const where: Prisma.PurchaseInvoiceWhereInput = {
    AND: [{ companyId: session.activeCompanyId }],
  };

  if (status && status !== "ALL") {
    (where.AND as unknown as Prisma.PurchaseInvoiceWhereInput[]).push({
      status: status as unknown as PurchaseInvoiceStatus,
    });
  }

  if (search) {
    (where.AND as unknown as Prisma.PurchaseInvoiceWhereInput[]).push({
      OR: [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { contact: { name: { contains: search, mode: "insensitive" } } },
        {
          purchaseOrder: {
            orderNumber: { contains: search, mode: "insensitive" },
          },
        },
      ],
    });
  }

  const [invoices, total] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      where,
      include: {
        contact: true,
        purchaseOrder: true,
        department: true,
        project: true,
        items: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.purchaseInvoice.count({ where }),
  ]);

  return {
    invoices: SuperJSON.serialize(invoices),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getPurchaseInvoice(id: string) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "purchase.view")) {
    return null;
  }
  if (!session.activeCompanyId) {
    return null;
  }

  const invoice = await prisma.purchaseInvoice.findFirst({
    where: { id, companyId: session.activeCompanyId },
    include: {
      contact: true,
      purchaseOrder: true,
      department: true,
      project: true,
      items: true,
      attachments: true,
    },
  });

  return SuperJSON.serialize(invoice);
}

export async function getPurchaseOrdersForSelect() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "purchase.view")) {
    return SuperJSON.serialize([]);
  }
  if (!session.activeCompanyId) {
    return SuperJSON.serialize([]);
  }

  const orders = await prisma.purchaseOrder.findMany({
    where: {
      companyId: session.activeCompanyId,
      // Invoices can be created for any active PO ideally, but usually Issued/Received.
      status: { in: ["ISSUED", "PARTIALLY_RECEIVED", "CLOSED"] },
      invoices: {
        none: {},
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      contact: true,
      invoices: {
        select: {
          id: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
  });
  return SuperJSON.serialize(orders);
}

import { purchaseInvoiceSchema } from "@/lib/validation/schemas";

export const createPurchaseInvoice = authorizedAction(
   "purchase.create",
   async (rawData: PurchaseInvoiceInput) => {
     try {
       const session = await getSession();
       if (!session) throw new Error("Unauthorized");
       if (!session.activeCompanyId) throw new Error("No active company selected");

       const parseResult = purchaseInvoiceSchema.safeParse(rawData);
       if (!parseResult.success) {
         return { success: false, error: parseResult.error.message };
       }

       const result = await PurchaseInvoiceService.create(parseResult.data, session.userId, session.activeCompanyId);

       revalidateLocalizedPath("/purchase/invoices");
       return { success: true, data: SuperJSON.serialize(result) };
     } catch (error) {
       console.error("Failed to create Invoice:", error);
       return { success: false, error: error instanceof Error ? error.message : "Failed to create Purchase Invoice" };
     }
   },
 );

export const updatePurchaseInvoice = authorizedAction(
  "purchase.edit",
  async (id: string, rawData: PurchaseInvoiceInput) => {
    try {
      const parseResult = purchaseInvoiceSchema.safeParse(rawData);
      if (!parseResult.success) {
        return { success: false, error: parseResult.error.message };
      }
      const data = parseResult.data;

      const session = await getSession();
      if (!session?.activeCompanyId) throw new Error("No active company selected");

      const result = await PurchaseInvoiceService.update(id, data, session.activeCompanyId);

      revalidateLocalizedPath("/purchase/invoices");
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to update Invoice:", error);
      return { success: false, error: error instanceof Error ? error.message : "Failed to update Purchase Invoice" };
    }
  },
);

export const deletePurchaseInvoice = authorizedAction(
  "purchase.delete",
  async (id: string) => {
    try {
      const session = await getSession();
      if (!session?.activeCompanyId) throw new Error("No active company selected");

      await PurchaseInvoiceService.delete(id, session.activeCompanyId);

      revalidateLocalizedPath("/purchase/invoices");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete Invoice:", error);
      return { success: false, error: error instanceof Error ? error.message : "Failed to delete Purchase Invoice" };
    }
  },
);

export const postPurchaseInvoice = authorizedAction<PostPurchaseInvoiceResult, [string]>(
  "purchase.edit",
  async (id: string) => {
    try {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");
      if (!session.activeCompanyId) throw new Error("No active company selected");

      const invoice = await prisma.purchaseInvoice.findFirst({
        where: { id, companyId: session.activeCompanyId },
        include: { items: true },
      });

      if (!invoice) throw new Error("Invoice not found");
      if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be posted");
      if (invoice.journalEntryId) throw new Error("Invoice already posted");
      const payload = {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate.toISOString(),
        contactId: invoice.contactId,
        userId: session.userId,
        totalAmount: invoice.totalAmount.toString(),
        globalDiscount: invoice.globalDiscount?.toString(),
        shippingCost: invoice.shippingCost?.toString(),
        handlingCost: invoice.handlingCost?.toString(),
        items: invoice.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          discount: item.discount?.toString(),
          tax: item.tax?.toString(),
          accountId: item.accountId ?? undefined,
        })),
      };

      const outbox = await prisma.$transaction(async (tx) => {
        return enqueueIntegrationEventOnce(tx, {
          topic: "purchase",
          type: "PURCHASE_INVOICE_BILLED",
          aggregateType: "PurchaseInvoice",
          aggregateId: invoice.id,
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

      revalidateLocalizedPath("/purchase/invoices");
      revalidateLocalizedPath(`/purchase/invoices/${id}`);
      return { success: true, data: { outboxId: outbox.id, ...processed } };
    } catch (error) {
      console.error("Failed to post Invoice:", error);
      return { success: false, error: error instanceof Error ? error.message : "Failed to post Purchase Invoice" };
    }
  },
);
