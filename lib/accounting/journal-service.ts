import { Prisma, PrismaClient } from "@/prisma/generated/prisma/client";
import { Decimal } from "decimal.js";

// Use Prisma.TransactionClient for the transaction object
type Tx = Prisma.TransactionClient;

export class JournalService {
  /**
   * Posts a Journal Entry.
   * - Validates that Debits equal Credits.
   * - Updates status to POSTED.
   * - Calculates and updates running balances for affected accounts.
   * - Uses pessimistic locking (if possible via raw query) or relies on serial execution to avoid race conditions.
   * 
   * @param tx - The Prisma Transaction Client
   * @param journalEntryId - The ID of the Journal Entry to post
   */
  static async postJournalEntry(tx: Tx, journalEntryId: string) {
    const existingEntry = await tx.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: {
        lines: {
          orderBy: { lineNumber: "asc" },
          include: { account: true },
        },
      },
    });

    if (!existingEntry) {
      throw new Error("Journal entry not found");
    }

    if (existingEntry.status === "posted") {
      return;
    }

    // 1. Validate Balance using Decimal
    const totalDebit = existingEntry.lines.reduce(
      (sum: Decimal, line: { debitAmount: Decimal | null }) => sum.plus(new Decimal(line.debitAmount || 0)),
      new Decimal(0)
    );
    const totalCredit = existingEntry.lines.reduce(
      (sum: Decimal, line: { creditAmount: Decimal | null }) => sum.plus(new Decimal(line.creditAmount || 0)),
      new Decimal(0)
    );

    if (!totalDebit.equals(totalCredit)) {
      throw new Error(`Cannot post unbalanced journal entry. Debit: ${totalDebit}, Credit: ${totalCredit}`);
    }

    // 2. Lock Accounts (Pessimistic Locking)
    // Extract unique account IDs and sort them to prevent deadlocks
    const uniqueAccountIds = Array.from(
      new Set(existingEntry.lines.map((line) => line.accountId))
    ).sort();

    // Lock each account row using SELECT ... FOR UPDATE
    // This ensures no other transaction can modify these accounts (including their balances)
    // until this transaction commits.
    for (const accountId of uniqueAccountIds) {
      await tx.$executeRaw`SELECT 1 FROM "Account" WHERE id = ${accountId} FOR UPDATE`;
    }

    // 3. Update Status
    // We update this first to mark it as posted. 
    // Note: The running balance calculation logic relies on finding the *previous* posted entry.
    // Since this entry is now "posted" (in the DB state within this transaction), 
    // we must be careful to exclude ITSELF when looking for the "last" balance.
    await tx.journalEntry.update({
      where: { id: journalEntryId },
      data: {
        status: "posted",
        postedAt: new Date(),
      },
    });

    // 4. Update Running Balances
    const accountBalances: Record<string, Decimal> = {};

    for (const line of existingEntry.lines) {
      const { accountId, account } = line;

      // Initialize balance for this account if not already tracked in this transaction block
      if (accountBalances[accountId] === undefined) {
        // Find the last posted entry line for this account, EXCLUDING the current entry
        const lastEntryLine = await tx.journalEntryLine.findFirst({
          where: {
            accountId,
            journalEntry: {
              status: "posted",
            },
            journalEntryId: { not: journalEntryId },
          },
          orderBy: [
            { journalEntry: { postedAt: "desc" } },
            { journalEntry: { createdAt: "desc" } },
          ],
          select: { runningBalance: true },
        });

        accountBalances[accountId] = lastEntryLine?.runningBalance
          ? new Decimal(lastEntryLine.runningBalance)
          : new Decimal(0);
      }

      // Update balance based on normal balance type
      const debit = new Decimal(line.debitAmount || 0);
      const credit = new Decimal(line.creditAmount || 0);

      if (account.normalBalance === "credit") {
        accountBalances[accountId] = accountBalances[accountId].minus(debit).plus(credit);
      } else {
        accountBalances[accountId] = accountBalances[accountId].plus(debit).minus(credit);
      }

      // Update line with new running balance
      await tx.journalEntryLine.update({
        where: { id: line.id },
        data: { runningBalance: accountBalances[accountId] },
      });
    }
  }

  /**
   * Helper to create a Journal Entry in DRAFT status.
   * This is useful for modules (Sales, Purchase) that need to create a JE and then post it immediately.
   */
  static async createDraftJournalEntry(
    tx: Tx,
    data: {
      userId: string;
      entryNumber: string;
      transactionDate: Date;
      description: string;
      reference?: string;
      lines: {
        accountId: string;
        debitAmount: number | Decimal;
        creditAmount: number | Decimal;
        description?: string;
        contactId?: string;
        departmentId?: string | null;
        projectId?: string | null;
        lineNumber: number;
      }[];
    }
  ) {
    // Validate Debit/Credit Equality
    const totalDebit = data.lines.reduce(
      (sum: Decimal, line) => sum.plus(new Decimal(line.debitAmount || 0)),
      new Decimal(0)
    );
    const totalCredit = data.lines.reduce(
      (sum: Decimal, line) => sum.plus(new Decimal(line.creditAmount || 0)),
      new Decimal(0)
    );

    if (!totalDebit.equals(totalCredit)) {
      throw new Error(`Draft JE Unbalanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
    }

    return await tx.journalEntry.create({
      data: {
        userId: data.userId,
        entryNumber: data.entryNumber,
        transactionDate: data.transactionDate,
        description: data.description,
        status: "draft", // Explicitly Draft
        lines: {
          create: data.lines.map((line) => ({
            accountId: line.accountId,
            debitAmount: line.debitAmount,
            creditAmount: line.creditAmount,
            description: line.description,
            contactId: line.contactId,
            departmentId: line.departmentId,
            projectId: line.projectId,
            lineNumber: line.lineNumber,
          })),
        },
      },
    });
  }
}
