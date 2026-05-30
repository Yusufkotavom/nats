import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const hasPermissionMock = vi.hoisted(() => vi.fn((..._args: any[]) => true));

const prismaMock = vi.hoisted(() => ({
  purchaseOrder: {
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

vi.mock("@/modules/purchase/services/purchase-order.service", () => ({
  PurchaseOrderService: {
    create: vi.fn(),
    update: vi.fn(),
    issue: vi.fn(),
    cancel: vi.fn(),
    close: vi.fn(),
    delete: vi.fn(),
  },
}));

import { getPurchaseOrder, getPurchaseOrders } from "./actions";

describe("purchase/orders actions tenant scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      userId: "u-1",
      activeCompanyId: "cmp-1",
      permissions: ["purchase.view", "purchase.create", "purchase.edit", "purchase.delete"],
    });

    prismaMock.purchaseOrder.findMany.mockResolvedValue([]);
    prismaMock.purchaseOrder.count.mockResolvedValue(0);
    prismaMock.purchaseOrder.findFirst.mockResolvedValue(null);
  });

  it("scopes purchase order listing to active company", async () => {
    await getPurchaseOrders(1, 10, "PO", "ALL");

    expect(prismaMock.purchaseOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ companyId: "cmp-1" }),
          ]),
        }),
      }),
    );
  });

  it("scopes purchase order detail lookup to active company", async () => {
    await getPurchaseOrder("po-1");

    expect(prismaMock.purchaseOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "po-1", companyId: "cmp-1" },
      }),
    );
  });
});
