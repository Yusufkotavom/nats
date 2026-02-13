"use server";

import { prisma } from "@/lib/prisma";
import { CashAccountFormData, CashTransferFormData } from "./types";
import { revalidatePath } from "next/cache";
import { SuperJSON } from "@/lib/superjson";
import {
  CashAccountType,
  EntryStatus,
  TransferStatus,
} from "@/prisma/generated/prisma/enums";
import {
  JournalEntryLine,
  JournalEntry,
  Prisma,
} from "@/prisma/generated/prisma/client";
import { saveFile } from "@/lib/file-service";
import { verifySession } from "@/lib/auth/auth";
import { SuperJSONResult } from "superjson";

export async function uploadTransferAttachment(formData: FormData) {
  const session = await verifySession();
  const file = formData.get("file") as File;

  if (!file) {
    throw new Error("No file provided");
  }

  const { url } = await saveFile(file);

  const dbFile = await prisma.file.create({
    data: {
      id: crypto.randomUUID(),
      name: file.name,
      url: url,
      mimeType: file.type,
      size: file.size,
      uploadedById: session.userId,
    },
  });

  return {
    success: true,
    file: {
      id: dbFile.id,
      name: dbFile.name,
      url: dbFile.url,
    },
  };
}

// --- Cash Account Actions ---

export async function getDashboardStats() {
  const accounts = await prisma.cashAccount.findMany({
    include: { glAccount: true },
  });

  const glAccountIds = accounts.map((a) => a.glAccountId);

  const balances = await prisma.journalEntryLine.groupBy({
    by: ["accountId"],
    where: {
      accountId: { in: glAccountIds },
      journalEntry: { status: EntryStatus.posted },
    },
    _sum: {
      debitAmount: true,
      creditAmount: true,
    },
  });

  const balanceMap = new Map();
  balances.forEach((b) => {
    // Assuming Asset: Balance = Debit - Credit
    const balance =
      (Number(b._sum.debitAmount) || 0) - (Number(b._sum.creditAmount) || 0);
    balanceMap.set(b.accountId, balance);
  });

  const accountsWithBalance = accounts.map((a) => ({
    ...a,
    balance: balanceMap.get(a.glAccountId) || 0,
  }));

  const totalCash = accountsWithBalance
    .filter((a) => a.type === CashAccountType.CASH)
    .reduce((sum, a) => sum + a.balance, 0);

  const totalBank = accountsWithBalance
    .filter((a) => a.type === CashAccountType.BANK)
    .reduce((sum, a) => sum + a.balance, 0);

  // Recent Transactions (Limit 10)
  const recentTransactions = await prisma.journalEntryLine.findMany({
    where: {
      accountId: { in: glAccountIds },
      journalEntry: { status: EntryStatus.posted },
    },
    include: {
      journalEntry: {
        include: {
          cashTransaction: {
            include: {
              contact: true,
            },
          },
        },
      },
      account: true,
    },
    orderBy: {
      journalEntry: { transactionDate: "desc" },
    },
    take: 10,
  });

  return {
    accounts: accountsWithBalance,
    summary: {
      totalBalance: totalCash + totalBank,
      totalCash,
      totalBank,
    },
    recentTransactions: SuperJSON.serialize(recentTransactions),
  };
}

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

// --- Transfer Actions ---

export async function createCashTransfer(
  data: CashTransferFormData | SuperJSONResult,
) {
  const session = await verifySession();
  const userId = session.userId;

  const data2 = SuperJSON.deserialize(
    data as unknown as SuperJSONResult,
  ) as CashTransferFormData;
  // 1. Validate accounts
  const fromAccount = await prisma.cashAccount.findUnique({
    where: { id: data2.fromAccountId },
    include: { glAccount: true },
  });
  const toAccount = await prisma.cashAccount.findUnique({
    where: { id: data2.toAccountId },
    include: { glAccount: true },
  });

  if (!fromAccount || !toAccount) {
    throw new Error("Invalid accounts.");
  }

  if (data2.fromAccountId === data2.toAccountId) {
    throw new Error("Cannot transfer to the same account.");
  }

  // 2. Create Transfer (Pending Approval)
  const transfer = await prisma.cashTransfer.create({
    data: data2,
  });

  revalidatePath("/accounting/cash-bank");
  revalidatePath("/accounting/transfer");
  return transfer;
}

export async function updateCashTransfer(
  id: string,
  data: CashTransferFormData | SuperJSONResult,
) {
  const transfer = await prisma.cashTransfer.findUnique({
    where: { id },
  });

  if (!transfer) {
    throw new Error("Transfer not found");
  }

  if (transfer.status === TransferStatus.APPROVED) {
    throw new Error("Cannot edit approved transfer");
  }

  const data2 = SuperJSON.deserialize(
    data as unknown as SuperJSONResult,
  ) as CashTransferFormData;

  // Validate accounts
  if (data2.fromAccountId === data2.toAccountId) {
    throw new Error("Cannot transfer to the same account.");
  }

  const updatedTransfer = await prisma.cashTransfer.update({
    where: { id },
    data: data2,
  });

  revalidatePath("/accounting/cash-bank");
  revalidatePath("/accounting/transfer");
  return updatedTransfer;
}

export async function approveCashTransfer(id: string) {
  const session = await verifySession();
  const userId = session.userId;

  const transfer = await prisma.cashTransfer.findUnique({
    where: { id },
    include: {
      fromAccount: { include: { glAccount: true } },
      toAccount: { include: { glAccount: true } },
    },
  });

  if (!transfer) {
    throw new Error("Transfer not found");
  }

  if (transfer.status === TransferStatus.APPROVED) {
    throw new Error("Transfer already approved");
  }

  // Create Journal Entry and Update Transfer
  const result = await prisma.$transaction(async (tx) => {
    // Create Journal Entry
    // Credit From Account (Asset decrease), Debit To Account (Asset increase)
    const journalEntry = await tx.journalEntry.create({
      data: {
        userId,
        entryNumber: `TRF-${Date.now()}`,
        transactionDate: transfer.date,
        description:
          transfer.description ||
          `Transfer from ${transfer.fromAccount.name} to ${transfer.toAccount.name}`,
        status: EntryStatus.posted,
        postedAt: new Date(),
        lines: {
          create: [
            {
              accountId: transfer.toAccount.glAccountId,
              debitAmount: transfer.amount,
              creditAmount: 0,
              description: `Transfer from ${transfer.fromAccount.name}`,
              lineNumber: 1,
            },
            {
              accountId: transfer.fromAccount.glAccountId,
              debitAmount: 0,
              creditAmount: transfer.amount,
              description: `Transfer to ${transfer.toAccount.name}`,
              lineNumber: 2,
            },
          ],
        },
      },
    });

    const approvedTransfer = await tx.cashTransfer.update({
      where: { id },
      data: {
        status: TransferStatus.APPROVED,
        journalEntryId: journalEntry.id,
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    return approvedTransfer;
  });

  revalidatePath("/accounting/cash-bank");
  revalidatePath("/accounting/transfer");
  return result;
}

export async function deleteCashTransfer(id: string) {
  const transfer = await prisma.cashTransfer.findUnique({
    where: { id },
  });

  if (!transfer) {
    throw new Error("Transfer not found");
  }

  if (transfer.status === TransferStatus.APPROVED) {
    throw new Error("Cannot delete approved transfer");
  }

  await prisma.cashTransfer.delete({
    where: { id },
  });

  revalidatePath("/accounting/cash-bank");
  revalidatePath("/accounting/transfer");
}

export async function getTransfers() {
  const transfers = await prisma.cashTransfer.findMany({
    include: {
      fromAccount: true,
      toAccount: true,
      journalEntry: {
        include: {
          attachments: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });
  return SuperJSON.serialize(transfers);
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
      journalEntry: {
        include: {
          attachments: true,
        },
      },
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
  },
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
      journalEntry: {
        include: {
          attachments: true,
        },
      },
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
            id: {
              lt: lastLine.id,
            },
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
