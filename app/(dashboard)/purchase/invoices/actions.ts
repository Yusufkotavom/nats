"use server";

import { prisma, serializePrisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  Prisma,
  PurchaseInvoiceStatus,
} from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { PurchaseInvoiceInput } from "./types";
import { getPurchaseOrder } from "../orders/actions";

export { getPurchaseOrder };

export async function getPurchaseInvoices(
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string
) {
  const skip = (page - 1) * limit;
  const where: Prisma.PurchaseInvoiceWhereInput = {
    AND: [],
  };

  if (status && status !== "ALL") {
    (where.AND as Prisma.PurchaseInvoiceWhereInput[]).push({
      status: status as PurchaseInvoiceStatus,
    });
  }

  if (search) {
    (where.AND as Prisma.PurchaseInvoiceWhereInput[]).push({
      OR: [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { vendor: { name: { contains: search, mode: "insensitive" } } },
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
        vendor: true,
        purchaseOrder: true,
        items: {
          include: {
            account: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.purchaseInvoice.count({ where }),
  ]);

  return {
    invoices: serializePrisma(invoices),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getPurchaseInvoice(id: string) {
  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      vendor: true,
      purchaseOrder: true,
      items: {
        include: {
          account: true,
        },
      },
    },
  });

  return serializePrisma(invoice);
}

export async function getVendors() {
  const vendors = await prisma.vendor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return serializePrisma(vendors);
}

export async function getAccounts() {
  const accounts = await prisma.account.findMany({
    where: { isActive: true, isPosting: true },
    orderBy: { code: "asc" },
  });
  return serializePrisma(accounts);
}

export async function getPurchaseOrdersForSelect() {
  const orders = await prisma.purchaseOrder.findMany({
    where: {
      // Invoices can be created for any active PO ideally, but usually Issued/Received.
      status: { in: ["ISSUED", "PARTIALLY_RECEIVED", "CLOSED"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      vendor: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });
  return serializePrisma(orders);
}

export const createPurchaseInvoice = authorizedAction(
  "purchase.create",
  async (data: PurchaseInvoiceInput) => {
    try {
      // Check for duplicate invoice number for vendor
      const existing = await prisma.purchaseInvoice.findUnique({
        where: {
          vendorId_invoiceNumber: {
            vendorId: data.vendorId,
            invoiceNumber: data.invoiceNumber,
          },
        },
      });

      if (existing) {
        return {
          success: false,
          error: "Invoice number already exists for this vendor",
        };
      }

      let totalAmount = 0;
      data.items.forEach((item) => {
        totalAmount += item.quantity * item.unitPrice;
      });

      const result = await prisma.purchaseInvoice.create({
        data: {
          invoiceNumber: data.invoiceNumber,
          vendorId: data.vendorId,
          purchaseOrderId: data.purchaseOrderId,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          notes: data.notes,
          status: "DRAFT", // Default to DRAFT
          totalAmount,
          items: {
            create: data.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              accountId: item.accountId,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      revalidatePath("/purchase/invoices");
      return { success: true, data: serializePrisma(result) };
    } catch (error) {
      console.error("Failed to create Invoice:", error);
      return { success: false, error: "Failed to create Purchase Invoice" };
    }
  }
);

export const updatePurchaseInvoice = authorizedAction(
  "purchase.edit",
  async (id: string, data: PurchaseInvoiceInput) => {
    try {
      const currentInvoice = await prisma.purchaseInvoice.findUnique({
        where: { id },
      });

      if (!currentInvoice) throw new Error("Invoice not found");

      if (
        currentInvoice.status === "PAID" ||
        currentInvoice.status === "VOID"
      ) {
        return { success: false, error: "Cannot edit paid or void invoice" };
      }

      // Check for duplicate if invoice number changed
      if (
        data.invoiceNumber !== currentInvoice.invoiceNumber ||
        data.vendorId !== currentInvoice.vendorId
      ) {
        const existing = await prisma.purchaseInvoice.findUnique({
          where: {
            vendorId_invoiceNumber: {
              vendorId: data.vendorId,
              invoiceNumber: data.invoiceNumber,
            },
          },
        });
        if (existing && existing.id !== id) {
          return {
            success: false,
            error: "Invoice number already exists for this vendor",
          };
        }
      }

      let totalAmount = 0;
      data.items.forEach((item) => {
        totalAmount += item.quantity * item.unitPrice;
      });

      const result = await prisma.$transaction(async (tx) => {
        // Delete existing items
        await tx.purchaseInvoiceItem.deleteMany({
          where: { purchaseInvoiceId: id },
        });

        // Update Invoice and create new items
        return await tx.purchaseInvoice.update({
          where: { id },
          data: {
            invoiceNumber: data.invoiceNumber,
            vendorId: data.vendorId,
            purchaseOrderId: data.purchaseOrderId,
            invoiceDate: data.invoiceDate,
            dueDate: data.dueDate,
            notes: data.notes,
            status: data.status || currentInvoice.status,
            totalAmount,
            items: {
              create: data.items.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * item.unitPrice,
                accountId: item.accountId,
              })),
            },
          },
          include: {
            items: true,
          },
        });
      });

      revalidatePath("/purchase/invoices");
      return { success: true, data: serializePrisma(result) };
    } catch (error) {
      console.error("Failed to update Invoice:", error);
      return { success: false, error: "Failed to update Purchase Invoice" };
    }
  }
);

export const deletePurchaseInvoice = authorizedAction(
  "purchase.delete",
  async (id: string) => {
    try {
      const currentInvoice = await prisma.purchaseInvoice.findUnique({
        where: { id },
      });

      if (!currentInvoice) throw new Error("Invoice not found");

      if (currentInvoice.status !== "DRAFT") {
        return { success: false, error: "Can only delete draft invoices" };
      }

      await prisma.purchaseInvoice.delete({
        where: { id },
      });

      revalidatePath("/purchase/invoices");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete Invoice:", error);
      return { success: false, error: "Failed to delete Purchase Invoice" };
    }
  }
);
