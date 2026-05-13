import { checkBudgetAvailability } from "./actions";
import { prisma } from "@/lib/prisma";
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock("next/navigation", () => ({
    useRouter: vi.fn(),
    usePathname: vi.fn(),
    useSearchParams: vi.fn(),
    useParams: vi.fn(),
    redirect: vi.fn(),
    notFound: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
    getLocale: vi.fn(() => Promise.resolve("en")),
    getTranslations: vi.fn(),
}));

vi.mock("@/i18n/routing", () => ({
    redirect: vi.fn(),
}));

// Mocking Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    budget: {
      findFirst: vi.fn(),
    },
    journalEntryLine: {
      aggregate: vi.fn(),
    },
  },
}));

describe("checkBudgetAvailability", () => {
  const date = new Date(2026, 0, 1); // Jan 1 2026

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return warning if budget exceeded", async () => {
    // Setup Budget
    (prisma.budget.findFirst as any).mockResolvedValue({
      id: "b1",
      totalAmount: { toNumber: () => 1000 },
      items: [],
    });

    // Setup Actuals
    (prisma.journalEntryLine.aggregate as any).mockResolvedValue({
      _sum: { debitAmount: { toNumber: () => 500 }, creditAmount: { toNumber: () => 0 } },
    });

    // Request 600. Total = 500 + 600 = 1100 > 1000
    const result = await checkBudgetAvailability(null, null, date, 600);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.available).toBe(false);
      expect(result.data.warning).toContain("Exceeds budget");
    }
  });

  it("should return warning if approaching limit", async () => {
    // Setup Budget
    (prisma.budget.findFirst as any).mockResolvedValue({
      id: "b1",
      totalAmount: { toNumber: () => 1000 },
      items: [],
    });

    // Setup Actuals
    (prisma.journalEntryLine.aggregate as any).mockResolvedValue({
      _sum: { debitAmount: { toNumber: () => 850 }, creditAmount: { toNumber: () => 0 } },
    });

    // Request 100. Total = 950. Remaining 50. 50 < 1000 * 0.1 (100)
    const result = await checkBudgetAvailability(null, null, date, 100);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.available).toBe(true);
      expect(result.data.warning).toContain("approaching budget limit");
    }
  });

  it("should return available if within budget", async () => {
    // Setup Budget
    (prisma.budget.findFirst as any).mockResolvedValue({
      id: "b1",
      totalAmount: { toNumber: () => 1000 },
      items: [],
    });

    // Setup Actuals
    (prisma.journalEntryLine.aggregate as any).mockResolvedValue({
      _sum: { debitAmount: { toNumber: () => 100 }, creditAmount: { toNumber: () => 0 } },
    });

    // Request 100. Total = 200 < 1000.
    const result = await checkBudgetAvailability(null, null, date, 100);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.available).toBe(true);
      expect(result.data.warning).toBeUndefined();
    }
  });

  it("should use custom periodStart/periodEnd when budget period is provided", async () => {
    const periodStart = new Date("2026-02-01T00:00:00.000Z");
    const periodEnd = new Date("2026-07-31T23:59:59.999Z");

    (prisma.budget.findFirst as any).mockResolvedValue({
      id: "b2",
      totalAmount: { toNumber: () => 1000 },
      items: [],
      periodStart,
      periodEnd,
      fiscalYear: 2026,
    });

    (prisma.journalEntryLine.aggregate as any).mockResolvedValue({
      _sum: { debitAmount: { toNumber: () => 100 }, creditAmount: { toNumber: () => 0 } },
    });

    const result = await checkBudgetAvailability(null, null, date, 100);

    expect(result.success).toBe(true);
    expect(prisma.journalEntryLine.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          transactionDate: { gte: periodStart, lte: periodEnd },
        }),
      }),
    );
  });
});
