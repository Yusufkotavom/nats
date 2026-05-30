import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const hasPermissionMock = vi.hoisted(() => vi.fn((_permissions: string[], _permission: string) => true));
const revalidateLocalizedPathMock = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
  defaultAccount: {
    findFirst: vi.fn(),
  },
  account: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/auth/auth", () => ({
  getSession: () => getSessionMock(),
}));

vi.mock("@/lib/permissions/utils", () => ({
  hasPermission: (permissions: string[], permission: string) =>
    hasPermissionMock(permissions, permission),
}));

vi.mock("@/lib/revalidate-localized-path", () => ({
  revalidateLocalizedPath: (...args: unknown[]) => revalidateLocalizedPathMock(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  createCashTransactionCategory,
  deleteCashTransactionCategory,
  getCashTransactionCategories,
  updateCashTransactionCategory,
} from "./actions";

describe("cash-bank/categories actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({
      userId: "u-1",
      activeCompanyId: "company-1",
      permissions: ["cash_bank.view", "cash_bank.create", "cash_bank.edit", "cash_bank.delete"],
    });

    prismaMock.defaultAccount.findFirst
      .mockResolvedValueOnce({ accountId: "exp-parent" })
      .mockResolvedValueOnce({ accountId: "inc-parent" });
  });

  it("lists only posting categories under uncategorized parents", async () => {
    prismaMock.account.findMany.mockResolvedValue([]);

    await getCashTransactionCategories();

    expect(prismaMock.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
          isPosting: true,
          parentId: { in: ["exp-parent", "inc-parent"] },
        }),
      }),
    );
  });

  it("creates a category with generated child code", async () => {
    prismaMock.defaultAccount.findFirst.mockResolvedValue({ accountId: "exp-parent" });
    prismaMock.account.findFirst
      .mockResolvedValueOnce({
        id: "exp-parent",
        code: "59000",
        type: "expense",
        normalBalance: "debit",
        level: 1,
      })
      .mockResolvedValueOnce(null);
    prismaMock.account.findMany.mockResolvedValue([{ code: "59000-01" }]);
    prismaMock.account.create.mockResolvedValue({ id: "new-cat" });

    const result = await createCashTransactionCategory({
      name: "Transport",
      type: "EXPENSE",
    });

    expect(result.success).toBe(true);
    expect(prismaMock.account.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "59000-02",
          name: "Transport",
          companyId: "company-1",
        }),
      }),
    );
    expect(revalidateLocalizedPathMock).toHaveBeenCalledWith("/cash-bank/categories");
  });

  it("prevents duplicate category name under same parent", async () => {
    prismaMock.defaultAccount.findFirst.mockResolvedValue({ accountId: "exp-parent" });
    prismaMock.account.findFirst
      .mockResolvedValueOnce({
        id: "exp-parent",
        code: "59000",
        type: "expense",
        normalBalance: "debit",
        level: 1,
      })
      .mockResolvedValueOnce({ id: "dup" });

    const result = await createCashTransactionCategory({
      name: "Operasional Umum",
      type: "EXPENSE",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
  });

  it("updates category name in active company", async () => {
    prismaMock.account.findFirst
      .mockResolvedValueOnce({ id: "cat-1", parent: { id: "exp-parent" } })
      .mockResolvedValueOnce(null);
    prismaMock.account.update.mockResolvedValue({ id: "cat-1", name: "Updated" });

    const result = await updateCashTransactionCategory("cat-1", { name: "Updated" });

    expect(result.success).toBe(true);
    expect(prismaMock.account.update).toHaveBeenCalledWith({
      where: { id: "cat-1" },
      data: { name: "Updated" },
    });
  });

  it("blocks delete when category already used", async () => {
    prismaMock.account.findFirst.mockResolvedValue({
      id: "cat-1",
      _count: { cashTransactionAllocations: 1, journalEntryLines: 0 },
    });

    const result = await deleteCashTransactionCategory("cat-1");

    expect(result.success).toBe(false);
    expect(prismaMock.account.update).not.toHaveBeenCalled();
  });
});
