import { describe, expect, it, vi } from "vitest";
import { ensureCompanyMinimalCashTransactionCategories } from "./minimal-cash-transaction-categories";

function buildTx() {
  return {
    defaultAccount: { findMany: vi.fn() },
    account: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  } as any;
}

describe("ensureCompanyMinimalCashTransactionCategories", () => {
  it("does nothing when default uncategorized accounts are not configured", async () => {
    const tx = buildTx();
    tx.defaultAccount.findMany.mockResolvedValue([]);

    await ensureCompanyMinimalCashTransactionCategories(tx, "cmp-1");

    expect(tx.account.create).not.toHaveBeenCalled();
  });

  it("creates seed categories under expense and income default parents", async () => {
    const tx = buildTx();
    tx.defaultAccount.findMany.mockResolvedValue([
      { purpose: "UNCATEGORIZED_EXPENSE", accountId: "acc-exp-parent" },
      { purpose: "UNCATEGORIZED_INCOME", accountId: "acc-inc-parent" },
    ]);

    // Existing check for each category
    tx.account.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "acc-exp-parent", code: "59000", type: "expense", normalBalance: "debit", level: 1 })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "acc-exp-parent", code: "59000", type: "expense", normalBalance: "debit", level: 1 })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "acc-exp-parent", code: "59000", type: "expense", normalBalance: "debit", level: 1 })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "acc-inc-parent", code: "49000", type: "revenue", normalBalance: "credit", level: 1 })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "acc-inc-parent", code: "49000", type: "revenue", normalBalance: "credit", level: 1 });

    tx.account.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ code: "59000-01" }])
      .mockResolvedValueOnce([{ code: "59000-01" }, { code: "59000-02" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ code: "49000-01" }]);

    tx.account.create
      .mockResolvedValueOnce({ id: "acc-1" })
      .mockResolvedValueOnce({ id: "acc-2" })
      .mockResolvedValueOnce({ id: "acc-3" })
      .mockResolvedValueOnce({ id: "acc-4" })
      .mockResolvedValueOnce({ id: "acc-5" });

    await ensureCompanyMinimalCashTransactionCategories(tx, "cmp-1");

    expect(tx.account.create).toHaveBeenCalledTimes(5);
  });
});

