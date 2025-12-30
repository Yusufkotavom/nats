"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";

/**
 * Fetch all accounts that can be posted to (isPosting = true).
 * Used for populating account selectors in forms.
 * Permission: "ledger.view"
 *
 * @returns - Object containing list of posting accounts
 */
export const getPostingAccounts = authorizedAction("ledger.view", async () => {
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
 * @param onlyDraft - If true, only shows draft entries
 *
 * @returns - Object containing ledger lines, pagination metadata, totals, and account info
 */
export const getLedgerEntries = authorizedAction(
  "ledger.view",
  async (
    accountId: string,
    page: number = 1,
    pageSize: number = 20,
    startDate?: string,
    endDate?: string,
    onlyDraft: boolean = false
  ) => {
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

      // Optimize Opening Balance: Use stored running balance if available
      let openingBalance = 0;
      let calculatedFromStored = false;

      if (startDate && !onlyDraft) {
        // Try to find the last posted entry before startDate with a valid running balance
        const lastPosted = await prisma.journalEntryLine.findFirst({
          where: {
            accountId,
            runningBalance: { not: null },
            journalEntry: {
              status: "posted",
              transactionDate: { lt: new Date(startDate) },
            },
          },
          orderBy: [
            { journalEntry: { transactionDate: "desc" } },
            { journalEntry: { createdAt: "desc" } },
          ],
          select: {
            runningBalance: true,
            journalEntry: { select: { transactionDate: true } },
          },
        });

        if (lastPosted) {
          const baseBalance = lastPosted.runningBalance?.toNumber() || 0;

          // Add SUM(All Drafts < startDate)
          const draftSumWhere: Prisma.JournalEntryLineWhereInput = {
            accountId,
            journalEntry: {
              status: "draft",
              transactionDate: { lt: new Date(startDate) },
            },
          };

          const draftAgg = await prisma.journalEntryLine.aggregate({
            where: draftSumWhere,
            _sum: { debitAmount: true, creditAmount: true },
          });

          const draftNet =
            (draftAgg._sum.debitAmount?.toNumber() || 0) -
            (draftAgg._sum.creditAmount?.toNumber() || 0);
          openingBalance = baseBalance + draftNet;
          calculatedFromStored = true;
        }
      }

      if (startDate && !calculatedFromStored) {
        // Fallback to full aggregation if optimization failed or not applicable
        const existingJournalEntryWhere =
          (where.journalEntry as Prisma.JournalEntryWhereInput) || {};
        const openingWhere: Prisma.JournalEntryLineWhereInput = {
          accountId: accountId,
          journalEntry: {
            ...existingJournalEntryWhere,
            transactionDate: {
              lt: new Date(startDate),
            },
          },
        };
        const openingAgg = await prisma.journalEntryLine.aggregate({
          where: openingWhere,
          _sum: {
            debitAmount: true,
            creditAmount: true,
          },
        });

        openingBalance =
          (openingAgg._sum.debitAmount?.toNumber() || 0) -
          (openingAgg._sum.creditAmount?.toNumber() || 0);
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
                status: true,
              },
            },
          },
          orderBy: [
            { journalEntry: { transactionDate: "desc" } },
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

      // Process lines with stored runningBalance optimization
      let processedLines = lines.map((line) => ({
        ...line,
        debitAmount: line.debitAmount.toNumber(),
        creditAmount: line.creditAmount.toNumber(),
        runningBalance: line.runningBalance
          ? line.runningBalance.toNumber()
          : null,
      }));

      // Interpolate missing running balances (for Drafts or if stored is missing)
      // We prioritize stored values.
      // If we have gaps, we calculate relative to the nearest neighbor.

      // If the page has NO valid running balances, we need an anchor.
      // The anchor is calculated from Opening Balance?
      // Wait, if we used optimized Opening Balance, we can just calculate forward?
      // But we have `lines` which are a slice (page).
      // We don't have the lines between `startDate` and this page.
      // So we can't use Opening Balance to calculate current page unless page=1.

      // If we don't have stored balances on the page, we need to fetch an anchor from DB.
      const hasMissingBalance = processedLines.some(
        (l) => l.runningBalance === null
      );

      if (hasMissingBalance) {
        // If we have at least one valid balance on the page, we can propagate.
        // If NOT, we need to fetch one anchor.
        const hasAnchorOnPage = processedLines.some(
          (l) => l.runningBalance !== null
        );

        if (!hasAnchorOnPage && processedLines.length > 0) {
          // Fetch nearest posted entry OLDER than the oldest item on this page.
          // Or NEWER than the newest.
          // Let's try older (limit 1).
          const oldestOnPage = lines[lines.length - 1];
          const anchor = await prisma.journalEntryLine.findFirst({
            where: {
              accountId,
              journalEntry: {
                status: "posted",
                transactionDate: {
                  lt: oldestOnPage.journalEntry.transactionDate,
                },
              },
            },
            orderBy: [
              { journalEntry: { transactionDate: "desc" } },
              { journalEntry: { createdAt: "desc" } },
            ],
            select: { runningBalance: true },
          });

          if (anchor && anchor.runningBalance !== null) {
            // We found an anchor BEFORE the page.
            // We can calculate the last item's balance.
            // But wait, there might be drafts between anchor and last item.
            // We need to sum those drafts.
            // This is getting complex again (re-implementing getLedgerEntries logic).
            // Alternative: Fallback to the "Total - Skipped" logic ONLY if we have missing balances?
            // But "Total - Skipped" requires fetching ALL skipped lines (slow).
            // If we are in this block, it means we have a page FULL of Drafts (or unposted).
            // Or we are viewing "Only Draft".
            // If "Only Draft", we already used the slow Opening Balance logic.
            // So we can compute forward from Opening Balance?
            // No, because of pagination (skipped lines).
            // If "Only Draft", we probably should use the slow "Skipped" logic because we can't rely on stored balance.
            // If "Mixed" but page is full of drafts: Rare.
            // Let's implement the "Skipped" logic as a fallback if NO valid balance is found.
            // Fetch skipped lines just for the calculation.
            // To optimize, maybe we don't fetch *all* fields, just debit/credit.
            // BUT, we already removed `skippedLines` from the transaction.
            // We should add it back conditionally? No, separate query if needed.
          }
        }

        // Re-implement propagation.
        // First, check if we need an external anchor.
        // let externalAnchorBalance: number | null = null; // Unused

        if (!hasAnchorOnPage && processedLines.length > 0) {
          // Fallback: Use the slow method for this edge case.
          // Calculate Total Ending Balance (Opening + Net).
          // Then subtract skipped lines.
          // We need `skippedLines`.
          const skippedLines = await prisma.journalEntryLine.findMany({
            where,
            select: { debitAmount: true, creditAmount: true },
            orderBy: [
              { journalEntry: { transactionDate: "desc" } },
              { journalEntry: { createdAt: "desc" } },
            ],
            take: skip,
          });

          const totalPeriodDebit = aggregates._sum.debitAmount?.toNumber() || 0;
          const totalPeriodCredit =
            aggregates._sum.creditAmount?.toNumber() || 0;
          const periodNetDebit = totalPeriodDebit - totalPeriodCredit;

          // If we used Optimized Opening Balance, `openingBalance` is correct.
          // `periodNetDebit` is correct.
          const endingBalance = openingBalance + periodNetDebit;

          const skippedNet = skippedLines.reduce(
            (sum, l) =>
              sum + (l.debitAmount.toNumber() - l.creditAmount.toNumber()),
            0
          );
          const currentRunningBalance = endingBalance - skippedNet;

          // Now we have the balance for the TOP of the page.
          // We can fill downwards.
          let running = currentRunningBalance;
          processedLines = processedLines.map((l) => {
            const bal = running;
            running -= l.debitAmount - l.creditAmount;
            return { ...l, runningBalance: bal };
          });
        } else {
          // We have at least one anchor on page. Propagate.
          // Find first valid index.
          const firstValid = processedLines.findIndex(
            (l) => l.runningBalance !== null
          );

          // Propagate UP (Newer)
          for (let i = firstValid - 1; i >= 0; i--) {
            const prevBal = processedLines[i + 1].runningBalance!;
            const movement =
              processedLines[i].debitAmount - processedLines[i].creditAmount;
            processedLines[i].runningBalance = prevBal + movement;
          }

          // Propagate DOWN (Older)
          // Be careful: if we hit another valid balance, should we restart from it?
          // Yes, trust the stored balance.
          // But if there's a discontinuity (e.g. Draft ignored by next Posted), we might see a jump.
          // That's acceptable.

          let currentBal = processedLines[firstValid].runningBalance!;
          for (let i = firstValid + 1; i < processedLines.length; i++) {
            if (processedLines[i].runningBalance !== null) {
              currentBal = processedLines[i].runningBalance!;
            } else {
              // Calculate from previous (newer)
              // Bal(Older) = Bal(Newer) - Mov(Newer)
              // Wait. Bal(i) is older than Bal(i-1).
              // Bal(i-1) = Bal(i) + Mov(i-1).
              // So Bal(i) = Bal(i-1) - Mov(i-1).
              const newerMovement =
                processedLines[i - 1].debitAmount -
                processedLines[i - 1].creditAmount;
              currentBal = currentBal - newerMovement;
              processedLines[i].runningBalance = currentBal;
            }
          }
        }
      }

      // Apply Normal Balance display adjustment
      const finalLines = processedLines.map((line) => ({
        ...line,
        runningBalance:
          account?.normalBalance === "credit"
            ? -(line.runningBalance || 0)
            : line.runningBalance || 0,
      }));

      return {
        success: true,
        data: finalLines,
        pagination: {
          total,
          totalPages: Math.ceil(total / pageSize),
          currentPage: page,
          pageSize,
        },
        totals: {
          debit: aggregates._sum.debitAmount?.toNumber() || 0,
          credit: aggregates._sum.creditAmount?.toNumber() || 0,
        },
        account,
      };
    } catch (error) {
      console.error("Error fetching ledger entries:", error);
      return { success: false, error: "Failed to fetch ledger entries" };
    }
  }
);
