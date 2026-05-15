import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  contact: {
    findUnique: vi.fn(),
  },
  salesInvoice: {
    findFirst: vi.fn(),
  },
  salesOrder: {
    findFirst: vi.fn(),
  },
  pOSServiceOrder: {
    findFirst: vi.fn(),
  },
  contactCommunicationLog: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/lib/permissions/protected-action", () => ({
  authorizedAction: (_permission: string, fn: (...args: any[]) => any) => fn,
}));

import { getContactMessagingContext } from "./actions";

describe("general/contacts actions: getContactMessagingContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when contact does not exist", async () => {
    prismaMock.contact.findUnique.mockResolvedValue(null);

    const result = await getContactMessagingContext("missing");

    expect(result).toBeNull();
    expect(prismaMock.salesInvoice.findFirst).not.toHaveBeenCalled();
  });

  it("returns mapped latest invoice/order/service context", async () => {
    prismaMock.contact.findUnique.mockResolvedValue({
      id: "c1",
      name: "Customer 1",
      phone: "08123",
      email: "c1@example.com",
      type: "CUSTOMER",
    });

    prismaMock.salesInvoice.findFirst.mockResolvedValue({
      id: "inv1",
      invoiceNumber: "INV-001",
      status: "ISSUED",
      invoiceDate: new Date("2026-05-15T00:00:00.000Z"),
      totalAmount: 150000,
      balanceDue: 50000,
      items: [
        {
          description: "Produk A",
          quantity: 2,
          product: { name: "Produk A" },
        },
      ],
    });

    prismaMock.salesOrder.findFirst.mockResolvedValue({
      id: "so1",
      orderNumber: "SO-001",
      status: "CONFIRMED",
      orderDate: new Date("2026-05-14T00:00:00.000Z"),
      items: [{ quantity: 1, product: { name: "Produk B" } }],
    });

    prismaMock.pOSServiceOrder.findFirst.mockResolvedValue({
      id: "svc1",
      orderNumber: "SVC-001",
      status: "PROCESSING",
      targetDate: new Date("2026-05-20T00:00:00.000Z"),
      items: [{ productName: "Service X", quantity: 1 }],
    });
    prismaMock.contactCommunicationLog.findMany.mockResolvedValue([
      {
        id: "log1",
        eventType: "SERVICE_CREATED",
        status: "SENT",
        sourceType: "SERVICE_ORDER",
        sourceId: "svc1",
        target: "6281234567890",
        message: "Service masuk",
        documentLinks: [{ label: "Invoice PDF", url: "https://example.com/inv" }],
        createdAt: new Date("2026-05-15T10:00:00.000Z"),
      },
    ]);

    const result = await getContactMessagingContext("c1");

    expect(result?.contact.name).toBe("Customer 1");
    expect(result?.latestInvoice?.invoiceNumber).toBe("INV-001");
    expect(result?.latestInvoice?.totalAmount).toBe(150000);
    expect(result?.latestSalesOrder?.orderNumber).toBe("SO-001");
    expect(result?.latestServiceOrder?.orderNumber).toBe("SVC-001");
    expect(result?.latestServiceOrder?.items[0].name).toBe("Service X");
    expect(result?.recentWhatsAppLogs).toHaveLength(1);
    expect(result?.recentWhatsAppLogs[0]?.eventType).toBe("SERVICE_CREATED");
  });
});
