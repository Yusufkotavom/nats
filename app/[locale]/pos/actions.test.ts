import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const hasPermissionMock = vi.hoisted(() => vi.fn());
const ensureDefaultLayoutMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
  companyProfile: {
    findFirst: vi.fn(),
  },
  product: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  diningSpot: {
    findMany: vi.fn(),
  },
  contact: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/auth/auth", () => ({
  getSession: getSessionMock,
}));

vi.mock("@/lib/permissions/utils", () => ({
  hasPermission: hasPermissionMock,
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));
vi.mock("@/modules/pos/services/dining-spot.service", () => ({
  DiningSpotService: {
    ensureDefaultLayout: (...args: unknown[]) =>
      ensureDefaultLayoutMock(...args),
  },
}));

import {
  getPOSProducts,
  getPOSServiceProducts,
  getDiningSpots,
  getPOSContacts,
  createPOSQuickContact,
} from "./actions";
import { SuperJSON } from "@/lib/superjson";

describe("pos/actions getPOSProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ permissions: ["pos.access"] });
    hasPermissionMock.mockReturnValue(true);
    prismaMock.companyProfile.findFirst.mockResolvedValue({
      posProductVisibilityMode: "POS_ONLY",
      posEnableRestaurantFeatures: true,
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
      posEnableRestaurantFeatures: true,
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

describe("pos/actions getDiningSpots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ permissions: ["pos.access"] });
    hasPermissionMock.mockReturnValue(true);
    prismaMock.companyProfile.findFirst.mockResolvedValue({
      posEnableRestaurantFeatures: true,
    });
    prismaMock.diningSpot.findMany.mockResolvedValue([]);
  });

  it("returns empty array when restaurant features are disabled", async () => {
    prismaMock.companyProfile.findFirst.mockResolvedValue({
      posEnableRestaurantFeatures: false,
    });

    const result = await getDiningSpots();
    const data = SuperJSON.deserialize<unknown[]>(result);

    expect(data).toEqual([]);
    expect(ensureDefaultLayoutMock).not.toHaveBeenCalled();
    expect(prismaMock.diningSpot.findMany).not.toHaveBeenCalled();
  });

  it("loads dining spots when restaurant features are enabled", async () => {
    await getDiningSpots();

    expect(ensureDefaultLayoutMock).toHaveBeenCalled();
    expect(prismaMock.diningSpot.findMany).toHaveBeenCalled();
  });
});

describe("pos/actions getPOSServiceProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ permissions: ["pos.access"] });
    hasPermissionMock.mockReturnValue(true);
  });

  it("filters service catalog by active + isService", async () => {
    prismaMock.product.findMany.mockResolvedValue([]);

    await getPOSServiceProducts();

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          isService: true,
        }),
      }),
    );
  });

  it("returns empty array when user unauthorized", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await getPOSServiceProducts();
    const data = SuperJSON.deserialize<unknown[]>(result);

    expect(data).toEqual([]);
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
  });
});

describe("pos/actions contact helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ permissions: ["pos.access"] });
    hasPermissionMock.mockReturnValue(true);
  });

  it("returns customer contacts when authorized", async () => {
    prismaMock.contact.findMany.mockResolvedValue([
      { id: "c-1", name: "A", phone: "08123", email: "a@example.com" },
    ]);

    const result = await getPOSContacts("08123");
    const data = SuperJSON.deserialize<
      Array<{ id: string; name: string; phone: string | null; email: string | null }>
    >(result);

    expect(data).toHaveLength(1);
    expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: "CUSTOMER",
          isActive: true,
        }),
      }),
    );
  });

  it("returns empty contacts when unauthorized", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await getPOSContacts();
    const data = SuperJSON.deserialize<unknown[]>(result);

    expect(data).toEqual([]);
    expect(prismaMock.contact.findMany).not.toHaveBeenCalled();
  });

  it("creates quick contact as customer", async () => {
    prismaMock.contact.create.mockResolvedValue({
      id: "c-1",
      name: "Walk-in Baru",
      phone: "0812",
      email: null,
    });

    const result = await createPOSQuickContact({
      name: "Walk-in Baru",
      phone: "0812",
    });
    const data = SuperJSON.deserialize<{ id: string; name: string }>(result);

    expect(data.id).toBe("c-1");
    expect(prismaMock.contact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "CUSTOMER",
          name: "Walk-in Baru",
          phone: "0812",
        }),
      }),
    );
  });
});
