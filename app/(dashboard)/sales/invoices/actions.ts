"use server";

import { prisma } from "@/lib/prisma";
import { SuperJSON } from "@/lib/superjson";
import { revalidatePath } from "next/cache";
import {
  Prisma,
  SalesInvoiceStatus,
} from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { SalesInvoiceInput } from "./types";
import { getSalesOrder } from "../orders/actions";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { CalculationService } from "@/lib/utils/calculation-service";
import {
  enqueueIntegrationEventOnce,
  maybeProcessIntegrationOutboxEvent,
} from "@/modules/integration/outbox";

type PostSalesInvoiceResult = {
  processed: boolean;
  alreadyQueued?: boolean;
  outboxId?: string;
};

export { getSalesOrder };

export async function getSalesInvoices(
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "sales.view")) {
    return {
      invoices: [],
      total: 0,
      totalPages: 0,
    };
  }

  const skip = (page - 1) * limit;
  const where: Prisma.SalesInvoiceWhereInput = {
    AND: [],
  };

  if (status && status !== "ALL") {
    (where.AND as unknown as Prisma.SalesInvoiceWhereInput[]).push({
      status: status as unknown as SalesInvoiceStatus,
    });
  }

  if (search) {
    (where.AND as unknown as Prisma.SalesInvoiceWhereInput[]).push({
      OR: [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { contact: { name: { contains: search, mode: "insensitive" } } },
        {
          salesOrder: {
            orderNumber: { contains: search, mode: "insensitive" },
          },
        },
      ],
    });
  }

  const [invoices, total] = await Promise.all([
    prisma.salesInvoice.findMany({
      where,
      include: {
        contact: true,
        salesOrder: true,
        department: true,
        project: true,
        items: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.salesInvoice.count({ where }),
  ]);

  return {
    invoices: SuperJSON.serialize(invoices),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getSalesInvoice(id: string) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "sales.view")) {
    return null;
  }

  const invoice = await prisma.salesInvoice.findUnique({
    where: { id },
    include: {
      contact: true,
      salesOrder: true,
      department: true,
      project: true,
      items: true,
      attachments: true,
    },
  });

  return SuperJSON.serialize(invoice);
}

export async function getSalesOrdersForSelect() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "sales.view")) {
    return SuperJSON.serialize([]);
  }

  const orders = await prisma.salesOrder.findMany({
    where: {
      status: { in: ["CONFIRMED", "SHIPPED", "PARTIALLY_SHIPPED", "CLOSED"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      contact: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });
  return SuperJSON.serialize(orders);
}

// Helper to generate Invoice Number
async function generateInvoiceNumber() {
  const count = await prisma.salesInvoice.count();
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const sequence = (count + 1).toString().padStart(4, "0");
  return `INV-${year}${month}-${sequence}`;
}

import { salesInvoiceSchema } from "@/lib/validation/schemas";

export const createSalesInvoice = authorizedAction(
  "sales.create",
  async (rawData: SalesInvoiceInput) => {
    try {
      const parseResult = salesInvoiceSchema.safeParse(rawData);
      if (!parseResult.success) {
        return { success: false, error: parseResult.error.message };
      }
      const data = parseResult.data;

      // Generate Invoice Number if not provided or if auto-generated logic is preferred
      // For now, assume user might provide it or we generate it. 
      // Purchase module allowed user input, but Sales usually auto-generates.
      // Let's use the provided one or generate if empty.

      let invoiceNumber = data.invoiceNumber;
      if (!invoiceNumber) {
        invoiceNumber = await generateInvoiceNumber();
      }

      // Check for duplicate invoice number
      const existing = await prisma.salesInvoice.findUnique({
        where: {
          invoiceNumber: invoiceNumber
        },
      });

      if (existing) {
        return {
          success: false,
          error: "Invoice number already exists",
        };
      }

      // Fetch tax rates
      const taxRates = await prisma.taxRate.findMany();

      const itemsToCreate = data.items.map((item) => {
        // Resolve tax rate if ID provided
        let taxRateSnapshot: number | undefined = undefined;
        const taxAmount = item.tax || 0;

        if (item.taxRateId) {
          const rateObj = taxRates.find(r => r.id === item.taxRateId);
          if (rateObj) {
            taxRateSnapshot = Number(rateObj.rate);
            // Re-calculate tax using service to ensure consistency
            // Note: Service expects tax amount in input for fixed tax, or rate for calculation.
            // But here we want to calculate based on rate if present.
          }
        }

        const calculated = CalculationService.calculateLineItem(
          {
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            tax: taxAmount,
          },
          taxRateSnapshot
        );

        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: calculated.total.toNumber(), // Prisma expects number/Decimal
          discount: item.discount,
          tax: calculated.taxAmount.toNumber(),
          taxRateId: item.taxRateId,
          taxRateSnapshot: taxRateSnapshot,
          productId: item.productId,
          accountId: item.accountId,
          // Internal fields for totals calculation later
          _calculated: calculated
        };
      });

      const totals = CalculationService.calculateInvoiceTotals(
        itemsToCreate.map(i => i._calculated),
        data.globalDiscount,
        data.shippingCost
      );

      // Remove internal field before creating
      const itemsData = itemsToCreate.map(({ _calculated, ...rest }) => rest);

      const result = await prisma.salesInvoice.create({
        data: {
          invoiceNumber: invoiceNumber,
          contactId: data.contactId,
          salesOrderId: data.salesOrderId,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          notes: data.notes,
          status: "DRAFT", // Default to DRAFT
          totalAmount: totals.totalAmount.toNumber(),
          globalDiscount: data.globalDiscount,
          totalTax: totals.totalTax.toNumber(),
          shippingCost: data.shippingCost,
          departmentId: data.departmentId,
          projectId: data.projectId,
          items: {
            create: itemsData,
          },
          attachments: {
            connect: data.attachmentIds?.map((id) => ({ id })) || [],
          },
        },
        include: {
          items: true,
        },
      });

      revalidatePath("/sales/invoices");
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to create Invoice:", error);
      return { success: false, error: "Failed to create Sales Invoice" };
    }
  },
);

export const updateSalesInvoice = authorizedAction(
  "sales.edit",
  async (id: string, rawData: SalesInvoiceInput) => {
    try {
      const parseResult = salesInvoiceSchema.safeParse(rawData);
      if (!parseResult.success) {
        return { success: false, error: parseResult.error.message };
      }
      const data = parseResult.data;

      const currentInvoice = await prisma.salesInvoice.findUnique({
        where: { id },
      });

      if (!currentInvoice) throw new Error("Invoice not found");

      if (
        currentInvoice.status === "PAID" ||
        currentInvoice.status === "CANCELLED"
      ) {
        return {
          success: false,
          error: "Cannot edit paid or canceled invoice",
        };
      }

      // Check for duplicate if invoice number changed
      if (
        data.invoiceNumber !== currentInvoice.invoiceNumber
      ) {
        const existing = await prisma.salesInvoice.findUnique({
          where: {
            invoiceNumber: data.invoiceNumber,
          },
        });
        if (existing && existing.id !== id) {
          return {
            success: false,
            error: "Invoice number already exists",
          };
        }
      }

      // Fetch tax rates
      const taxRates = await prisma.taxRate.findMany();

      const itemsToCreate = data.items.map((item) => {
        let taxRateSnapshot: number | undefined = undefined;
        const taxAmount = item.tax || 0;

        if (item.taxRateId) {
          const rateObj = taxRates.find(r => r.id === item.taxRateId);
          if (rateObj) {
            taxRateSnapshot = Number(rateObj.rate);
          }
        }

        const calculated = CalculationService.calculateLineItem(
          {
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            tax: taxAmount,
          },
          taxRateSnapshot
        );

        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: calculated.total.toNumber(),
          discount: item.discount,
          tax: calculated.taxAmount.toNumber(),
          taxRateId: item.taxRateId,
          taxRateSnapshot: taxRateSnapshot,
          productId: item.productId,
          accountId: item.accountId,
          _calculated: calculated
        };
      });

      const totals = CalculationService.calculateInvoiceTotals(
        itemsToCreate.map(i => i._calculated),
        data.globalDiscount,
        data.shippingCost
      );

      // Remove internal field before creating
      const itemsData = itemsToCreate.map(({ _calculated, ...rest }) => rest);

      const result = await prisma.$transaction(async (tx) => {
        // Delete existing items
        await tx.salesInvoiceItem.deleteMany({
          where: { salesInvoiceId: id },
        });

        // Update Invoice and create new items
        return await tx.salesInvoice.update({
          where: { id },
          data: {
            invoiceNumber: data.invoiceNumber,
            contactId: data.contactId,
            salesOrderId: data.salesOrderId,
            invoiceDate: data.invoiceDate,
            dueDate: data.dueDate,
            notes: data.notes,
            status: data.status || currentInvoice.status,
            totalAmount: totals.totalAmount.toNumber(),
            globalDiscount: data.globalDiscount,
            totalTax: totals.totalTax.toNumber(),
            shippingCost: data.shippingCost,
            departmentId: data.departmentId,
            projectId: data.projectId,
            items: {
              create: itemsData,
            },
            attachments: {
              set: data.attachmentIds?.map((id) => ({ id })) || [],
            },
          },
          include: {
            items: true,
          },
        });
      });

      revalidatePath("/sales/invoices");
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to update Invoice:", error);
      return { success: false, error: "Failed to update Sales Invoice" };
    }
  },
);

export const deleteSalesInvoice = authorizedAction(
  "sales.delete",
  async (id: string) => {
    try {
      const currentInvoice = await prisma.salesInvoice.findUnique({
        where: { id },
      });

      if (!currentInvoice) throw new Error("Invoice not found");

      if (currentInvoice.status !== "DRAFT") {
        return { success: false, error: "Can only delete draft invoices" };
      }

      await prisma.salesInvoice.delete({
        where: { id },
      });

      revalidatePath("/sales/invoices");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete Invoice:", error);
      return { success: false, error: "Failed to delete Sales Invoice" };
    }
  },
);

export const postSalesInvoice = authorizedAction<PostSalesInvoiceResult, [string]>(
  "sales.edit",
  async (id: string) => {
    try {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");

      const invoice = await prisma.salesInvoice.findUnique({
        where: { id },
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
          topic: "sales",
          type: "SALES_INVOICE_ISSUED",
          aggregateType: "SalesInvoice",
          aggregateId: invoice.id,
          payload,
        });
      });

      if (outbox.alreadyQueued) {
        return { success: true, data: { processed: false as const, alreadyQueued: true as const } };
      }

      const processed = await maybeProcessIntegrationOutboxEvent(outbox.id);

      revalidatePath("/sales/invoices");
      revalidatePath(`/sales/invoices/${id}`);
      return { success: true, data: { outboxId: outbox.id, ...processed } };
    } catch (error) {
      console.error("Failed to post Invoice:", error);
      return { success: false, error: error instanceof Error ? error.message : "Failed to post Sales Invoice" };
    }
  },
);
