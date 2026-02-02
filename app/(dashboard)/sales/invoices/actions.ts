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

export { getSalesOrder };

export async function getSalesInvoices(
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
) {
  const skip = (page - 1) * limit;
  const where: Prisma.SalesInvoiceWhereInput = {
    AND: [],
  };

  if (status && status !== "ALL") {
    (where.AND as Prisma.SalesInvoiceWhereInput[]).push({
      status: status as SalesInvoiceStatus,
    });
  }

  if (search) {
    (where.AND as Prisma.SalesInvoiceWhereInput[]).push({
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
  const invoice = await prisma.salesInvoice.findUnique({
    where: { id },
    include: {
      contact: true,
      salesOrder: true,
      items: true,
    },
  });

  return SuperJSON.serialize(invoice);
}

export async function getSalesOrdersForSelect() {
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

export const createSalesInvoice = authorizedAction(
  "sales.create",
  async (data: SalesInvoiceInput) => {
    try {
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

      let itemsTotal = 0;
      let totalTaxCalculated = 0;

      const itemsToCreate = data.items.map((item) => {
        const subtotal = item.quantity * item.unitPrice;
        const discountAmount = subtotal * ((item.discount || 0) / 100);
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = taxableAmount * ((item.tax || 0) / 100);
        const total = taxableAmount + taxAmount;

        itemsTotal += total;
        totalTaxCalculated += taxAmount;

        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: total,
          discount: item.discount,
          tax: item.tax,
          productId: item.productId,
          accountId: item.accountId,
        };
      });

      const totalAmount =
        itemsTotal -
        (data.globalDiscount || 0) +
        (data.shippingCost || 0);

      const result = await prisma.salesInvoice.create({
        data: {
          invoiceNumber: invoiceNumber,
          contactId: data.contactId,
          salesOrderId: data.salesOrderId,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          notes: data.notes,
          status: "DRAFT", // Default to DRAFT
          totalAmount,
          globalDiscount: data.globalDiscount,
          totalTax: totalTaxCalculated,
          shippingCost: data.shippingCost,
          items: {
            create: itemsToCreate,
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
  async (id: string, data: SalesInvoiceInput) => {
    try {
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

      let itemsTotal = 0;
      let totalTaxCalculated = 0;

      const itemsToCreate = data.items.map((item) => {
        const subtotal = item.quantity * item.unitPrice;
        const discountAmount = subtotal * ((item.discount || 0) / 100);
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = taxableAmount * ((item.tax || 0) / 100);
        const total = taxableAmount + taxAmount;

        itemsTotal += total;
        totalTaxCalculated += taxAmount;

        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: total,
          discount: item.discount,
          tax: item.tax,
          productId: item.productId,
          accountId: item.accountId,
        };
      });

      const totalAmount =
        itemsTotal -
        (data.globalDiscount || 0) +
        (data.shippingCost || 0);

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
            totalAmount,
            globalDiscount: data.globalDiscount,
            totalTax: totalTaxCalculated,
            shippingCost: data.shippingCost,
            items: {
              create: itemsToCreate,
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
