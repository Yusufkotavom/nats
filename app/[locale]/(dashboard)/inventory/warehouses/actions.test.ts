import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

const warehouseServiceMock = vi.hoisted(() => ({
  createWarehouse: vi.fn(),
  updateWarehouse: vi.fn(),
  deleteWarehouse: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  warehouse: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  inventory: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  getSession: (...args: unknown[]) => getSessionMock(...args),
}));

vi.mock("@/lib/permissions/protected-action", () => ({
  authorizedAction: (_permission: string, fn: (...args: any[]) => any) => fn,
}));

vi.mock("@/lib/permissions/utils", () => ({
  hasPermission: vi.fn(() => true),
}));

vi.mock("@/modules/inventory/services/warehouse.service", () => ({
  WarehouseService: warehouseServiceMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

import {
  createWarehouse,
  getInventoryLevels,
  getWarehouses,
} from "./actions";

describe("inventory/warehouses actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({
      userId: "u-1",
      activeCompanyId: "company-1",
      permissions: ["inventory.view", "warehouses.create"],
    });

    prismaMock.warehouse.findMany.mockResolvedValue([]);
    prismaMock.warehouse.count.mockResolvedValue(0);
    prismaMock.inventory.findMany.mockResolvedValue([]);
    warehouseServiceMock.createWarehouse.mockResolvedValue({ id: "wh-1", name: "Main" });

    prismaMock.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb({}));
  });

  it("scopes warehouse listing to active company", async () => {
    await getWarehouses(1, 10);

    expect(prismaMock.warehouse.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: "company-1" },
      }),
    );
    expect(prismaMock.warehouse.count).toHaveBeenCalledWith({
      where: { companyId: "company-1" },
    });
  });

  it("passes active company id into warehouse service create", async () => {
    await createWarehouse({ name: "Main Warehouse" });

    expect(warehouseServiceMock.createWarehouse).toHaveBeenCalledWith(
      expect.anything(),
      { name: "Main Warehouse" },
      "company-1",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/inventory/warehouses");
  });

  it("scopes inventory levels by warehouse company", async () => {
    await getInventoryLevels();

    expect(prismaMock.inventory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          warehouse: { companyId: "company-1" },
        }),
      }),
    );
  });
});
