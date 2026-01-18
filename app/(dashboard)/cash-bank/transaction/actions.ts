"use server";

import { prisma } from "@/lib/prisma";
import { CashTransactionFormData } from "./types";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/auth";
import {
  CashTransactionType,
  EntryStatus,
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
        status: EntryStatus.posted,
        userId: session.userId,
        postedAt: new Date(),
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
