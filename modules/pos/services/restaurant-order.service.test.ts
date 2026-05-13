import { beforeEach, describe, expect, it, vi } from "vitest";
import { RestaurantOrderService } from "./restaurant-order.service";
import { Decimal } from "decimal.js";

const issueInvoiceOnlyMock = vi.hoisted(() => vi.fn());
const settleIssuedInvoiceMock = vi.hoisted(() => vi.fn());
const closeSpotMock = vi.hoisted(() => vi.fn());

vi.mock("./pos-transaction.service", () => ({
  POSTransactionService: {
    issueInvoiceOnly: issueInvoiceOnlyMock,
    settleIssuedInvoice: settleIssuedInvoiceMock,
  },
}));

vi.mock("./dining-spot.service", () => ({
  DiningSpotService: {
    closeSpot: closeSpotMock,
  },
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  pOSSession: {
    findUnique: vi.fn(),
  },
  diningSpot: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  restaurantOrder: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  restaurantOrderItem: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  product: {
    findMany: vi.fn(),
  },
  kitchenTicket: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  kitchenTicketItem: {
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

describe("RestaurantOrderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));

    prismaMock.pOSSession.findUnique.mockResolvedValue({ id: "sess-1", status: "OPEN" });
    prismaMock.diningSpot.findUnique.mockResolvedValue({
      id: "spot-1",
      isActive: true,
      status: "ORDERING",
    });
    prismaMock.restaurantOrder.findFirst.mockResolvedValue(null);
    prismaMock.restaurantOrder.create.mockResolvedValue({
      id: "ro-1",
      orderNumber: "RO-POS-1",
      globalDiscount: new Decimal(0),
      notes: null,
    });
    prismaMock.restaurantOrderItem.create
      .mockResolvedValueOnce({ id: "item-1" })
      .mockResolvedValueOnce({ id: "item-2" });
    prismaMock.product.findMany.mockResolvedValue([
      { id: "prod-1", category: { name: "Grill" } },
      { id: "prod-2", category: { name: "Bar" } },
    ]);
    prismaMock.kitchenTicket.create.mockResolvedValue({ id: "ticket-1" });
    prismaMock.restaurantOrderItem.findMany.mockResolvedValue([
      {
        unitPrice: new Decimal(10000),
        orderedQuantity: 1,
        discountAmount: new Decimal(0),
      },
      {
        unitPrice: new Decimal(5000),
        orderedQuantity: 2,
        discountAmount: new Decimal(500),
      },
    ]);
    prismaMock.restaurantOrder.update.mockResolvedValue({ id: "ro-1" });
  });

  it("sends new order items into kitchen ticket", async () => {
    const result = await RestaurantOrderService.sendToKitchen({
      sessionId: "sess-1",
      userId: "user-1",
      diningSpotId: "spot-1",
      items: [
        { productId: "prod-1", quantity: 1, price: 10000 },
        { productId: "prod-2", quantity: 2, price: 5000, discount: 500 },
      ],
      globalDiscount: 0,
    });

    expect(prismaMock.restaurantOrder.create).toHaveBeenCalled();
    expect(prismaMock.kitchenTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          restaurantOrderId: "ro-1",
        }),
      }),
    );
    expect(prismaMock.restaurantOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ro-1" },
        data: expect.objectContaining({ status: "SENT_TO_KITCHEN" }),
      }),
    );
    expect(result).toEqual({ orderId: "ro-1", kitchenTicketId: "ticket-1" });
  });

  it("updates kitchen item status and marks order billing when all served", async () => {
    prismaMock.kitchenTicketItem.findUnique.mockResolvedValue({
      id: "kti-1",
      kitchenTicketId: "ticket-1",
      restaurantOrderItemId: "item-1",
      quantity: 1,
      startedAt: null,
      readyAt: null,
      servedAt: null,
      kitchenTicket: {
        restaurantOrderId: "ro-1",
        diningSpotId: "spot-1",
      },
    });
    prismaMock.kitchenTicketItem.findMany.mockResolvedValue([{ status: "SERVED" }]);
    prismaMock.kitchenTicket.findMany.mockResolvedValue([{ status: "SERVED" }]);

    await RestaurantOrderService.updateKitchenItemStatus("kti-1", "SERVED");

    expect(prismaMock.kitchenTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ticket-1" },
        data: expect.objectContaining({ status: "SERVED" }),
      }),
    );
    expect(prismaMock.restaurantOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ro-1" },
        data: expect.objectContaining({ status: "BILLING" }),
      }),
    );
    expect(prismaMock.diningSpot.update).toHaveBeenCalledWith({
      where: { id: "spot-1" },
      data: { status: "BILLING" },
    });
  });
});
