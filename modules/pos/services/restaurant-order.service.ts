import { prisma } from "@/lib/prisma";
import { Decimal } from "decimal.js";
import { POSTransactionService } from "./pos-transaction.service";
import { DiningSpotService } from "./dining-spot.service";

const RESTAURANT_ORDER_NUMBER_PREFIX = "RO-POS";
const KITCHEN_TICKET_NUMBER_PREFIX = "KOT";

export type RestaurantOrderCartItem = {
  productId: string;
  quantity: number;
  price: number;
  discount?: number;
  note?: string;
  station?: string;
};

export type RestaurantFeeBreakdown = {
  lines: Array<{
    name: string;
    category: "TAX" | "FEE";
    valueType: "PERCENTAGE" | "FIXED";
    value: number;
    amount: number;
  }>;
};

function normalizeStation(value: string | null | undefined): string {
  if (!value) return "GENERAL";
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "GENERAL";
}

export class RestaurantOrderService {
  static async getFloorOverview(sessionId: string) {
    const spots = await prisma.diningSpot.findMany({
      where: { isActive: true },
      include: {
        area: true,
        sessions: {
          where: { closedAt: null },
          orderBy: { openedAt: "desc" },
          take: 1,
        },
        restaurantOrders: {
          where: {
            posSessionId: sessionId,
            status: { in: ["OPEN", "SENT_TO_KITCHEN", "BILLING", "PAID"] },
          },
          include: {
            kitchenTickets: {
              where: { status: { in: ["NEW", "IN_PROGRESS", "READY"] } },
              select: { id: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ area: { sortOrder: "asc" } }, { spotCode: "asc" }],
    });

    return spots;
  }

  static async getKitchenTickets(sessionId: string, station?: string) {
    const stationFilter = station ? normalizeStation(station) : undefined;
    return prisma.kitchenTicket.findMany({
      where: {
        restaurantOrder: { posSessionId: sessionId },
        status: { in: ["NEW", "IN_PROGRESS", "READY"] },
        ...(stationFilter
          ? {
              items: {
                some: { station: stationFilter },
              },
            }
          : {}),
      },
      include: {
        diningSpot: { include: { area: true } },
        restaurantOrder: true,
        items: {
          where: stationFilter ? { station: stationFilter } : undefined,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { sentAt: "asc" },
    });
  }

  static async getBillingQueue(sessionId: string) {
    return prisma.restaurantOrder.findMany({
      where: {
        posSessionId: sessionId,
        status: { in: ["SENT_TO_KITCHEN", "BILLING", "PAID"] },
      },
      include: {
        diningSpot: { include: { area: true } },
        contact: true,
        salesInvoice: {
          include: {
            payments: true,
          },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  static async sendToKitchen(params: {
    sessionId: string;
    userId: string;
    diningSpotId: string;
    items: RestaurantOrderCartItem[];
    note?: string;
    customerId?: string;
    globalDiscount?: number;
  }) {
    if (!params.items.length) {
      throw new Error("Order items cannot be empty");
    }

    return prisma.$transaction(async (tx) => {
      const session = await tx.pOSSession.findUnique({ where: { id: params.sessionId } });
      if (!session || session.status !== "OPEN") {
        throw new Error("Session is not open");
      }

      const spot = await tx.diningSpot.findUnique({ where: { id: params.diningSpotId } });
      if (!spot) throw new Error("Dining spot not found");
      if (!spot.isActive) throw new Error("Dining spot is not active");
      if (spot.status === "AVAILABLE") {
        throw new Error("Dining spot is not opened yet");
      }

      let order = await tx.restaurantOrder.findFirst({
        where: {
          posSessionId: params.sessionId,
          diningSpotId: params.diningSpotId,
          status: { in: ["OPEN", "SENT_TO_KITCHEN"] },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!order) {
        order = await tx.restaurantOrder.create({
          data: {
            orderNumber: `${RESTAURANT_ORDER_NUMBER_PREFIX}-${Date.now()}`,
            status: "OPEN",
            posSessionId: params.sessionId,
            diningSpotId: params.diningSpotId,
            contactId: params.customerId,
            createdById: params.userId,
            globalDiscount: new Decimal(params.globalDiscount || 0),
          },
        });
      }

      const createdItems: Array<{ id: string; productId: string; quantity: number; note?: string; station?: string }> = [];
      for (const item of params.items) {
        const quantity = Math.max(0, Math.floor(item.quantity));
        if (quantity <= 0) continue;

        const created = await tx.restaurantOrderItem.create({
          data: {
            restaurantOrderId: order.id,
            productId: item.productId,
            orderedQuantity: quantity,
            servedQuantity: 0,
            unitPrice: new Decimal(item.price || 0),
            discountAmount: new Decimal(item.discount || 0),
            note: item.note,
          },
        });
        createdItems.push({
          id: created.id,
          productId: item.productId,
          quantity,
          note: item.note,
          station: item.station,
        });
      }

      if (createdItems.length === 0) {
        throw new Error("No valid items to send to kitchen");
      }

      const productMap = new Map(
        (
          await tx.product.findMany({
            where: { id: { in: createdItems.map((item) => item.productId) } },
            select: {
              id: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          })
        ).map((product) => [product.id, product]),
      );

      const ticket = await tx.kitchenTicket.create({
        data: {
          ticketNumber: `${KITCHEN_TICKET_NUMBER_PREFIX}-${Date.now()}`,
          restaurantOrderId: order.id,
          diningSpotId: params.diningSpotId,
          status: "NEW",
          notes: params.note,
          items: {
            create: createdItems.map((item) => {
              const product = productMap.get(item.productId);
              const station = normalizeStation(item.station || product?.category?.name);

              return {
                restaurantOrderItemId: item.id,
                productId: item.productId,
                quantity: item.quantity,
                station,
                status: "NEW",
                note: item.note,
              };
            }),
          },
        },
      });

      const allOrderItems = await tx.restaurantOrderItem.findMany({
        where: { restaurantOrderId: order.id },
      });

      const subtotal = allOrderItems.reduce(
        (sum, item) => sum.plus(new Decimal(item.unitPrice).mul(item.orderedQuantity)),
        new Decimal(0),
      );
      const totalItemDiscount = allOrderItems.reduce(
        (sum, item) => sum.plus(item.discountAmount),
        new Decimal(0),
      );
      const globalDiscount = new Decimal(params.globalDiscount || order.globalDiscount || 0);
      const totalAmount = Decimal.max(new Decimal(0), subtotal.minus(totalItemDiscount).minus(globalDiscount));

      const updatedOrder = await tx.restaurantOrder.update({
        where: { id: order.id },
        data: {
          status: "SENT_TO_KITCHEN",
          sentToKitchenAt: new Date(),
          notes: params.note ? [order.notes, params.note].filter(Boolean).join("\n") : order.notes,
          subtotal,
          itemDiscount: totalItemDiscount,
          globalDiscount,
          totalAmount,
        },
      });

      if (spot.status !== "ORDERING") {
        await tx.diningSpot.update({
          where: { id: params.diningSpotId },
          data: { status: "ORDERING" },
        });
      }

      return {
        orderId: updatedOrder.id,
        kitchenTicketId: ticket.id,
      };
    });
  }

  static async updateKitchenItemStatus(itemId: string, status: "NEW" | "COOKING" | "READY" | "SERVED" | "CANCELLED") {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.kitchenTicketItem.findUnique({
        where: { id: itemId },
        include: {
          kitchenTicket: {
            include: {
              restaurantOrder: true,
            },
          },
        },
      });
      if (!existing) throw new Error("Kitchen item not found");

      const now = new Date();
      await tx.kitchenTicketItem.update({
        where: { id: itemId },
        data: {
          status,
          startedAt: status === "COOKING" ? now : existing.startedAt,
          readyAt: status === "READY" ? now : existing.readyAt,
          servedAt: status === "SERVED" ? now : status === "NEW" ? null : existing.servedAt,
        },
      });

      if (existing.restaurantOrderItemId) {
        await tx.restaurantOrderItem.update({
          where: { id: existing.restaurantOrderItemId },
          data: {
            servedQuantity: status === "SERVED" ? existing.quantity : 0,
          },
        });
      }

      const ticketItems = await tx.kitchenTicketItem.findMany({
        where: { kitchenTicketId: existing.kitchenTicketId },
        select: { status: true },
      });

      let ticketStatus: "NEW" | "IN_PROGRESS" | "READY" | "SERVED" | "CANCELLED" = "NEW";
      if (ticketItems.every((item) => item.status === "SERVED" || item.status === "CANCELLED")) {
        ticketStatus = "SERVED";
      } else if (ticketItems.every((item) => ["READY", "SERVED", "CANCELLED"].includes(item.status))) {
        ticketStatus = "READY";
      } else if (ticketItems.some((item) => item.status === "COOKING")) {
        ticketStatus = "IN_PROGRESS";
      }

      await tx.kitchenTicket.update({
        where: { id: existing.kitchenTicketId },
        data: {
          status: ticketStatus,
          completedAt: ticketStatus === "SERVED" ? now : null,
        },
      });

      const orderTickets = await tx.kitchenTicket.findMany({
        where: { restaurantOrderId: existing.kitchenTicket.restaurantOrderId },
        select: { status: true },
      });

      const allServed = orderTickets.every((ticket) => ticket.status === "SERVED" || ticket.status === "CANCELLED");
      if (allServed) {
        await tx.restaurantOrder.update({
          where: { id: existing.kitchenTicket.restaurantOrderId },
          data: { status: "BILLING" },
        });

        await tx.diningSpot.update({
          where: { id: existing.kitchenTicket.diningSpotId },
          data: { status: "BILLING" },
        });
      }
    });
  }

  static async generateBill(
    sessionId: string,
    orderId: string,
    feeBreakdown: RestaurantFeeBreakdown = { lines: [] },
  ) {
    const order = await prisma.restaurantOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        salesInvoice: true,
      },
    });

    if (!order) throw new Error("Restaurant order not found");
    if (order.posSessionId !== sessionId) throw new Error("Order does not belong to this session");
    if (order.salesInvoiceId) {
      return {
        orderId: order.id,
        invoiceId: order.salesInvoiceId,
      };
    }

    const invoiceItems = order.items
      .map((item) => {
        const quantity = item.servedQuantity > 0 ? item.servedQuantity : item.orderedQuantity;
        return {
          productId: item.productId,
          quantity,
          price: new Decimal(item.unitPrice).toNumber(),
          discount: new Decimal(item.discountAmount).toNumber(),
        };
      })
      .filter((item) => item.quantity > 0);

    if (invoiceItems.length === 0) {
      throw new Error("No billable items found");
    }

    const result = await POSTransactionService.issueInvoiceOnly(
      sessionId,
      invoiceItems,
      new Decimal(order.globalDiscount).toNumber(),
      feeBreakdown,
      order.contactId || undefined,
      order.diningSpotId,
    );

    await prisma.$transaction(async (tx) => {
      await tx.restaurantOrder.update({
        where: { id: order.id },
        data: {
          status: "BILLING",
          salesInvoiceId: result.invoiceId,
          billedAt: new Date(),
          totalAmount: new Decimal(result.totalAmount),
          totalFees: feeBreakdown.lines
            .reduce((sum, line) => sum.plus(new Decimal(line.amount || 0)), new Decimal(0)),
          totalTax: feeBreakdown.lines
            .filter((line) => line.category === "TAX")
            .reduce((sum, line) => sum.plus(new Decimal(line.amount || 0)), new Decimal(0)),
        },
      });

      await tx.diningSpot.update({
        where: { id: order.diningSpotId },
        data: { status: "BILLING" },
      });
    });

    return {
      orderId: order.id,
      invoiceId: result.invoiceId,
      totalAmount: result.totalAmount,
      outbox: result.outbox,
    };
  }

  static async settleBill(
    sessionId: string,
    orderId: string,
    paymentMethod: "CASH" | "CARD" | "QRIS",
    amount?: number,
  ) {
    const order = await prisma.restaurantOrder.findUnique({
      where: { id: orderId },
      include: {
        salesInvoice: true,
      },
    });

    if (!order) throw new Error("Restaurant order not found");
    if (order.posSessionId !== sessionId) throw new Error("Order does not belong to this session");
    if (!order.salesInvoiceId) throw new Error("Bill has not been generated");

    const result = await POSTransactionService.settleIssuedInvoice(
      sessionId,
      order.salesInvoiceId,
      paymentMethod,
      amount,
    );

    if (result.remainingBalance <= 0) {
      await prisma.restaurantOrder.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });
    }

    return result;
  }

  static async closePaidOrder(orderId: string, userId: string) {
    const order = await prisma.restaurantOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Restaurant order not found");
    if (order.status !== "PAID") {
      throw new Error("Order must be fully paid before closing");
    }

    await prisma.restaurantOrder.update({
      where: { id: order.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
    });

    await DiningSpotService.closeSpot(order.diningSpotId, userId, "Closed from restaurant billing");
  }
}
