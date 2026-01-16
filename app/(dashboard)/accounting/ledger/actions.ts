"use server";

import { prisma, serializePrisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { getPaginationMetadata } from "@/lib/pagination";

/**
 * Fetch all accounts that can be posted to (isPosting = true).
 * Used for populating account selectors in forms.
 * Permission: "ledger.view"
 *
 * @returns - Object containing list of posting accounts
 */
export const getLedgerAccounts = authorizedAction("ledger.view", async () => {
  try {
    const accounts = await prisma.account.findMany({
      where: {
        isPosting: true,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        type: true,
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
});

/**
 * Fetch ledger entries for a specific account with pagination and filtering.
 * Calculates running balances dynamically, handling both draft and posted entries.
 * Permission: "ledger.view"
 *
 * @param accountId - The ID of the account to fetch ledger for
 * @param page      - Page number (1-based, default: 1)
 * @param pageSize  - Items per page (default: 20)
 * @param startDate - Optional start date filter
 * @param endDate   - Optional end date filter
 * @param showDraft - If true, only shows draft entries
 *
 * @returns - Object containing ledger lines, pagination metadata, totals, and account info
 */
export const getAccountHistory = authorizedAction(
  "ledger.view",
  async ({
    accountId,
    page = 1,
    pageSize = 20,
    startDate,
    endDate,
    showDraft = false,
  }: {
    accountId: string;
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    showDraft?: boolean;
  }) => {
    try {
      const skip = (page - 1) * pageSize;

      const where: Prisma.JournalEntryLineWhereInput = {
        accountId: accountId,
      };

      if (startDate || endDate || showDraft) {
        const journalEntryWhere: Prisma.JournalEntryWhereInput = {};

        if (startDate) {
          journalEntryWhere.postedAt = {
            ...(journalEntryWhere.postedAt as Prisma.DateTimeFilter),
            gte: new Date(startDate),
          };
        }

        if (endDate) {
          journalEntryWhere.postedAt = {
            ...(journalEntryWhere.postedAt as Prisma.DateTimeFilter),
            lte: new Date(endDate),
          };
        }

        if (!showDraft) {
          journalEntryWhere.status = "posted";
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
                createdAt: true,
                postedAt: true,
                status: true,
              },
            },
          },
          orderBy: [
            { journalEntry: { postedAt: "desc" } },
            { journalEntry: { createdAt: "desc" } }, // Ensure stable sort
          ],
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

      const finalLines = serializePrisma(lines);

      return {
        success: true,
        data: {
          items: finalLines,
          pagination: getPaginationMetadata(total, page, pageSize),
          totals: {
            debit: aggregates._sum.debitAmount?.toNumber() || 0,
            credit: aggregates._sum.creditAmount?.toNumber() || 0,
          },
          account,
        },
      };
    } catch (error) {
      console.error("Error fetching ledger entries:", error);
      return { success: false, error: "Failed to fetch ledger entries" };
    }
  }
);
