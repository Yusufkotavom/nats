"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function getPostingAccounts() {
  try {
    const accounts = await prisma.account.findMany({
      where: {
        isPosting: true,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: {
        code: "asc",
      },
    });
    return { success: true, data: accounts };
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return { success: false, error: "Failed to fetch accounts" };
  }
}

export async function getLedgerEntries(
  accountId: string,
  page: number = 1,
  pageSize: number = 20,
  startDate?: string,
  endDate?: string,
  onlyDraft: boolean = false
) {
  try {
    const skip = (page - 1) * pageSize;

    const where: Prisma.JournalEntryLineWhereInput = {
      accountId: accountId,
    };

    if (startDate || endDate || onlyDraft) {
      const journalEntryWhere: Prisma.JournalEntryWhereInput = {};

      if (startDate) {
        journalEntryWhere.transactionDate = {
          ...(journalEntryWhere.transactionDate as Prisma.DateTimeFilter),
          gte: new Date(startDate),
        };
      }

      if (endDate) {
        journalEntryWhere.transactionDate = {
          ...(journalEntryWhere.transactionDate as Prisma.DateTimeFilter),
          lte: new Date(endDate),
        };
      }

      if (onlyDraft) {
        journalEntryWhere.status = "draft";
      }

      where.journalEntry = journalEntryWhere;
    }

    const [total, lines, aggregates, account] = await prisma.$transaction([
      prisma.journalEntryLine.count({
        where,
      }),
      prisma.journalEntryLine.findMany({
        where,
        include: {
          journalEntry: {
            select: {
              entryNumber: true,
              transactionDate: true,
              description: true,
              status: true,
            },
          },
        },
        orderBy: {
          journalEntry: {
            transactionDate: "desc",
          },
        },
        skip,
        take: pageSize,
      }),
      prisma.journalEntryLine.aggregate({
        where,
        _sum: {
          debitAmount: true,
          creditAmount: true,
        },
      }),
      prisma.account.findUnique({
        where: { id: accountId },
        select: { normalBalance: true },
      }),
    ]);

    const serializedLines = lines.map((line) => ({
      ...line,
      debitAmount: Number(line.debitAmount),
      creditAmount: Number(line.creditAmount),
    }));

    return {
      success: true,
      data: serializedLines,
      pagination: {
        total,
        totalPages: Math.ceil(total / pageSize),
        currentPage: page,
        pageSize,
      },
      totals: {
        debit: Number(aggregates._sum.debitAmount || 0),
        credit: Number(aggregates._sum.creditAmount || 0),
      },
      account,
    };
  } catch (error) {
    console.error("Error fetching ledger entries:", error);
    return { success: false, error: "Failed to fetch ledger entries" };
  }
}
