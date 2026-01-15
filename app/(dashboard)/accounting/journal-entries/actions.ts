"use server";

import { prisma, serializePrisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";
import { EntryStatus } from "@/prisma/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { getSession } from "@/lib/auth/auth";
import { CreateJournalEntryData } from "../types";

/**
 * Fetch journal entries with pagination and filtering.
 * Permission: "journal_entries.view"
 *
 * @param page      - Page number (default: 1)
 * @param pageSize  - Items per page (default: 20)
 * @param startDate - Optional start date filter
 * @param endDate   - Optional end date filter
 * @param status    - Optional status filter ("draft", "posted", "all")
 * @param search    - Optional search string for description or entry number
 *
 * @returns - Object containing entries and pagination metadata
 */
export const getJournalEntries = authorizedAction(
  "journal_entries.view",
  async (
    page: number = 1,
    pageSize: number = 20,
    startDate?: string,
    endDate?: string,
    status?: string,
    search?: string
  ) => {
    const where: Prisma.JournalEntryWhereInput = {};
    if (status && status !== "all") {
      where.status = status as EntryStatus;
    }
    if (startDate) {
      where.transactionDate = {
        ...((where.transactionDate as Prisma.DateTimeFilter) || {}),
        gte: new Date(startDate),
      };
    }
    if (endDate) {
      where.transactionDate = {
        ...((where.transactionDate as Prisma.DateTimeFilter) || {}),
        lte: new Date(endDate),
      };
    }
    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { entryNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * pageSize;
    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        orderBy: { postedAt: "desc" },
        include: {
          lines: {
            include: {
              account: true,
              contact: true,
            },
            orderBy: { lineNumber: "asc" },
          },
          user: {
            select: { name: true, email: true },
          },
          attachments: true,
        },
        skip,
        take: pageSize,
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return {
      success: true,
      data: serializePrisma(entries),
      pagination: {
        total,
        totalPages: Math.ceil(total / pageSize),
        currentPage: page,
        pageSize,
      },
    };
  }
);

/**
 * Fetch a single journal entry by ID.
 * Permission: "journal_entries.view"
 *
 * @param id - The ID of the journal entry
 * @returns - Object containing the journal entry with lines, user, and attachments
 */
export const getJournalEntry = authorizedAction(
  "journal_entries.view",
  async (id: string) => {
    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            account: { select: { name: true, code: true } },
            contact: { select: { name: true } },
          },
          orderBy: { lineNumber: "asc" },
        },
        user: {
          select: { name: true, email: true },
        },
        attachments: true,
      },
    });
    if (!entry) return { success: false, error: "Journal entry not found" };

    return { success: true, data: serializePrisma(entry) };
  }
);

/**
 * Create a new journal entry.
 * Permission: "journal_entries.create"
 *
 * @param data - The journal entry data including lines and attachments
 * @returns - Object containing the created entry or error
 */
export const createJournalEntry = authorizedAction(
  "journal_entries.create",
  async (data: CreateJournalEntryData) => {
    try {
      const user = await getSession();

      if (!user?.userId) {
        return { success: false, error: "User not authenticated" };
      }

      // Validate debit = credit
      const totalDebit =
        data?.lines.reduce(
          (sum, line) => sum + (line?.debitAmount?.toNumber() || 0),
          0
        ) || 0;
      const totalCredit =
        data?.lines.reduce(
          (sum, line) => sum + (line?.creditAmount?.toNumber() || 0),
          0
        ) || 0;

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        // Floating point tolerance
        return { success: false, error: "Debits must equal credits" };
      }

      // Generate entry number (simple auto-increment logic or similar)
      // For now, let's use a timestamp-based random string or similar,
      // or we can query the last one.
      // Let's stick to a simple format: JE-YYYYMMDD-XXXX
      const dateStr = data?.transactionDate
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");
      const count = await prisma.journalEntry.count({
        where: {
          entryNumber: {
            startsWith: `JE-${dateStr}-`,
          },
        },
      });
      const entryNumber = `JE-${dateStr}-${(count + 1)
        .toString()
        .padStart(4, "0")}`;

      const entry = await prisma.journalEntry.create({
        data: {
          userId: user?.userId,
          entryNumber,
          transactionDate: data?.transactionDate || new Date(),
          description: data?.description,
          notes: data?.notes,
          status: "draft",
          lines: {
            create: data?.lines.map((line, index) => ({
              accountId: line.accountId,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              description: line.description,
              contactId: line.contactId,
              lineNumber: index + 1,
            })),
          },
          attachments: data?.attachments?.length
            ? {
                connect: data.attachments.map((a) => ({ id: a.id })),
              }
            : undefined,
        },
      });

      // Need to refetch to include relations or just return what we have with IDs?
      // The UI might expect relations if it adds it to the list, but typically it redirects.
      // However, createJournalEntry returns 'entry' which has no lines loaded (or they are in a different format).
      // The create call returns the created object.

      // Let's refetch to be safe and consistent with getJournalEntry
      const createdEntry = await prisma.journalEntry.findUnique({
        where: { id: entry.id },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
          user: {
            select: { name: true, email: true },
          },
          attachments: true,
        },
      });

      if (!createdEntry) throw new Error("Failed to fetch created entry");

      revalidatePath("/accounting/journal-entries");
      return { success: true, data: serializePrisma(entry) };
    } catch (error) {
      console.error("Failed to create journal entry:", error);
      return { success: false, error: "Failed to create journal entry" };
    }
  }
);

export async function updateJournalEntry(
  id: string,
  data: CreateJournalEntryData
) {
  try {
    const existingEntry = await prisma.journalEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return { success: false, error: "Journal entry not found" };
    }

    if (existingEntry.status === "posted") {
      return { success: false, error: "Cannot edit posted journal entries" };
    }

    // Validate debit = credit
    const totalDebit =
      data?.lines.reduce(
        (sum, line) => sum + (line?.debitAmount?.toNumber() || 0),
        0
      ) || 0;
    const totalCredit =
      data?.lines.reduce(
        (sum, line) => sum + (line?.creditAmount?.toNumber() || 0),
        0
      ) || 0;

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return { success: false, error: "Debits must equal credits" };
    }

    // Transaction to update
    await prisma.$transaction(async (tx) => {
      // Delete existing lines
      await tx.journalEntryLine.deleteMany({
        where: { journalEntryId: id },
      });

      // Update entry and create new lines
      await tx.journalEntry.update({
        where: { id },
        data: {
          transactionDate: data?.transactionDate,
          description: data?.description,
          lines: {
            create: data?.lines.map((line, index) => ({
              accountId: line.accountId,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              description: line.description,
              contactId: line.contactId,
              lineNumber: index + 1,
            })),
          },
          attachments: {
            set: data?.attachments?.map((a) => ({ id: a.id })) || [],
          },
        },
      });
    });

    revalidatePath("/accounting/journal-entries");
    revalidatePath(`/accounting/journal-entries/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update journal entry:", error);
    return { success: false, error: "Failed to update journal entry" };
  }
}

/**
 * Delete a journal entry.
 * Cannot delete if the entry is already posted.
 *
 * @param id - The ID of the entry to delete
 * @returns  - Success flag or error
 */
export async function deleteJournalEntry(id: string) {
  try {
    const existingEntry = await prisma.journalEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return { success: false, error: "Journal entry not found" };
    }

    if (existingEntry.status === "posted") {
      return { success: false, error: "Cannot delete posted journal entries" };
    }

    await prisma.journalEntryLine.deleteMany({
      where: { journalEntryId: id },
    });

    await prisma.journalEntry.delete({
      where: { id },
    });

    revalidatePath("/accounting/journal-entries");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete journal entry:", error);
    return { success: false, error: "Failed to delete journal entry" };
  }
}

export async function postJournalEntry(id: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingEntry = await tx.journalEntry.findUnique({
        where: { id },
        include: {
          lines: {
            orderBy: { lineNumber: "asc" },
            include: { account: true },
          },
        },
      });

      if (!existingEntry) {
        return { success: false, error: "Journal entry not found" };
      }

      if (existingEntry.status === "posted") {
        return { success: false, error: "Journal entry is already posted" };
      }

      // Double check journal entry balance
      const totalDebit = existingEntry.lines.reduce(
        (sum, line) => sum + (line?.debitAmount?.toNumber() || 0),
        0
      );
      const totalCredit = existingEntry.lines.reduce(
        (sum, line) => sum + (line?.creditAmount?.toNumber() || 0),
        0
      );

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return {
          success: false,
          error: "Cannot post unbalanced journal entry",
        };
      }

      // Update status
      await tx.journalEntry.update({
        where: { id },
        data: {
          status: "posted",
          postedAt: new Date(),
        },
      });

      // Update running balances
      const accountBalances: Record<string, number> = {};

      for (const line of existingEntry.lines) {
        const { accountId, account } = line;

        // Initialize balance for this account if not already tracked in this transaction
        if (accountBalances[accountId] === undefined) {
          const lastEntryLine = await tx.journalEntryLine.findFirst({
            where: {
              accountId,
              journalEntry: {
                status: "posted",
              },
              journalEntryId: { not: id },
            },
            orderBy: [
              { journalEntry: { postedAt: "desc" } },
              { journalEntry: { createdAt: "desc" } },
            ],
            select: { runningBalance: true },
          });
          accountBalances[accountId] =
            lastEntryLine?.runningBalance?.toNumber() || 0;
        }

        // Update balance based on normal balance type
        const debit = line.debitAmount.toNumber();
        const credit = line.creditAmount.toNumber();

        if (account.normalBalance === "credit") {
          accountBalances[accountId] =
            accountBalances[accountId] - debit + credit;
        } else {
          accountBalances[accountId] =
            accountBalances[accountId] + debit - credit;
        }

        // Update line with new running balance
        await tx.journalEntryLine.update({
          where: { id: line.id },
          data: { runningBalance: accountBalances[accountId] },
        });
      }

      return { success: true };
    });

    if (result.success) {
      revalidatePath("/accounting/journal-entries");
      revalidatePath(`/accounting/journal-entries/${id}`);
    }

    return result;
  } catch (error) {
    console.error("Failed to post journal entry:", error);
    return { success: false, error: "Failed to post journal entry" };
  }
}
