"use server";

import { prisma } from "@/lib/prisma";
import { CashAccountFormData, CashTransferFormData } from "./types";
import { revalidatePath } from "next/cache";
import { CashAccountType, EntryStatus } from "@/prisma/generated/prisma/enums";
import {
  JournalEntryLine,
  JournalEntry,
  Prisma,
} from "@/prisma/generated/prisma/client";

// --- Cash Account Actions ---

export async function getCashAccounts() {
  const accounts = await prisma.cashAccount.findMany({
    include: {
      glAccount: true,
    },
    orderBy: {
      name: "asc",
    },
  });
  return accounts;
}

export async function getCashAccount(id: string) {
  const account = await prisma.cashAccount.findUnique({
    where: { id },
    include: {
      glAccount: true,
    },
  });
  return account;
}

export async function createCashAccount(data: CashAccountFormData) {
  const account = await prisma.cashAccount.create({
    data: {
      name: data.name,
      type: data.type,
      accountNumber: data.accountNumber,
      bankName: data.bankName,
      description: data.description,
      glAccountId: data.glAccountId,
    },
  });
  revalidatePath("/accounting/cash-bank");
  return account;
}

export async function updateCashAccount(id: string, data: CashAccountFormData) {
  const account = await prisma.cashAccount.update({
    where: { id },
    data: {
      name: data.name,
      type: data.type,
      accountNumber: data.accountNumber,
      bankName: data.bankName,
      description: data.description,
      glAccountId: data.glAccountId,
    },
  });
  revalidatePath("/accounting/cash-bank");
  return account;
}

export async function deleteCashAccount(id: string) {
  // Check if there are any transfers associated with this account
  const transfers = await prisma.cashTransfer.findFirst({
    where: {
      OR: [{ fromAccountId: id }, { toAccountId: id }],
    },
  });

  if (transfers) {
    throw new Error("Cannot delete account with existing transfers.");
  }

  await prisma.cashAccount.delete({
    where: { id },
  });
  revalidatePath("/accounting/cash-bank");
}

import { verifySession } from "@/lib/auth/auth";

// --- Transfer Actions ---

export async function createCashTransfer(data: CashTransferFormData) {
  const session = await verifySession();
  const userId = session.userId;

  // 1. Validate accounts
  const fromAccount = await prisma.cashAccount.findUnique({
    where: { id: data.fromAccountId },
    include: { glAccount: true },
  });
  const toAccount = await prisma.cashAccount.findUnique({
    where: { id: data.toAccountId },
    include: { glAccount: true },
  });

  if (!fromAccount || !toAccount) {
    throw new Error("Invalid accounts.");
  }

  if (data.fromAccountId === data.toAccountId) {
    throw new Error("Cannot transfer to the same account.");
  }

  // 2. Create Transfer and Journal Entry in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create Journal Entry
    // Credit From Account (Asset decrease), Debit To Account (Asset increase)
    const journalEntry = await tx.journalEntry.create({
      data: {
        userId,
        entryNumber: `TRF-${Date.now()}`, // Simple generation, maybe improve later
        transactionDate: data.date,
        description:
          data.description ||
          `Transfer from ${fromAccount.name} to ${toAccount.name}`,
        status: "posted", // Transfers are immediate
        postedAt: new Date(),
        lines: {
          create: [
            {
              accountId: toAccount.glAccountId,
              debitAmount: data.amount,
              creditAmount: 0,
              description: `Transfer from ${fromAccount.name}`,
              lineNumber: 1,
            },
            {
              accountId: fromAccount.glAccountId,
              debitAmount: 0,
              creditAmount: data.amount,
              description: `Transfer to ${toAccount.name}`,
              lineNumber: 2,
            },
          ],
        },
      },
    });

    // Create Cash Transfer record
    const transfer = await tx.cashTransfer.create({
      data: {
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        amount: data.amount,
        date: data.date,
        reference: data.reference,
        description: data.description,
        journalEntryId: journalEntry.id,
      },
    });

    return transfer;
  });

  revalidatePath("/accounting/cash-bank");
  revalidatePath("/accounting/transfer");
  return result;
}

export async function getTransfers() {
  const transfers = await prisma.cashTransfer.findMany({
    include: {
      fromAccount: true,
      toAccount: true,
      journalEntry: true,
    },
    orderBy: {
      date: "desc",
    },
  });
  return transfers;
}

export async function getCashTransfers(accountId?: string) {
  const where = accountId
    ? {
        OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
      }
    : {};

  const transfers = await prisma.cashTransfer.findMany({
    where,
    include: {
      fromAccount: true,
      toAccount: true,
      journalEntry: true,
    },
    orderBy: {
      date: "desc",
    },
  });
  return transfers;
}

export async function getCashAccountDetails(
  id: string,
  params?: {
    page?: number;
    pageSize?: number;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const { page = 1, pageSize = 20, startDate, endDate } = params || {};
  const skip = (page - 1) * pageSize;

  const account = await prisma.cashAccount.findUnique({
    where: { id },
    include: {
      glAccount: true,
    },
  });

  if (!account) return null;

  const where: Prisma.JournalEntryLineWhereInput = {
    accountId: account.glAccountId,
    journalEntry: {
      status: EntryStatus.posted,
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  };

  // Get total count for pagination
  const totalCount = await prisma.journalEntryLine.count({ where });

  // Fetch paginated lines
  const lines = await prisma.journalEntryLine.findMany({
    where,
    include: {
      journalEntry: true,
    },
    orderBy: [
      {
        journalEntry: {
          transactionDate: "desc",
        },
      },
      {
        id: "desc",
      },
    ],
    take: pageSize,
    skip,
  });

  // Calculate balances
  // We need the balance *before* the oldest item on this page (which is the last item in the 'lines' array)
  // Balance = Sum(Debit - Credit) of all items older than the last item

  let linesWithBalance: (Omit<JournalEntryLine, "runningBalance"> & {
    journalEntry: JournalEntry;
    runningBalance: number;
  })[] = [];

  if (lines.length > 0) {
    const lastLine = lines[lines.length - 1];

    // Calculate base balance (sum of all OLDER transactions)
    // Older means: date < lastLine.date OR (date = lastLine.date AND id < lastLine.id)
    const olderWhere: Prisma.JournalEntryLineWhereInput = {
      accountId: account.glAccountId,
      journalEntry: {
        status: EntryStatus.posted,
      },
      OR: [
        {
          journalEntry: {
            transactionDate: {
              lt: lastLine.journalEntry.transactionDate,
            },
          },
        },
        {
          journalEntry: {
            transactionDate: lastLine.journalEntry.transactionDate,
          },
          id: {
            lt: lastLine.id,
          },
        },
      ],
    };

    const aggregations = await prisma.journalEntryLine.aggregate({
      where: olderWhere,
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    let currentRunningBalance =
      Number(aggregations._sum?.debitAmount ?? 0) -
      Number(aggregations._sum?.creditAmount ?? 0);

    // If account is Credit normal (Liability/Equity), flip the sign?
    // Usually Cash is Asset (Debit Normal).
    // If it's a Bank Account (Asset), Balance = Debit - Credit.
    // If it's a Credit Card (Liability), Balance = Credit - Debit.
    // For now, assuming Cash/Bank are Assets:
    // Balance = Sum(Debit) - Sum(Credit).

    // Now iterate lines in reverse (oldest to newest) to calculate running balance
    linesWithBalance = lines.reverse().map((line) => {
      const debit = Number(line.debitAmount);
      const credit = Number(line.creditAmount);
      currentRunningBalance += debit - credit;

      const { runningBalance, ...rest } = line as any;
      return {
        ...rest,
        runningBalance: currentRunningBalance,
      };
    });

    // Reverse back to DESC for display
    linesWithBalance.reverse();
  }

  // Calculate total current balance for the account (all time)
  const totalBalanceAgg = await prisma.journalEntryLine.aggregate({
    where: {
      accountId: account.glAccountId,
      journalEntry: { status: EntryStatus.posted },
    },
    _sum: { debitAmount: true, creditAmount: true },
  });

  const totalBalance =
    Number(totalBalanceAgg._sum.debitAmount ?? 0) -
    Number(totalBalanceAgg._sum.creditAmount ?? 0);

  // Calculate period totals (filtered)
  const periodAgg = await prisma.journalEntryLine.aggregate({
    where,
    _sum: { debitAmount: true, creditAmount: true },
  });

  const periodTotals = {
    debit: Number(periodAgg._sum.debitAmount ?? 0),
    credit: Number(periodAgg._sum.creditAmount ?? 0),
  };

  return {
    account,
    lines: linesWithBalance,
    totalCount,
    totalBalance,
    periodTotals,
  };
}

export async function getAvailableGLAccounts() {
  // Fetch asset accounts that are not already linked to a cash account
  // Note: This might be too restrictive if we want to allow multiple cash accounts to point to same GL (unlikely but possible)
  // For now, let's just fetch all asset accounts that accept posting
  return await prisma.account.findMany({
    where: {
      type: "asset",
      isPosting: true,
    },
    orderBy: {
      code: "asc",
    },
  });
}
