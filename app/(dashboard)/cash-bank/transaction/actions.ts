"use server";

import { prisma } from "@/lib/prisma";
import { CashTransactionFormData } from "./types";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/auth";
import {
  CashTransactionType,
  EntryStatus,
  CashTransactionStatus,
} from "@/prisma/generated/prisma/enums";
import { Prisma } from "@/prisma/generated/prisma/client";

export async function createCashTransaction(data: CashTransactionFormData) {
  const session = await verifySession();

  // Validation
  if (!data.allocations.length) {
    throw new Error("At least one allocation is required");
  }
  if (!data.attachments.length) {
    throw new Error("At least one attachment is required");
  }

  const totalAmount = data.allocations.reduce(
    (sum, a) => sum + Number(a.amount),
    0
  );

  const cashAccount = await prisma.cashAccount.findUnique({
    where: { id: data.cashAccountId },
  });
  if (!cashAccount) throw new Error("Cash account not found");

  const entryNumber = `CT-${Date.now()}`;

  const lines: Prisma.JournalEntryLineUncheckedCreateWithoutJournalEntryInput[] =
    [];
  let lineNumber = 1;

  // 1. Cash Line
  lines.push({
    accountId: cashAccount.glAccountId,
    debitAmount: data.type === CashTransactionType.INCOME ? totalAmount : 0,
    creditAmount: data.type === CashTransactionType.EXPENSE ? totalAmount : 0,
    description: data.description || "Cash Transaction",
    lineNumber: lineNumber++,
  });

  // 2. Allocation Lines
  for (const alloc of data.allocations) {
    lines.push({
      accountId: alloc.accountId,
      debitAmount:
        data.type === CashTransactionType.EXPENSE ? Number(alloc.amount) : 0,
      creditAmount:
        data.type === CashTransactionType.INCOME ? Number(alloc.amount) : 0,
      description: alloc.description || data.description,
      lineNumber: lineNumber++,
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const journalEntry = await tx.journalEntry.create({
      data: {
        entryNumber,
        transactionDate: data.date,
        description: data.description,
        status: EntryStatus.draft, // Changed to draft
        userId: session.userId,
        // postedAt: new Date(), // Removed postedAt
        notes: data.notes,
        lines: {
          create: lines,
        },
        attachments: {
          connect: data.attachments.map((a) => ({ id: a.id })),
        },
      },
    });

    const transaction = await tx.cashTransaction.create({
      data: {
        cashAccountId: data.cashAccountId,
        type: data.type,
        date: data.date,
        reference: data.reference,
        description: data.description,
        note: data.notes,
        journalEntryId: journalEntry.id,
        status: CashTransactionStatus.PENDING, // Explicitly set to PENDING
        allocations: {
          create: data.allocations.map((a) => ({
            accountId: a.accountId,
            amount: a.amount,
            description: a.description,
          })),
        },
      },
    });

    return transaction;
  });

  revalidatePath("/cash-bank/transaction");
  revalidatePath("/accounting/journal-entries");
  return result;
}

export async function getCashTransactions(
  page: number = 1,
  pageSize: number = 10
) {
  const skip = (page - 1) * pageSize;

  const [transactions, total] = await Promise.all([
    prisma.cashTransaction.findMany({
      include: {
        cashAccount: true,
        journalEntry: {
          include: {
            attachments: true,
          },
        },
        allocations: {
          include: {
            account: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      skip,
      take: pageSize,
    }),
    prisma.cashTransaction.count(),
  ]);

  return {
    transactions,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getCashTransaction(id: string) {
  const transaction = await prisma.cashTransaction.findUnique({
    where: { id },
    include: {
      cashAccount: true,
      journalEntry: {
        include: {
          attachments: true,
        },
      },
      allocations: {
        include: {
          account: true,
        },
      },
    },
  });
  return transaction;
}

export async function updateCashTransaction(
  id: string,
  data: CashTransactionFormData
) {
  // const session = await verifySession(); // Not strictly needed for update if we don't track updatedBy, but good practice if we did.

  // Validation
  if (!data.allocations.length) {
    throw new Error("At least one allocation is required");
  }
  if (!data.attachments.length) {
    throw new Error("At least one attachment is required");
  }

  const totalAmount = data.allocations.reduce(
    (sum, a) => sum + Number(a.amount),
    0
  );

  const cashAccount = await prisma.cashAccount.findUnique({
    where: { id: data.cashAccountId },
  });
  if (!cashAccount) throw new Error("Cash account not found");

  const lines: Prisma.JournalEntryLineUncheckedCreateWithoutJournalEntryInput[] =
    [];
  let lineNumber = 1;

  // 1. Cash Line
  lines.push({
    accountId: cashAccount.glAccountId,
    debitAmount: data.type === CashTransactionType.INCOME ? totalAmount : 0,
    creditAmount: data.type === CashTransactionType.EXPENSE ? totalAmount : 0,
    description: data.description || "Cash Transaction",
    lineNumber: lineNumber++,
  });

  // 2. Allocation Lines
  for (const alloc of data.allocations) {
    lines.push({
      accountId: alloc.accountId,
      debitAmount:
        data.type === CashTransactionType.EXPENSE ? Number(alloc.amount) : 0,
      creditAmount:
        data.type === CashTransactionType.INCOME ? Number(alloc.amount) : 0,
      description: alloc.description || data.description,
      lineNumber: lineNumber++,
    });
  }

  const existingTransaction = await prisma.cashTransaction.findUnique({
    where: { id },
    include: { journalEntry: { include: { attachments: true } } },
  });

  if (!existingTransaction) throw new Error("Transaction not found");

  if (existingTransaction.status === CashTransactionStatus.APPROVED) {
    throw new Error("Cannot edit approved transaction");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update Journal Entry
    await tx.journalEntry.update({
      where: { id: existingTransaction.journalEntryId },
      data: {
        transactionDate: data.date,
        description: data.description,
        notes: data.notes,
        attachments: {
          set: data.attachments.map((a) => ({ id: a.id })),
        },
        lines: {
          deleteMany: {},
          create: lines,
        },
      },
    });

    // Update Cash Transaction
    const transaction = await tx.cashTransaction.update({
      where: { id },
      data: {
        cashAccountId: data.cashAccountId,
        type: data.type,
        date: data.date,
        reference: data.reference,
        description: data.description,
        note: data.notes,
        allocations: {
          deleteMany: {},
          create: data.allocations.map((a) => ({
            accountId: a.accountId,
            amount: a.amount,
            description: a.description,
          })),
        },
      },
    });

    return transaction;
  });

  revalidatePath("/cash-bank/transaction");
  revalidatePath("/accounting/journal-entries");
  return result;
}

export async function approveCashTransaction(id: string) {
  const session = await verifySession();
  const userId = session.userId;

  const transaction = await prisma.cashTransaction.findUnique({
    where: { id },
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  if (transaction.status === CashTransactionStatus.APPROVED) {
    throw new Error("Transaction already approved");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update Journal Entry to POSTED
    await tx.journalEntry.update({
      where: { id: transaction.journalEntryId },
      data: {
        status: EntryStatus.posted,
        postedAt: new Date(),
      },
    });

    // Update Transaction to APPROVED
    const approvedTransaction = await tx.cashTransaction.update({
      where: { id },
      data: {
        status: CashTransactionStatus.APPROVED,
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    return approvedTransaction;
  });

  revalidatePath("/cash-bank/transaction");
  revalidatePath("/accounting/journal-entries");
  revalidatePath("/cash-bank"); // For dashboard stats
  return result;
}

export async function deleteCashTransaction(id: string) {
  const transaction = await prisma.cashTransaction.findUnique({
    where: { id },
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  if (transaction.status === CashTransactionStatus.APPROVED) {
    throw new Error("Cannot delete approved transaction");
  }

  await prisma.$transaction(async (tx) => {
    // First delete the transaction
    await tx.cashTransaction.delete({
      where: { id },
    });

    // Then delete the associated journal entry
    // Note: If attachments are linked to JE, they might need handling if we want to delete files too,
    // but typically we keep files or rely on periodic cleanup.
    // The File records in DB will remain, but relation to JE is removed when JE is deleted.
    await tx.journalEntry.delete({
      where: { id: transaction.journalEntryId },
    });
  });

  revalidatePath("/cash-bank/transaction");
  revalidatePath("/accounting/journal-entries");
}
