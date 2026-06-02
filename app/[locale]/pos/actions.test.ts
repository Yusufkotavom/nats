import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const hasPermissionMock = vi.hoisted(() => vi.fn());
const ensureDefaultLayoutMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const assertCompanyWriteAccessMock = vi.hoisted(() => vi.fn());
const issueInvoiceOnlyMock = vi.hoisted(() => vi.fn());
const settleIssuedInvoiceMock = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
  companyProfile: {
    findUnique: vi.fn(),
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
vi.mock("@/modules/cash-bank/services/payment-method-catalog.service", () => ({
  PaymentMethodCatalogService: {
    list: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("@/lib/subscription/write-guard", () => ({
  assertCompanyWriteAccess: (...args: unknown[]) =>
    assertCompanyWriteAccessMock(...args),
}));
vi.mock("@/modules/pos/services/pos-transaction.service", () => ({
  POSTransactionService: {
    issueInvoiceOnly: (...args: unknown[]) => issueInvoiceOnlyMock(...args),
    settleIssuedInvoice: (...args: unknown[]) => settleIssuedInvoiceMock(...args),
  },
}));

import {
  getPOSProducts,
  getDiningSpots,
  getPOSContacts,
  createPOSQuickContact,
  getPOSPaymentMethods,
  createPOSPreOrder,
  settlePOSInvoice,
} from "./actions";
import { SuperJSON } from "@/lib/superjson";

describe("pos/actions getPOSProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      permissions: ["pos.access"],
      activeCompanyId: "company-1",
    });
    hasPermissionMock.mockReturnValue(true);
    prismaMock.companyProfile.findUnique.mockResolvedValue({
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
    prismaMock.companyProfile.findUnique.mockResolvedValue({
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
    getSessionMock.mockResolvedValue({
      permissions: ["pos.access"],
      activeCompanyId: "company-1",
    });
    hasPermissionMock.mockReturnValue(true);
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      posEnableRestaurantFeatures: true,
    });
    prismaMock.diningSpot.findMany.mockResolvedValue([]);
  });

  it("returns empty array when restaurant features are disabled", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
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

describe("pos/actions contact helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      permissions: ["pos.access"],
      activeCompanyId: "company-1",
    });
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

describe("pos/actions payment methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      userId: "user-1",
      permissions: ["pos.access"],
      activeCompanyId: "company-1",
    });
    hasPermissionMock.mockReturnValue(true);
  });

  it("returns POS payment method catalog", async () => {
    const result = await getPOSPaymentMethods();
    const data = SuperJSON.deserialize<any[]>(result);
    expect(Array.isArray(data)).toBe(true);
  });
});

describe("pos/actions pre-order", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      userId: "user-1",
      permissions: ["pos.access"],
      activeCompanyId: "company-1",
    });
    assertCompanyWriteAccessMock.mockResolvedValue(undefined);
  });

  it("creates pre-order by issuing invoice without immediate payment", async () => {
    issueInvoiceOnlyMock.mockResolvedValue({
      invoiceId: "inv-1",
      salesOrderId: "so-1",
      totalAmount: 150000,
      outbox: {
        outboxIds: ["ob-1"],
        alreadyQueuedIds: [],
        processed: true,
      },
    });

    const result = await createPOSPreOrder(
      "sess-1",
      [{ productId: "p-1", quantity: 1, price: 150000, discount: 0 }],
      0,
      { lines: [] },
      "c-1",
    );

    expect(result.success).toBe(true);
    expect(issueInvoiceOnlyMock).toHaveBeenCalledWith(
      "sess-1",
      [{ productId: "p-1", quantity: 1, price: 150000, discount: 0 }],
      0,
      { lines: [] },
      "c-1",
      undefined,
    );
  });

  it("returns error payload when issuing pre-order fails", async () => {
    issueInvoiceOnlyMock.mockRejectedValue(new Error("Session is not bound to an active company"));

    const result = await createPOSPreOrder(
      "sess-1",
      [{ productId: "p-1", quantity: 1, price: 150000, discount: 0 }],
      0,
      { lines: [] },
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Session is not bound to an active company");
  });
});

describe("pos/actions invoice settlement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      userId: "user-1",
      permissions: ["pos.access"],
      activeCompanyId: "company-1",
    });
    hasPermissionMock.mockReturnValue(true);
    assertCompanyWriteAccessMock.mockResolvedValue(undefined);
  });

  it("settles issued invoice via existing POS transaction service", async () => {
    settleIssuedInvoiceMock.mockResolvedValue({
      paymentId: "pay-1",
      invoiceId: "inv-1",
      remainingBalance: 0,
      outbox: {
        outboxIds: ["ob-1"],
        alreadyQueuedIds: [],
        processed: true,
      },
    });

    const result = await settlePOSInvoice(
      "sess-1",
      "inv-1",
      "BANK",
      50000,
      "cash-1",
    );

    expect(result.success).toBe(true);
    expect(settleIssuedInvoiceMock).toHaveBeenCalledWith(
      "sess-1",
      "inv-1",
      "BANK",
      50000,
      "cash-1",
    );
    expect(revalidatePathMock).toHaveBeenCalled();
  });

  it("returns error payload when settlement fails", async () => {
    settleIssuedInvoiceMock.mockRejectedValue(new Error("Invoice already paid"));

    const result = await settlePOSInvoice("sess-1", "inv-1", "CASH", 10000);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invoice already paid");
  });
});
