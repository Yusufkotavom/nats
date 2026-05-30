import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const hasPermissionMock = vi.hoisted(() => vi.fn((..._args: any[]) => true));

const prismaMock = vi.hoisted(() => ({
  salesReturn: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/auth/auth", () => ({
  getSession: () => getSessionMock(),
}));

vi.mock("@/lib/permissions/utils", () => ({
  hasPermission: hasPermissionMock as any,
}));

vi.mock("@/lib/permissions/protected-action", () => ({
  authorizedAction: (_permission: string, fn: (...args: any[]) => any) => fn,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/superjson", () => ({
  SuperJSON: {
    serialize: (value: unknown) => value,
  },
}));

vi.mock("@/modules/sales/services/sales-return.service", () => ({
  SalesReturnService: { create: vi.fn() },
}));

vi.mock("@/modules/inventory/services/inventory.service", () => ({
  InventoryService: {},
}));

import { getSalesReturn, getSalesReturns } from "./actions";

describe("sales/returns actions tenant scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      userId: "u-1",
      activeCompanyId: "cmp-1",
      permissions: ["sales.view", "sales.edit", "sales.delete", "sales.create"],
    });

    prismaMock.salesReturn.findMany.mockResolvedValue([]);
    prismaMock.salesReturn.count.mockResolvedValue(0);
    prismaMock.salesReturn.findFirst.mockResolvedValue(null);
  });

  it("scopes return listing to active company", async () => {
    await getSalesReturns(1, 10, "RET");

    expect(prismaMock.salesReturn.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ companyId: "cmp-1" }),
          ]),
        }),
      }),
    );
  });

  it("scopes return detail lookup to active company", async () => {
    await getSalesReturn("ret-1");

    expect(prismaMock.salesReturn.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ret-1", companyId: "cmp-1" },
      }),
    );
  });
});
