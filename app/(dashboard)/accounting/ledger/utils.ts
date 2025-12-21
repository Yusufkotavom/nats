import { prisma } from "@/lib/prisma";

import { Prisma } from "@/prisma/generated/prisma/client";

/**
 * Recalculates the running balance for a specific account starting from a given date.
 * This should be called whenever a posted journal entry is added, updated, or deleted.
 *
 * Strategy:
 * 1. Find the last running balance before the fromDate.
 * 2. Fetch all posted lines on or after fromDate.
 * 3. Iterate and update runningBalance for each line.
 */
export async function recalculateAccountRunningBalances(
  accountId: string,
  fromDate?: Date
) {
  // 1. Find the last valid anchor (posted line with a non-null runningBalance)
  // If fromDate is provided, we look before that date.
  // If not, we look for the latest calculated balance to continue from?
  // No, if we want to ensure consistency, if fromDate is null, we might mean "recalc everything".
  // But usually we call this with a specific date (the date of the changed entry).

  const whereDateClause = fromDate ? { transactionDate: { lt: fromDate } } : {};

  const anchor = await prisma.journalEntryLine.findFirst({
    where: {
      accountId,
      runningBalance: { not: null },
      journalEntry: {
        status: "posted",
        ...whereDateClause,
      },
    },
    orderBy: [
      { journalEntry: { transactionDate: "desc" } },
      { journalEntry: { createdAt: "desc" } },
    ],
    include: { journalEntry: true },
  });

  let currentBalance = anchor?.runningBalance
    ? Number(anchor.runningBalance)
    : 0;

  // 2. Determine where to start fetching lines to update
  // If we found an anchor, we start AFTER that anchor.
  // If we didn't find an anchor, we start from the beginning.

  const fetchWhere: Prisma.JournalEntryLineWhereInput = {
    accountId,
    journalEntry: {
      status: "posted",
    },
  };

  if (anchor) {
    // We want lines that are "after" the anchor.
    // "After" means: (Date > AnchorDate) OR (Date == AnchorDate AND CreatedAt > AnchorCreatedAt)
    // Prisma doesn't support tuple comparison easily in `where`.
    // Easier approach: Fetch all >= AnchorDate, then filter in JS?
    // Or just fetch all >= AnchorDate.
    // Note: The anchor itself matches >= AnchorDate. We should exclude it.
    fetchWhere.journalEntry = {
      ...(fetchWhere.journalEntry as Prisma.JournalEntryWhereInput),
      transactionDate: { gte: anchor.journalEntry.transactionDate },
    };
  } else {
    // Fetch everything
  }

  // 3. Fetch lines
  const linesToUpdate = await prisma.journalEntryLine.findMany({
    where: fetchWhere,
    orderBy: [
      { journalEntry: { transactionDate: "asc" } },
      { journalEntry: { createdAt: "asc" } },
    ],
    select: {
      id: true,
      debitAmount: true,
      creditAmount: true,
      journalEntry: { select: { transactionDate: true, createdAt: true } },
    },
  });

  // 4. Iterate and Calculate
  const updates = [];

  // If we fetched starting from AnchorDate, we might have included the anchor itself or previous lines on the same day?
  // We need to skip lines that are "before or equal" to the anchor in sort order.

  for (const line of linesToUpdate) {
    if (anchor) {
      if (
        line.journalEntry.transactionDate < anchor.journalEntry.transactionDate
      )
        continue; // Should be handled by query
      if (
        line.journalEntry.transactionDate.getTime() ===
        anchor.journalEntry.transactionDate.getTime()
      ) {
        if (line.journalEntry.createdAt <= anchor.journalEntry.createdAt)
          continue;
      }
    }

    const debit = Number(line.debitAmount);
    const credit = Number(line.creditAmount);
    const net = debit - credit;

    currentBalance += net;

    updates.push(
      prisma.journalEntryLine.update({
        where: { id: line.id },
        data: { runningBalance: currentBalance },
      })
    );
  }

  // 5. Execute updates
  // Chunking to avoid "too many variables" or transaction limits if necessary.
  // For now, simple transaction.
  if (updates.length > 0) {
    // Execute in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      await prisma.$transaction(chunk);
    }
  }
}
