import { beforeEach, describe, expect, it, vi } from "vitest";
import { POSServiceWorkflowService } from "./pos-service-workflow.service";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  pOSSession: {
    findUnique: vi.fn(),
  },
  product: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  contact: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  contactCommunicationLog: {
    findMany: vi.fn(),
  },
  salesOrder: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  salesOrderItem: {
    update: vi.fn(),
  },
  salesInvoice: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  salesPayment: {
    create: vi.fn(),
  },
  cashAccount: {
    findFirst: vi.fn(),
  },
  pOSServiceOrder: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  salesShipment: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  billOfMaterial: {
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

describe("POSServiceWorkflowService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
  });

  it("rejects create when product is not marked as service", async () => {
    prismaMock.pOSSession.findUnique.mockResolvedValue({
      id: "sess-1",
      status: "OPEN",
    });
    prismaMock.product.findMany.mockResolvedValue([
      { id: "prod-1", name: "Produk Biasa", price: 10000, isService: false },
    ]);

    await expect(
      POSServiceWorkflowService.create(
        {
          sessionId: "sess-1",
          items: [{ productId: "prod-1", quantity: 1 }],
        },
        "user-1",
      ),
    ).rejects.toThrow("is not a service item");
  });

  it("rejects invalid status transition", async () => {
    prismaMock.pOSServiceOrder.findUnique.mockResolvedValue({
      id: "svc-1",
      status: "NEW",
      salesInvoiceId: "inv-1",
      items: [],
    });

    await expect(
      POSServiceWorkflowService.transitionStatus("svc-1", "CLOSED", "user-1"),
    ).rejects.toThrow("Invalid status transition NEW -> CLOSED");
  });

  it("blocks closing service order when invoice is not fully paid", async () => {
    prismaMock.pOSServiceOrder.findUnique.mockResolvedValue({
      id: "svc-1",
      status: "DONE",
      salesInvoiceId: "inv-1",
      items: [],
    });
    prismaMock.salesInvoice.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "ISSUED",
    });

    await expect(
      POSServiceWorkflowService.transitionStatus("svc-1", "CLOSED", "user-1"),
    ).rejects.toThrow("Service order can only be closed when invoice is fully paid");
  });

  it("maps customer profile and latest whatsapp log timestamp in list()", async () => {
    prismaMock.pOSServiceOrder.findMany.mockResolvedValue([
      {
        id: "svc-1",
        posSessionId: "sess-1",
        contactId: "c-1",
        status: "READY",
        orderNumber: "SVC-001",
        salesInvoiceId: "inv-1",
        totalAmount: 150000,
        paidAmount: 50000,
        remainingAmount: 100000,
        createdAt: new Date("2026-05-15T08:00:00.000Z"),
        items: [],
      },
    ]);
    prismaMock.contact.findMany.mockResolvedValue([
      {
        id: "c-1",
        name: "Customer A",
        phone: "08123",
        email: "c@example.com",
      },
    ]);
    const latestAt = new Date("2026-05-15T09:30:00.000Z");
    prismaMock.contactCommunicationLog.findMany.mockResolvedValue([
      {
        id: "log-1",
        sourceId: "svc-1",
        createdAt: latestAt,
      },
    ]);

    const result = await POSServiceWorkflowService.list("sess-1");

    expect(prismaMock.contactCommunicationLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sourceType: "SERVICE_ORDER",
          channel: "WHATSAPP",
        }),
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.customerName).toBe("Customer A");
    expect(result[0]?.latestCommunicationAt).toEqual(latestAt);
  });
});
