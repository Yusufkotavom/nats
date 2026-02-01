"use server";

import { prisma } from "@/lib/prisma";
import { SuperJSON } from "@/lib/superjson";
import { revalidatePath } from "next/cache";
import {
  Prisma,
  CashTransactionType,
  PurchaseInvoiceStatus,
} from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { PurchasePaymentInput } from "./types";
import { getSession } from "@/lib/auth/auth";

export async function getPurchasePayments(
  page: number = 1,
  limit: number = 10,
  search?: string
) {
  const skip = (page - 1) * limit;
  const where: Prisma.PurchasePaymentWhereInput = {
    AND: [],
  };

  if (search) {
    (where.AND as Prisma.PurchasePaymentWhereInput[]).push({
      OR: [
        { paymentNumber: { contains: search, mode: "insensitive" } },
        { contact: { name: { contains: search, mode: "insensitive" } } },
        {
          purchaseInvoice: {
            invoiceNumber: { contains: search, mode: "insensitive" },
          },
        },
      ],
    });
  }

  const [payments, total] = await Promise.all([
    prisma.purchasePayment.findMany({
      where,
      include: {
        contact: true,
        purchaseInvoice: true,
        cashAccount: true,
        journalEntry: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.purchasePayment.count({ where }),
  ]);

  return {
    payments: SuperJSON.serialize(payments),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getPurchasePayment(id: string) {
  const payment = await prisma.purchasePayment.findUnique({
    where: { id },
    include: {
      contact: true,
      purchaseInvoice: true,
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

export async function getUnpaidInvoices() {
  const invoices = await prisma.purchaseInvoice.findMany({
    where: {
      status: { in: ["BILLED", "PARTIALLY_PAID"] },
    },
    include: {
      contact: true,
      purchaseOrder: true,
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

export const createPurchasePayment = authorizedAction(
  "purchase.create",
  async (data: PurchasePaymentInput) => {
    try {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");

      // 1. Validate inputs
      const invoice = await prisma.purchaseInvoice.findUnique({
        where: { id: data.purchaseInvoiceId },
        include: { payments: true },
      });

      if (!invoice) throw new Error("Invoice not found");

      const cashAccount = await prisma.cashAccount.findUnique({
        where: { id: data.cashAccountId },
      });

      if (!cashAccount) throw new Error("Cash account not found");

      // 2. Check if overpaying
      // Calculate total paid so far
      const totalPaid = invoice.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const remaining = Number(invoice.totalAmount) - totalPaid;

      // Allow small float error margin
      if (data.amount > remaining + 0.01) {
        throw new Error(`Amount exceeds remaining balance of ${remaining}`);
      }

      // 3. Create Transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create Purchase Payment
        const payment = await tx.purchasePayment.create({
          data: {
            paymentNumber: data.paymentNumber,
            contactId: data.contactId,
            purchaseInvoiceId: data.purchaseInvoiceId,
            paymentDate: data.paymentDate,
            amount: data.amount,
            reference: data.reference,
            notes: data.notes,
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

        await tx.purchaseInvoice.update({
          where: { id: invoice.id },
          data: {
            status: newStatus,
          },
        });

        return payment;
      });

      revalidatePath("/purchase/payments");
      revalidatePath("/purchase/invoices");
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

export const postPurchasePayment = authorizedAction(
  "purchase.create",
  async (id: string) => {
    try {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");

      const payment = await prisma.purchasePayment.findUnique({
        where: { id },
        include: {
          purchaseInvoice: true,
          cashAccount: true,
        },
      });

      if (!payment) throw new Error("Payment not found");
      if (payment.journalEntryId) throw new Error("Payment already posted");

      const invoice = payment.purchaseInvoice;
      const cashAccount = payment.cashAccount;

      // Find AP Account
      const apAccount = await prisma.account.findFirst({
        where: {
          OR: [
            { code: "21100" },
            { name: { contains: "Accounts Payable", mode: "insensitive" } },
          ],
          type: "liability",
        },
      });

      if (!apAccount)
        throw new Error(
          "Accounts Payable account not found. Please contact admin."
        );

      await prisma.$transaction(async (tx) => {
        // Create Journal Entry
        const je = await tx.journalEntry.create({
          data: {
            userId: session.userId,
            entryNumber: `PAY-${payment.paymentNumber}`,
            transactionDate: payment.paymentDate,
            description: `Payment for Invoice #${invoice.invoiceNumber}`,
            status: "posted",
            postedAt: new Date(),
            lines: {
              create: [
                {
                  accountId: apAccount.id,
                  debitAmount: payment.amount,
                  creditAmount: 0,
                  description: `Payment for Invoice #${invoice.invoiceNumber}`,
                  lineNumber: 1,
                  contactId: payment.contactId,
                },
                {
                  accountId: cashAccount.glAccountId,
                  debitAmount: 0,
                  creditAmount: payment.amount,
                  description: `Payment from ${cashAccount.name}`,
                  lineNumber: 2,
                },
              ],
            },
          },
        });

        // Create Cash Transaction
        await tx.cashTransaction.create({
          data: {
            cashAccountId: payment.cashAccountId,
            type: CashTransactionType.EXPENSE,
            date: payment.paymentDate,
            reference: payment.reference,
            description: `Payment for Invoice #${invoice.invoiceNumber}`,
            note: payment.notes,
            journalEntryId: je.id,
            status: "APPROVED",
            approvedAt: new Date(),
            allocations: {
              create: {
                accountId: apAccount.id,
                amount: payment.amount,
                description: `Payment for Invoice #${invoice.invoiceNumber}`,
              },
            },
          },
        });

        // Update Payment with JE ID
        await tx.purchasePayment.update({
          where: { id: payment.id },
          data: {
            journalEntryId: je.id,
          },
        });
      });

      revalidatePath("/purchase/payments");
      revalidatePath("/purchase/invoices");
      revalidatePath(`/purchase/payments/${id}`);
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

export const deletePurchasePayment = authorizedAction(
  "purchase.delete",
  async (id: string) => {
    try {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");

      const payment = await prisma.purchasePayment.findUnique({
        where: { id },
        include: {
          purchaseInvoice: {
            include: { payments: true },
          },
        },
      });

      if (!payment) throw new Error("Payment not found");

      const invoice = payment.purchaseInvoice;
      const journalEntryId = payment.journalEntryId;

      await prisma.$transaction(async (tx) => {
        // 1. Delete Purchase Payment
        await tx.purchasePayment.delete({
          where: { id },
        });

        if (journalEntryId) {
          // 2. Find and Delete Cash Transaction
          const cashTransaction = await tx.cashTransaction.findUnique({
            where: { journalEntryId },
          });

          if (cashTransaction) {
            await tx.cashTransaction.delete({
              where: { id: cashTransaction.id },
            });
          }

          // 3. Delete Journal Entry Lines
          await tx.journalEntryLine.deleteMany({
            where: { journalEntryId },
          });

          // 4. Delete Journal Entry
          await tx.journalEntry.delete({
            where: { id: journalEntryId },
          });
        }

        // 5. Update Invoice Status
        // Calculate new total paid (excluding the deleted payment)
        // Since we already fetched invoice.payments which includes the current payment,
        // we subtract the current payment amount.
        const currentTotalPaid = invoice.payments.reduce(
          (sum, p) => sum + Number(p.amount),
          0
        );
        const newTotalPaid = currentTotalPaid - Number(payment.amount);

        // Allow small float error
        const newStatus =
          newTotalPaid >= Number(invoice.totalAmount) - 0.01
            ? "PAID"
            : newTotalPaid > 0
              ? "PARTIALLY_PAID"
              : "BILLED"; // Revert to BILLED if 0 paid

        // If newTotalPaid is 0 and it was previously draft? No, it must be BILLED to have payments.
        // But verify if it could be DRAFT? Unlikely.

        await tx.purchaseInvoice.update({
          where: { id: invoice.id },
          data: {
            status: newStatus as PurchaseInvoiceStatus,
          },
        });
      });

      revalidatePath("/purchase/payments");
      revalidatePath("/purchase/invoices");
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
