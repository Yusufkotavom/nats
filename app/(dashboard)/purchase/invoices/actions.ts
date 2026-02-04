"use server";

import { prisma } from "@/lib/prisma";
import { SuperJSON } from "@/lib/superjson";
import { revalidatePath } from "next/cache";
import {
  Prisma,
  PurchaseInvoiceStatus,
} from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { PurchaseInvoiceInput } from "./types";
import { getPurchaseOrder } from "../orders/actions";
import { getRequiredDefaultAccount } from "@/app/(dashboard)/accounting/accounting-service";
import { getSession } from "@/lib/auth/auth";

export { getPurchaseOrder };

export async function getPurchaseInvoices(
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
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
  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      contact: true,
      purchaseOrder: true,
      items: true,
    },
  });

  return SuperJSON.serialize(invoice);
}

export async function getPurchaseOrdersForSelect() {
  const orders = await prisma.purchaseOrder.findMany({
    where: {
      // Invoices can be created for any active PO ideally, but usually Issued/Received.
      status: { in: ["ISSUED", "PARTIALLY_RECEIVED", "CLOSED"] },
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

export const createPurchaseInvoice = authorizedAction(
  "purchase.create",
  async (data: PurchaseInvoiceInput) => {
    try {
      // Check for duplicate invoice number for vendor
      const existing = await prisma.purchaseInvoice.findUnique({
        where: {
          contactId_invoiceNumber: {
            contactId: data.contactId,
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
        };
      });

      const totalAmount =
        itemsTotal -
        (data.globalDiscount || 0) +
        (data.shippingCost || 0) +
        (data.handlingCost || 0);

      const result = await prisma.purchaseInvoice.create({
        data: {
          invoiceNumber: data.invoiceNumber,
          contactId: data.contactId,
          purchaseOrderId: data.purchaseOrderId,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          notes: data.notes,
          status: "DRAFT", // Default to DRAFT
          totalAmount,
          globalDiscount: data.globalDiscount,
          totalTax: totalTaxCalculated,
          shippingCost: data.shippingCost,
          handlingCost: data.handlingCost,
          items: {
            create: itemsToCreate,
          },
        },
        include: {
          items: true,
        },
      });

      revalidatePath("/purchase/invoices");
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to create Invoice:", error);
      return { success: false, error: "Failed to create Purchase Invoice" };
    }
  },
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
        currentInvoice.status === "CANCELED"
      ) {
        return {
          success: false,
          error: "Cannot edit paid or canceled invoice",
        };
      }

      // Check for duplicate if invoice number changed
      if (
        data.invoiceNumber !== currentInvoice.invoiceNumber ||
        data.contactId !== currentInvoice.contactId
      ) {
        const existing = await prisma.purchaseInvoice.findUnique({
          where: {
            contactId_invoiceNumber: {
              contactId: data.contactId,
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
          accountId: item.accountId,
        };
      });

      const totalAmount =
        itemsTotal -
        (data.globalDiscount || 0) +
        (data.shippingCost || 0) +
        (data.handlingCost || 0);

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
            contactId: data.contactId,
            purchaseOrderId: data.purchaseOrderId,
            invoiceDate: data.invoiceDate,
            dueDate: data.dueDate,
            notes: data.notes,
            status: data.status || currentInvoice.status,
            totalAmount,
            globalDiscount: data.globalDiscount,
            totalTax: totalTaxCalculated,
            shippingCost: data.shippingCost,
            handlingCost: data.handlingCost,
            items: {
              create: itemsToCreate,
            },
          },
          include: {
            items: true,
          },
        });
      });

      revalidatePath("/purchase/invoices");
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to update Invoice:", error);
      return { success: false, error: "Failed to update Purchase Invoice" };
    }
  },
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
  },
);

export const postPurchaseInvoice = authorizedAction(
  "purchase.create",
  async (id: string) => {
    try {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");

      const invoice = await prisma.purchaseInvoice.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!invoice) throw new Error("Invoice not found");
      if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be posted");
      if (invoice.journalEntryId) throw new Error("Invoice already posted");

      // Get Default Accounts
      const apAccount = await getRequiredDefaultAccount("ACCOUNTS_PAYABLE");
      const grniAccount = await getRequiredDefaultAccount("GOODS_RECEIVED_NOT_INVOICED");
      const taxAccount = await getRequiredDefaultAccount("PURCHASE_TAX_RECEIVABLE");
      const expenseAccount = await getRequiredDefaultAccount("UNCATEGORIZED_EXPENSE");

      // Prepare JE lines
      const lines: Prisma.JournalEntryLineCreateWithoutJournalEntryInput[] = [];
      let lineNumber = 1;

      // Credit AP (Total Amount)
      lines.push({
        account: { connect: { id: apAccount.accountId } },
        debitAmount: 0,
        creditAmount: invoice.totalAmount,
        description: `Payable for Invoice #${invoice.invoiceNumber}`,
        lineNumber: lineNumber++,
        contact: { connect: { id: invoice.contactId } },
      });

      // Debit Items (Expense/Asset/GRNI)
      for (const item of invoice.items) {
        let accountId = item.accountId;
        if (!accountId) {
          // Default to GRNI
          accountId = grniAccount.accountId;
        }

        const subtotal = Number(item.unitPrice) * item.quantity;
        const discountAmount = subtotal * (Number(item.discount || 0) / 100);
        const taxableAmount = subtotal - discountAmount;
        const taxRate = Number(item.tax || 0) / 100;
        const taxAmount = taxableAmount * taxRate;

        // Debit Net Amount
        if (taxableAmount > 0) {
          lines.push({
            account: { connect: { id: accountId } },
            debitAmount: taxableAmount,
            creditAmount: 0,
            description: item.description,
            lineNumber: lineNumber++,
          });
        }

        // Debit Tax Amount
        if (taxAmount > 0) {
          lines.push({
            account: { connect: { id: taxAccount.accountId } },
            debitAmount: taxAmount,
            creditAmount: 0,
            description: `Tax on ${item.description}`,
            lineNumber: lineNumber++,
          });
        }
      }

      // Shipping
      if (Number(invoice.shippingCost) > 0) {
        lines.push({
          account: { connect: { id: expenseAccount.accountId } },
          debitAmount: invoice.shippingCost,
          creditAmount: 0,
          description: "Shipping Cost",
          lineNumber: lineNumber++,
        });
      }

      // Handling
      if (Number(invoice.handlingCost) > 0) {
        lines.push({
          account: { connect: { id: expenseAccount.accountId } },
          debitAmount: invoice.handlingCost,
          creditAmount: 0,
          description: "Handling Cost",
          lineNumber: lineNumber++,
        });
      }

      // Global Discount (Credit)
      if (Number(invoice.globalDiscount) > 0) {
        lines.push({
          account: { connect: { id: expenseAccount.accountId } },
          debitAmount: 0,
          creditAmount: invoice.globalDiscount,
          description: "Global Discount",
          lineNumber: lineNumber++,
        });
      }

      // Transaction
      await prisma.$transaction(async (tx) => {
        // Create JE
        const je = await tx.journalEntry.create({
          data: {
            userId: session.userId,
            entryNumber: `INV-${invoice.invoiceNumber}`,
            transactionDate: invoice.invoiceDate,
            description: `Purchase Invoice #${invoice.invoiceNumber}`,
            status: "posted",
            postedAt: new Date(),
            lines: {
              create: lines,
            },
          },
        });

        // Update Invoice
        await tx.purchaseInvoice.update({
          where: { id },
          data: {
            status: "BILLED",
            journalEntryId: je.id,
          },
        });
      });

      revalidatePath("/purchase/invoices");
      revalidatePath(`/purchase/invoices/${id}`);
      return { success: true };
    } catch (error) {
      console.error("Failed to post Invoice:", error);
      return { success: false, error: "Failed to post Purchase Invoice" };
    }
  },
);
