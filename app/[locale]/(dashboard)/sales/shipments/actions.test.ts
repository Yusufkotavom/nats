import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const hasPermissionMock = vi.hoisted(() => vi.fn((..._args: any[]) => true));

const prismaMock = vi.hoisted(() => ({
  salesShipment: {
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

vi.mock("@/modules/sales/services/sales-shipment.service", () => ({
  SalesShipmentService: { create: vi.fn() },
}));

vi.mock("@/modules/inventory/services/inventory.service", () => ({
  InventoryService: {},
}));

vi.mock("@/lib/accounting/default-account.service", () => ({
  getRequiredDefaultAccount: vi.fn(),
}));

vi.mock("@/modules/inventory/services/bom-consumption.service", () => ({
  resolveStockConsumptionItems: vi.fn(),
}));

vi.mock("decimal.js", () => ({
  default: class DecimalMock {},
}));

import { getSalesShipment, getSalesShipments } from "./actions";

describe("sales/shipments actions tenant scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      userId: "u-1",
      activeCompanyId: "cmp-1",
      permissions: ["sales.view", "sales.edit", "sales.delete", "sales.create"],
    });

    prismaMock.salesShipment.findMany.mockResolvedValue([]);
    prismaMock.salesShipment.count.mockResolvedValue(0);
    prismaMock.salesShipment.findFirst.mockResolvedValue(null);
  });

  it("scopes shipment listing to active company", async () => {
    await getSalesShipments(1, 10, "SJ");

    expect(prismaMock.salesShipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ companyId: "cmp-1" }),
          ]),
        }),
      }),
    );
  });

  it("scopes shipment detail lookup to active company", async () => {
    await getSalesShipment("sj-1");

    expect(prismaMock.salesShipment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sj-1", companyId: "cmp-1" },
      }),
    );
  });
});
