import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const hasPermissionMock = vi.hoisted(() => vi.fn((..._args: any[]) => true));

const prismaMock = vi.hoisted(() => ({
  salesOrder: {
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

vi.mock("@/modules/sales/services/sales-order.service", () => ({
  SalesOrderService: { create: vi.fn() },
}));

vi.mock("@/lib/document-numbering", () => ({
  generateDocumentNumber: vi.fn(async () => "SO-TEST-0001"),
}));

vi.mock("@/lib/superjson", () => ({
  SuperJSON: {
    serialize: (value: unknown) => value,
  },
}));

import { getSalesOrder, getSalesOrders } from "./actions";

describe("sales/orders actions tenant scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      userId: "u-1",
      activeCompanyId: "cmp-1",
      permissions: ["sales.view", "sales.edit", "sales.delete", "sales.create"],
    });

    prismaMock.salesOrder.findMany.mockResolvedValue([]);
    prismaMock.salesOrder.count.mockResolvedValue(0);
    prismaMock.salesOrder.findFirst.mockResolvedValue(null);
  });

  it("scopes sales order listing to active company", async () => {
    await getSalesOrders(1, 10, "SO", "ALL");

    expect(prismaMock.salesOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ companyId: "cmp-1" }),
          ]),
        }),
      }),
    );
  });

  it("scopes sales order detail lookup to active company", async () => {
    await getSalesOrder("so-1");

    expect(prismaMock.salesOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "so-1", companyId: "cmp-1" },
      }),
    );
  });
});
