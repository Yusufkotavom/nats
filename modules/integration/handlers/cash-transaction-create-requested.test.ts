import { describe, expect, it, vi } from "vitest";
import {
  handleCashTransactionCreateRequestedAccounting,
  handleCashTransactionCreateRequestedCashBank,
} from "./cash-transaction-create-requested";

vi.mock("@/modules/accounting/services/journal.service", () => ({
  JournalService: {
    createJournalEntry: vi.fn().mockResolvedValue({ id: "je-new-1" }),
  },
}));

const basePayload = {
  transactionId: "tx-1",
  journalEntryId: "je-placeholder",
  entryNumber: "CT-tx-1",
  cashAccountId: "ca-1",
  type: "INCOME" as const,
  date: new Date("2026-01-01").toISOString(),
  description: "cash in",
  allocations: [{ accountId: "acc-1", amount: "10000" }],
  userId: "user-1",
};

describe("cash transaction create requested handlers", () => {
  it("accounting handler is idempotent by entryNumber", async () => {
    const tx: any = {
      journalEntry: {
        findFirst: vi.fn().mockResolvedValue({ id: "je-existing" }),
      },
      cashAccount: {
        findUnique: vi.fn(),
      },
    };

    await handleCashTransactionCreateRequestedAccounting(tx, basePayload);

    expect(tx.journalEntry.findFirst).toHaveBeenCalledWith({
      where: { entryNumber: "CT-tx-1" },
      select: { id: true },
    });
    expect(tx.cashAccount.findUnique).not.toHaveBeenCalled();
  });

  it("cash-bank handler links transaction to actual journal entry id", async () => {
    const tx: any = {
      cashTransaction: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "tx-1" }),
      },
      journalEntry: {
        findFirst: vi.fn().mockResolvedValue({ id: "je-real-1" }),
      },
    };

    await handleCashTransactionCreateRequestedCashBank(tx, {
      ...basePayload,
      contactId: "",
    });

    expect(tx.cashTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          journalEntryId: "je-real-1",
          contactId: null,
        }),
      })
    );
  });
});
