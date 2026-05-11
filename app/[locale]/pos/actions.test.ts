import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const hasPermissionMock = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
  companyProfile: {
    findFirst: vi.fn(),
  },
  product: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock("@/lib/auth/auth", () => ({
  getSession: getSessionMock,
}));

vi.mock("@/lib/permissions/utils", () => ({
  hasPermission: hasPermissionMock,
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { getPOSProducts } from "./actions";
import { SuperJSON } from "@/lib/superjson";

describe("pos/actions getPOSProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ permissions: ["pos.access"] });
    hasPermissionMock.mockReturnValue(true);
    prismaMock.companyProfile.findFirst.mockResolvedValue({
      posProductVisibilityMode: "POS_ONLY",
    });
  });

  it("filters products by showInPos and isActive when mode is POS_ONLY", async () => {
    prismaMock.product.findMany.mockResolvedValue([]);
    prismaMock.product.count.mockResolvedValue(0);

    await getPOSProducts(1, 20);

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          showInPos: true,
        }),
      }),
    );
    expect(prismaMock.product.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        isActive: true,
        showInPos: true,
      }),
    });
  });

  it("includes all active products when mode is ALL_ACTIVE", async () => {
    prismaMock.product.findMany.mockResolvedValue([]);
    prismaMock.product.count.mockResolvedValue(0);
    prismaMock.companyProfile.findFirst.mockResolvedValue({
      posProductVisibilityMode: "ALL_ACTIVE",
    });

    await getPOSProducts(1, 20);

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
        }),
      }),
    );
    expect(prismaMock.product.findMany.mock.calls[0][0].where.showInPos).toBeUndefined();
  });

  it("returns empty payload when user unauthorized", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await getPOSProducts();
    const data = SuperJSON.deserialize<{ items: unknown[]; total: number; hasMore: boolean }>(result);

    expect(data.items).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.hasMore).toBe(false);
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
  });
});
