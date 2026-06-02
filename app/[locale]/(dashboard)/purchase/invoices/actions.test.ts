import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const hasPermissionMock = vi.hoisted(() => vi.fn((..._args: any[]) => true));
const purchaseInvoiceServiceCreateMock = vi.hoisted(() => vi.fn());
const purchaseInvoiceServiceUpdateMock = vi.hoisted(() => vi.fn());
const purchaseInvoiceServiceDeleteMock = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
  purchaseInvoice: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  purchaseOrder: {
    findMany: vi.fn(),
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
  PurchaseInvoiceService: {
    create: purchaseInvoiceServiceCreateMock,
    update: purchaseInvoiceServiceUpdateMock,
    delete: purchaseInvoiceServiceDeleteMock,
  },
}));

import {
  deletePurchaseInvoice,
  getPurchaseInvoice,
  getPurchaseInvoices,
  getPurchaseOrdersForSelect,
  updatePurchaseInvoice,
} from "./actions";

const MOCK_UPDATE_INPUT = {
  invoiceNumber: "PINV-001",
  contactId: "c12345678901234567890123",
  purchaseOrderId: "po12345678901234567890123",
  invoiceDate: new Date("2026-06-02"),
  dueDate: new Date("2026-06-15"),
  notes: "updated",
  globalDiscount: 0,
  totalTax: 0,
  shippingCost: 0,
  handlingCost: 0,
  items: [
    {
      description: "Widget A",
      productId: "prod123456789012345678901",
      quantity: 1,
      unitPrice: 100,
      discount: 0,
      tax: 0,
    },
  ],
};

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
    prismaMock.purchaseInvoice.findUnique.mockResolvedValue({
      id: "pi-1",
      companyId: "cmp-1",
      contactId: "c12345678901234567890123",
      invoiceNumber: "PINV-001",
      status: "DRAFT",
    });
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

  it("delegates purchase invoice update to PurchaseInvoiceService", async () => {
    purchaseInvoiceServiceUpdateMock.mockResolvedValue({ id: "pi-1" });

    await updatePurchaseInvoice("pi-1", MOCK_UPDATE_INPUT as any);

    expect(purchaseInvoiceServiceUpdateMock).toHaveBeenCalledWith(
      "pi-1",
      expect.objectContaining({
        items: [
          expect.objectContaining({
            productId: "prod123456789012345678901",
          }),
        ],
      }),
      "cmp-1",
    );
  });

  it("delegates purchase invoice delete to PurchaseInvoiceService", async () => {
    purchaseInvoiceServiceDeleteMock.mockResolvedValue(undefined);

    await deletePurchaseInvoice("pi-1");

    expect(purchaseInvoiceServiceDeleteMock).toHaveBeenCalledWith("pi-1", "cmp-1");
  });

  it("filters purchase order picker to orders without existing invoices", async () => {
    prismaMock.purchaseOrder.findMany.mockResolvedValue([]);

    await getPurchaseOrdersForSelect();

    expect(prismaMock.purchaseOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "cmp-1",
          invoices: { none: {} },
        }),
      }),
    );
  });
});
