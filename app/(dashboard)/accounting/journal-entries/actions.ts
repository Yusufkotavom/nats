"use server";

import { prisma, serializePrisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";
import { EntryStatus } from "@/prisma/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { getSession } from "@/lib/auth/auth";

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
        orderBy: { transactionDate: "desc" },
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

export const getJournalEntry = authorizedAction(
  "journal_entries.view",
  async (id: string) => {
    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            account: true,
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

export type CreateJournalEntryData = {
  transactionDate: Date;
  description?: string;
  lines: {
    accountId: string;
    debitAmount: number;
    creditAmount: number;
    description?: string;
  }[];
  attachments?: { id: string; name: string; url: string }[];
};

export const createJournalEntry = authorizedAction(
  "journal_entries.create",
  async (data: CreateJournalEntryData) => {
    try {
      const user = await getSession();

      if (!user?.userId) {
        return { success: false, error: "User not authenticated" };
      }

      // Validate debit = credit
      const totalDebit = data.lines.reduce(
        (sum, line) => sum + line.debitAmount,
        0
      );
      const totalCredit = data.lines.reduce(
        (sum, line) => sum + line.creditAmount,
        0
      );

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        // Floating point tolerance
        return { success: false, error: "Debits must equal credits" };
      }

      // Generate entry number (simple auto-increment logic or similar)
      // For now, let's use a timestamp-based random string or similar,
      // or we can query the last one.
      // Let's stick to a simple format: JE-YYYYMMDD-XXXX
      const dateStr = data.transactionDate
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
          transactionDate: data.transactionDate,
          description: data.description,
          status: "draft",
          lines: {
            create: data.lines.map((line, index) => ({
              accountId: line.accountId,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              description: line.description,
              lineNumber: index + 1,
            })),
          },
          attachments: data.attachments?.length
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
    const totalDebit = data.lines.reduce(
      (sum, line) => sum + line.debitAmount,
      0
    );
    const totalCredit = data.lines.reduce(
      (sum, line) => sum + line.creditAmount,
      0
    );

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
          transactionDate: data.transactionDate,
          description: data.description,
          lines: {
            create: data.lines.map((line, index) => ({
              accountId: line.accountId,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              description: line.description,
              lineNumber: index + 1,
            })),
          },
          attachments: {
            set: data.attachments?.map((a) => ({ id: a.id })) || [],
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
  const existingEntry = await prisma.journalEntry.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!existingEntry) {
    return { success: false, error: "Journal entry not found" };
  }

  if (existingEntry.status === "posted") {
    return { success: false, error: "Journal entry is already posted" };
  }

  // Double check balance
  const totalDebit = existingEntry.lines.reduce(
    (sum, line) => sum + line.debitAmount.toNumber(),
    0
  );
  const totalCredit = existingEntry.lines.reduce(
    (sum, line) => sum + line.creditAmount.toNumber(),
    0
  );

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return { success: false, error: "Cannot post unbalanced journal entry" };
  }

  await prisma.journalEntry.update({
    where: { id },
    data: {
      status: "posted",
      postedAt: new Date(),
    },
  });

  // Recalculate running balances for affected accounts
  // We need to do this AFTER status update so the query in recalculateAccountRunningBalances picks up this entry
  const { recalculateAccountRunningBalances } = await import("../ledger/utils");

  // Group lines by accountId to avoid duplicate calls if multiple lines affect same account (rare but possible)
  const accountIds = Array.from(
    new Set(existingEntry.lines.map((line) => line.accountId))
  );

  // We can run these in parallel
  await Promise.all(
    accountIds.map((accountId) =>
      recalculateAccountRunningBalances(
        accountId,
        existingEntry.transactionDate
      )
    )
  );

  revalidatePath("/accounting/journal-entries");
  revalidatePath(`/accounting/journal-entries/${id}`);
  return { success: true };
}
