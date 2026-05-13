import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "decimal.js";
import { POSSessionService } from "./pos-session.service";

const prismaMock = vi.hoisted(() => ({
  pOSSession: {
    updateMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  salesPayment: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const accountingMock = vi.hoisted(() => ({
  getRequiredDefaultAccount: vi.fn(),
}));

const journalMock = vi.hoisted(() => ({
  createJournalEntry: vi.fn(),
  postJournalEntry: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/accounting/default-account.service", () => accountingMock);
vi.mock("@/modules/accounting/services/journal.service", () => ({
  JournalService: journalMock,
}));

describe("POSSessionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    accountingMock.getRequiredDefaultAccount.mockImplementation(async (purpose: string) => {
      if (purpose === "CASH_ON_HAND") return { accountId: "acc-cash" };
      if (purpose === "UNCATEGORIZED_EXPENSE") return { accountId: "acc-expense" };
      if (purpose === "UNCATEGORIZED_INCOME") return { accountId: "acc-income" };
      throw new Error(`Unknown purpose ${purpose}`);
    });
    journalMock.createJournalEntry.mockResolvedValue({ id: "je-1" });
  });

  it("returns cash summary from opening cash and cash payments", async () => {
    prismaMock.pOSSession.findUnique.mockResolvedValue({
      id: "sess-1",
      openingCash: new Decimal(100000),
    });
    prismaMock.salesPayment.findMany.mockResolvedValue([
      { amount: new Decimal(25000) },
      { amount: new Decimal(5000) },
    ]);

    const summary = await POSSessionService.getCashSummary("sess-1");

    expect(summary.openingCash.toNumber()).toBe(100000);
    expect(summary.cashSales.toNumber()).toBe(30000);
    expect(summary.systemCash.toNumber()).toBe(130000);
  });

  it("posts shortage variance journal using existing default accounts", async () => {
    prismaMock.pOSSession.findUnique.mockResolvedValue({
      id: "sess-1",
      cashierId: "user-cashier",
      sessionNumber: "SES-001",
      status: "OPEN",
      openingCash: new Decimal(100000),
    });
    prismaMock.salesPayment.findMany.mockResolvedValue([
      { amount: new Decimal(50000) },
    ]);

    await POSSessionService.close("sess-1", 140000, "short", "user-manager");

    expect(prismaMock.pOSSession.update).toHaveBeenCalled();
    expect(journalMock.createJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "POS cash variance shortage - SES-001",
        lines: [
          expect.objectContaining({ accountId: "acc-expense", debitAmount: 10000 }),
          expect.objectContaining({ accountId: "acc-cash", creditAmount: 10000 }),
        ],
      }),
      "user-manager",
      prismaMock,
    );
    expect(journalMock.postJournalEntry).toHaveBeenCalledWith("je-1", prismaMock);
  });

  it("does not create variance journal when actual cash equals system cash", async () => {
    prismaMock.pOSSession.findUnique.mockResolvedValue({
      id: "sess-1",
      cashierId: "user-cashier",
      sessionNumber: "SES-001",
      status: "OPEN",
      openingCash: new Decimal(100000),
    });
    prismaMock.salesPayment.findMany.mockResolvedValue([
      { amount: new Decimal(50000) },
    ]);

    await POSSessionService.close("sess-1", 150000, undefined, "user-manager");

    expect(prismaMock.pOSSession.update).toHaveBeenCalled();
    expect(journalMock.createJournalEntry).not.toHaveBeenCalled();
    expect(journalMock.postJournalEntry).not.toHaveBeenCalled();
  });

  it("posts overage variance journal using existing default accounts", async () => {
    prismaMock.pOSSession.findUnique.mockResolvedValue({
      id: "sess-1",
      cashierId: "user-cashier",
      sessionNumber: "SES-001",
      status: "OPEN",
      openingCash: new Decimal(100000),
    });
    prismaMock.salesPayment.findMany.mockResolvedValue([
      { amount: new Decimal(50000) },
    ]);

    await POSSessionService.close("sess-1", 160000, "over", "user-manager");

    expect(journalMock.createJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "POS cash variance overage - SES-001",
        lines: [
          expect.objectContaining({ accountId: "acc-cash", debitAmount: 10000 }),
          expect.objectContaining({ accountId: "acc-income", creditAmount: 10000 }),
        ],
      }),
      "user-manager",
      prismaMock,
    );
    expect(journalMock.postJournalEntry).toHaveBeenCalledWith("je-1", prismaMock);
  });
});
