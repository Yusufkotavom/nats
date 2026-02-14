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
import { getRequiredDefaultAccount } from "@/app/(dashboard)/accounting/accounting-service";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";

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

      // Fetch tax rates
      const taxRates = await prisma.taxRate.findMany();

      let itemsTotal = 0;
      let totalTaxCalculated = 0;

      const itemsToCreate = data.items.map((item) => {
        const subtotal = item.quantity * item.unitPrice;
        const discountAmount = subtotal * ((item.discount || 0) / 100);
        const taxableAmount = Math.max(0, subtotal - discountAmount);

        let taxAmount = 0;
        let taxRateSnapshot: number | undefined = undefined;

        if (item.taxRateId) {
          const rateObj = taxRates.find(r => r.id === item.taxRateId);
          if (rateObj) {
            taxAmount = taxableAmount * (Number(rateObj.rate) / 100);
            taxRateSnapshot = Number(rateObj.rate);
          }
        } else {
          taxAmount = item.tax || 0;
        }

        taxAmount = Number(taxAmount.toFixed(2));
        const total = taxableAmount + taxAmount;

        itemsTotal += total;
        totalTaxCalculated += taxAmount;

        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: total,
          discount: item.discount,
          tax: taxAmount,
          taxRateId: item.taxRateId,
          taxRateSnapshot: taxRateSnapshot,
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
          departmentId: data.departmentId,
          projectId: data.projectId,
          items: {
            create: itemsToCreate,
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

      // Fetch tax rates
      const taxRates = await prisma.taxRate.findMany();

      let itemsTotal = 0;
      let totalTaxCalculated = 0;

      const itemsToCreate = data.items.map((item) => {
        const subtotal = item.quantity * item.unitPrice;
        const discountAmount = subtotal * ((item.discount || 0) / 100);
        const taxableAmount = Math.max(0, subtotal - discountAmount);

        let taxAmount = 0;
        let taxRateSnapshot: number | undefined = undefined;

        if (item.taxRateId) {
          const rateObj = taxRates.find(r => r.id === item.taxRateId);
          if (rateObj) {
            taxAmount = taxableAmount * (Number(rateObj.rate) / 100);
            taxRateSnapshot = Number(rateObj.rate);
          }
        } else {
          taxAmount = item.tax || 0;
        }

        taxAmount = Number(taxAmount.toFixed(2));
        const total = taxableAmount + taxAmount;

        itemsTotal += total;
        totalTaxCalculated += taxAmount;

        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: total,
          discount: item.discount,
          tax: taxAmount,
          taxRateId: item.taxRateId,
          taxRateSnapshot: taxRateSnapshot,
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
            departmentId: data.departmentId,
            projectId: data.projectId,
            items: {
              create: itemsToCreate,
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

export const postSalesInvoice = authorizedAction(
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

      // Get Default Accounts
      const arAccount = await getRequiredDefaultAccount("ACCOUNTS_RECEIVABLE");
      const revenueAccount = await getRequiredDefaultAccount("SALES_REVENUE");
      const taxAccount = await getRequiredDefaultAccount("SALES_TAX_PAYABLE");
      const discountAccount = await getRequiredDefaultAccount("SALES_DISCOUNT");
      const shippingAccount = await getRequiredDefaultAccount("UNCATEGORIZED_INCOME"); // Or Shipping Revenue

      // Prepare JE lines
      const lines: Prisma.JournalEntryLineCreateWithoutJournalEntryInput[] = [];
      let lineNumber = 1;

      // Debit AR (Total Amount)
      lines.push({
        account: { connect: { id: arAccount.accountId } },
        debitAmount: invoice.totalAmount,
        creditAmount: 0,
        description: `Receivable for Invoice #${invoice.invoiceNumber}`,
        lineNumber: lineNumber++,
        contact: { connect: { id: invoice.contactId } },
      });

      // Credit Items (Revenue/Tax)
      for (const item of invoice.items) {
        let accountId = item.accountId;
        if (!accountId) {
          // Default to Sales Revenue
          accountId = revenueAccount.accountId;
        }

        const subtotal = Number(item.unitPrice) * item.quantity;
        const discountAmount = subtotal * (Number(item.discount || 0) / 100);
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = Number(item.tax || 0);

        // Credit Revenue (Net)
        if (taxableAmount > 0) {
          lines.push({
            account: { connect: { id: accountId } },
            debitAmount: 0,
            creditAmount: taxableAmount,
            description: item.description,
            lineNumber: lineNumber++,
          });
        }

        // Credit Tax
        if (taxAmount > 0) {
          lines.push({
            account: { connect: { id: taxAccount.accountId } },
            debitAmount: 0,
            creditAmount: taxAmount,
            description: `Tax on ${item.description}`,
            lineNumber: lineNumber++,
          });
        }
      }

      // Shipping (Credit)
      if (Number(invoice.shippingCost) > 0) {
        lines.push({
          account: { connect: { id: shippingAccount.accountId } },
          debitAmount: 0,
          creditAmount: invoice.shippingCost,
          description: "Shipping Cost",
          lineNumber: lineNumber++,
        });
      }

      // Global Discount (Debit)
      if (Number(invoice.globalDiscount) > 0) {
        lines.push({
          account: { connect: { id: discountAccount.accountId } },
          debitAmount: invoice.globalDiscount,
          creditAmount: 0,
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
            description: `Sales Invoice #${invoice.invoiceNumber}`,
            status: "posted",
            postedAt: new Date(),
            lines: {
              create: lines,
            },
          },
        });

        // Update Invoice
        await tx.salesInvoice.update({
          where: { id },
          data: {
            status: "ISSUED",
            journalEntryId: je.id,
          },
        });
      });

      revalidatePath("/sales/invoices");
      revalidatePath(`/sales/invoices/${id}`);
      return { success: true };
    } catch (error) {
      console.error("Failed to post Invoice:", error);
      return { success: false, error: "Failed to post Sales Invoice" };
    }
  },
);
