import { describe, expect, it, vi } from "vitest";
import { ensureCompanyMinimalPaymentMethods } from "./minimal-payment-methods";

function buildTx() {
  return {
    defaultAccount: { findMany: vi.fn() },
    cashAccount: { findFirst: vi.fn(), create: vi.fn() },
    account: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    companyProfile: { upsert: vi.fn() },
  } as any;
}

describe("ensureCompanyMinimalPaymentMethods", () => {
  it("does nothing when default accounts are not fully configured", async () => {
    const tx = buildTx();
    tx.defaultAccount.findMany.mockResolvedValue([
      { purpose: "CASH_ON_HAND", accountId: "acc-cash-parent" },
    ]);

    await ensureCompanyMinimalPaymentMethods(tx, "cmp-1");

    expect(tx.cashAccount.create).not.toHaveBeenCalled();
    expect(tx.companyProfile.upsert).not.toHaveBeenCalled();
  });

  it("creates minimal cash + bank payment methods and sets profile defaults", async () => {
    const tx = buildTx();
    tx.defaultAccount.findMany.mockResolvedValue([
      { purpose: "CASH_ON_HAND", accountId: "acc-cash-parent" },
      { purpose: "BANK", accountId: "acc-bank-parent" },
    ]);

    tx.cashAccount.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    tx.account.findFirst
      .mockResolvedValueOnce({
        id: "acc-cash-parent",
        code: "11120",
        type: "asset",
        normalBalance: "debit",
        level: 1,
      })
      .mockResolvedValueOnce({
        id: "acc-bank-parent",
        code: "11110",
        type: "asset",
        normalBalance: "debit",
        level: 1,
      });

    tx.account.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    tx.account.create
      .mockResolvedValueOnce({ id: "acc-cash-child" })
      .mockResolvedValueOnce({ id: "acc-bank-child" });

    tx.cashAccount.create
      .mockResolvedValueOnce({ id: "cash-method-id" })
      .mockResolvedValueOnce({ id: "bank-method-id" });

    await ensureCompanyMinimalPaymentMethods(tx, "cmp-1");

    expect(tx.cashAccount.create).toHaveBeenCalledTimes(2);
    expect(tx.companyProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: "cmp-1" },
        update: expect.objectContaining({
          defaultCashAccountId: "cash-method-id",
          defaultCardAccountId: "bank-method-id",
          defaultQrisAccountId: "bank-method-id",
        }),
      }),
    );
  });
});

