"use server";

import { prisma } from "@/lib/prisma";
import { CashAccountFormData, CashTransferFormData } from "./types";
import { revalidatePath } from "next/cache";
import { CashAccountType } from "@/prisma/generated/prisma/enums";

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

export async function getCashAccountDetails(id: string) {
  const account = await prisma.cashAccount.findUnique({
    where: { id },
    include: {
      glAccount: true,
    },
  });

  if (!account) return null;

  // Fetch journal entry lines for this account
  const lines = await prisma.journalEntryLine.findMany({
    where: {
      accountId: account.glAccountId,
      journalEntry: {
        status: "posted",
      },
    },
    include: {
      journalEntry: true,
    },
    orderBy: {
      journalEntry: {
        transactionDate: "desc",
      },
    },
  });

  return { account, lines };
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
