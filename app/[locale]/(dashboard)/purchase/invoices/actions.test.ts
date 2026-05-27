import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const hasPermissionMock = vi.hoisted(() => vi.fn(() => true));

const prismaMock = vi.hoisted(() => ({
  purchaseInvoice: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
  },
  purchaseOrder: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/auth/auth", () => ({
  getSession: (...args: unknown[]) => getSessionMock(...args),
}));

vi.mock("@/lib/permissions/utils", () => ({
  hasPermission: (...args: unknown[]) => hasPermissionMock(...args),
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

vi.mock("@/lib/validation/schemas", () => ({
  purchaseInvoiceSchema: { safeParse: vi.fn((v: unknown) => ({ success: true, data: v })) },
}));

vi.mock("@/lib/utils/calculation-service", () => ({
  CalculationService: {},
}));

vi.mock("@/modules/integration/outbox", () => ({
  enqueueIntegrationEventOnce: vi.fn(),
  maybeProcessIntegrationOutboxEvent: vi.fn(),
}));

vi.mock("@/modules/purchase/services/purchase-invoice.service", () => ({
  PurchaseInvoiceService: { create: vi.fn() },
}));

import { getPurchaseInvoice, getPurchaseInvoices } from "./actions";

describe("purchase/invoices actions tenant scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      userId: "u-1",
      activeCompanyId: "cmp-1",
      permissions: ["purchase.view", "purchase.create", "purchase.edit", "purchase.delete"],
    });

    prismaMock.purchaseInvoice.findMany.mockResolvedValue([]);
    prismaMock.purchaseInvoice.count.mockResolvedValue(0);
    prismaMock.purchaseInvoice.findFirst.mockResolvedValue(null);
    prismaMock.purchaseOrder.findMany.mockResolvedValue([]);
  });

  it("scopes purchase invoice listing to active company", async () => {
    await getPurchaseInvoices(1, 10, "PINV", "ALL");

    expect(prismaMock.purchaseInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ companyId: "cmp-1" }),
          ]),
        }),
      }),
    );
  });

  it("scopes purchase invoice detail lookup to active company", async () => {
    await getPurchaseInvoice("pi-1");

    expect(prismaMock.purchaseInvoice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pi-1", companyId: "cmp-1" },
      }),
    );
  });
});
