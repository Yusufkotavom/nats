"use server";

import { prisma } from "@/lib/prisma";
import { SuperJSON } from "@/lib/superjson";
import { revalidatePath } from "next/cache";
import {
  Prisma,
  CashTransactionType,
  SalesInvoiceStatus,
} from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { SalesPaymentInput } from "./types";
import { getSession } from "@/lib/auth/auth";

export async function getSalesPayments(
  page: number = 1,
  limit: number = 10,
  search?: string
) {
  const skip = (page - 1) * limit;
  const where: Prisma.SalesPaymentWhereInput = {
    AND: [],
  };

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
  const payment = await prisma.salesPayment.findUnique({
    where: { id },
    include: {
      contact: true,
      salesInvoice: true,
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
  return SuperJSON.serialize(payment);
}

export async function getUnpaidSalesInvoices() {
  const invoices = await prisma.salesInvoice.findMany({
    where: {
      status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
    },
    include: {
      contact: true,
      salesOrder: true,
      payments: true,
    },
    orderBy: { dueDate: "asc" },
  });
  return SuperJSON.serialize(invoices);
}

export async function getCashAccounts() {
  const accounts = await prisma.cashAccount.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return SuperJSON.serialize(accounts);
}

// Helper to generate Payment Number
async function generatePaymentNumber() {
  const count = await prisma.salesPayment.count();
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const sequence = (count + 1).toString().padStart(4, "0");
  return `PAY-IN-${year}${month}-${sequence}`;
}

export const createSalesPayment = authorizedAction(
  "sales.create",
  async (data: SalesPaymentInput) => {
    try {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");

      // 1. Validate inputs
      const invoice = await prisma.salesInvoice.findUnique({
        where: { id: data.salesInvoiceId },
        include: { payments: true },
      });

      if (!invoice) throw new Error("Invoice not found");

      const cashAccount = await prisma.cashAccount.findUnique({
        where: { id: data.cashAccountId },
      });

      if (!cashAccount) throw new Error("Cash account not found");

      // 2. Check if overpaying
      const totalPaid = invoice.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const remaining = Number(invoice.totalAmount) - totalPaid;

      // Allow small float error margin
      if (data.amount > remaining + 0.01) {
        throw new Error(`Amount exceeds remaining balance of ${remaining}`);
      }

      let paymentNumber = data.paymentNumber;
      if (!paymentNumber) {
        paymentNumber = await generatePaymentNumber();
      }

      // 3. Create Transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create Sales Payment
        const payment = await tx.salesPayment.create({
          data: {
            paymentNumber: paymentNumber,
            contactId: data.contactId,
            salesInvoiceId: data.salesInvoiceId,
            paymentDate: data.paymentDate,
            amount: data.amount,
            reference: data.reference,
            notes: data.notes,
            method: data.method,
            cashAccountId: data.cashAccountId,
            attachments: {
              connect: data.attachmentIds?.map((id) => ({ id })),
            },
          },
        });

        // Update Invoice Status
        const newTotalPaid = totalPaid + Number(data.amount);
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

        return payment;
      });

      revalidatePath("/sales/payments");
      revalidatePath("/sales/invoices");
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

export const postSalesPayment = authorizedAction(
  "sales.create",
  async (id: string) => {
    try {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");

      const payment = await prisma.salesPayment.findUnique({
        where: { id },
        include: {
          salesInvoice: true,
          cashAccount: true,
        },
      });

      if (!payment) throw new Error("Payment not found");
      if (payment.journalEntryId) throw new Error("Payment already posted");

      const invoice = payment.salesInvoice;
      const cashAccount = payment.cashAccount;

      // Find AR Account
      // Typically 11xxx for Assets/Receivables
      const arAccount = await prisma.account.findFirst({
        where: {
          OR: [
            { code: "11100" }, // Example code
            { name: { contains: "Accounts Receivable", mode: "insensitive" } },
          ],
          type: "asset",
        },
      });

      if (!arAccount)
        throw new Error(
          "Accounts Receivable account not found. Please contact admin."
        );

      await prisma.$transaction(async (tx) => {
        // Create Journal Entry
        // Debit Cash, Credit AR
        const je = await tx.journalEntry.create({
          data: {
            userId: session.userId,
            entryNumber: `PAY-IN-${payment.paymentNumber}`,
            transactionDate: payment.paymentDate,
            description: `Payment for Invoice #${invoice.invoiceNumber}`,
            status: "posted",
            postedAt: new Date(),
            lines: {
              create: [
                {
                  accountId: cashAccount.glAccountId,
                  debitAmount: payment.amount,
                  creditAmount: 0,
                  description: `Payment to ${cashAccount.name}`,
                  lineNumber: 1,
                },
                {
                  accountId: arAccount.id,
                  debitAmount: 0,
                  creditAmount: payment.amount,
                  description: `Payment for Invoice #${invoice.invoiceNumber}`,
                  lineNumber: 2,
                  contactId: payment.contactId,
                },
              ],
            },
          },
        });

        // Create Cash Transaction (Income)
        await tx.cashTransaction.create({
          data: {
            cashAccountId: payment.cashAccountId,
            type: CashTransactionType.INCOME,
            date: payment.paymentDate,
            reference: payment.reference,
            description: `Payment for Invoice #${invoice.invoiceNumber}`,
            note: payment.notes,
            journalEntryId: je.id,
            status: "APPROVED",
            approvedAt: new Date(),
            allocations: {
              create: {
                accountId: arAccount.id,
                amount: payment.amount,
                description: `Payment for Invoice #${invoice.invoiceNumber}`,
              },
            },
          },
        });

        // Update Payment with JE ID
        await tx.salesPayment.update({
          where: { id: payment.id },
          data: {
            journalEntryId: je.id,
          },
        });
      });

      revalidatePath("/sales/payments");
      revalidatePath("/sales/invoices");
      revalidatePath(`/sales/payments/${id}`);
      return { success: true };
    } catch (error) {
      console.error("Failed to post Payment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to post Payment",
      };
    }
  }
);

export const deleteSalesPayment = authorizedAction(
  "sales.delete",
  async (id: string) => {
    try {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");

      const payment = await prisma.salesPayment.findUnique({
        where: { id },
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

      revalidatePath("/sales/payments");
      revalidatePath("/sales/invoices");
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
