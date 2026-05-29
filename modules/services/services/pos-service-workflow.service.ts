import { prisma } from "@/lib/prisma";
import { Decimal } from "decimal.js";
import { InventoryService } from "@/modules/inventory/services/inventory.service";
import { MovementType, Prisma } from "@/prisma/generated/prisma/client";
import { resolveStockConsumptionItems } from "@/modules/inventory/services/bom-consumption.service";
import { getRequiredDefaultAccount } from "@/lib/accounting/default-account.service";
import { JournalService } from "@/modules/accounting/services/journal.service";
import { PaymentAccountResolverService } from "@/modules/cash-bank/services/payment-account-resolver.service";
import { formatSequence } from "@/lib/utils/format-sequence";

const DEFAULT_WALK_IN_CUSTOMER_NAME = "Walk-in Customer";
const POS_SERVICE_INTERACTIVE_TX_TIMEOUT_MS = 10_000;

export type ServicePaymentMethod = "CASH" | "BANK";
export type ServiceWorkflowStatus =
  | "NEW"
  | "PROCESSING"
  | "READY"
  | "DONE"
  | "CLOSED"
  | "CANCELLED";

export type CreatePOSServiceOrderInput = {
  sessionId: string;
  customerId?: string;
  notes?: string;
  targetDate?: Date;
  downPaymentAmount?: number;
  paymentMethod?: ServicePaymentMethod;
  downPaymentCashAccountId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    price?: number;
    discount?: number;
    notes?: string;
  }>;
};

const allowedStatusTransitions: Record<ServiceWorkflowStatus, ServiceWorkflowStatus[]> = {
  NEW: ["PROCESSING", "READY", "CANCELLED"],
  PROCESSING: ["READY", "DONE", "CANCELLED"],
  READY: ["DONE", "CANCELLED"],
  DONE: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

export class POSServiceWorkflowService {
  private static async generateServiceDocNumber(
    tx: Prisma.TransactionClient,
    entityType: string,
    defaultName: string,
    defaultPrefix: string,
  ) {
    let format = await tx.documentNumbering.findUnique({
      where: { entityType },
    });

    if (!format) {
      format = await tx.documentNumbering.create({
        data: {
          entityType,
          name: defaultName,
          prefix: defaultPrefix,
        },
      });
    }

    const now = new Date();
    const isYearReset = Boolean(
      format.lastGeneratedAt &&
        format.resetYearly &&
        format.lastGeneratedAt.getFullYear() !== now.getFullYear(),
    );
    const isMonthReset = Boolean(
      format.lastGeneratedAt &&
        format.resetMonthly &&
        format.lastGeneratedAt.getMonth() !== now.getMonth(),
    );
    const nextSequence = isYearReset || isMonthReset ? 1 : format.currentSequence + 1;

    const updated = await tx.documentNumbering.update({
      where: { id: format.id },
      data: {
        currentSequence: nextSequence,
        lastGeneratedAt: now,
      },
    });

    return formatSequence(
      updated.currentSequence,
      updated.prefix,
      updated.suffix,
      updated.sequenceDigits,
      updated.includeYear,
      updated.yearFormat,
      updated.includeMonth,
      now,
    );
  }

  static async list(sessionId: string, status?: ServiceWorkflowStatus) {
    const orders = await prisma.pOSServiceOrder.findMany({
      where: {
        posSessionId: sessionId,
        ...(status ? { status } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const customerIds = Array.from(new Set(orders.map((o) => o.contactId).filter(Boolean))) as string[];
    const customers = customerIds.length
      ? await prisma.contact.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true, phone: true, email: true },
        })
      : [];
    const customerMap = new Map(customers.map((c) => [c.id, c]));
    const orderIds = orders.map((order) => order.id);
    const communicationLogs = orderIds.length
      ? await prisma.contactCommunicationLog.findMany({
          where: {
            sourceType: "SERVICE_ORDER",
            sourceId: { in: orderIds },
            channel: "WHATSAPP",
          },
          orderBy: { createdAt: "desc" },
        })
      : [];
    const latestCommunicationMap = new Map<string, Date>();
    communicationLogs.forEach((log) => {
      if (!log.sourceId) return;
      if (!latestCommunicationMap.has(log.sourceId)) {
        latestCommunicationMap.set(log.sourceId, log.createdAt);
      }
    });

    return orders.map((order) => ({
      ...order,
      customerName: order.contactId
        ? customerMap.get(order.contactId)?.name ?? DEFAULT_WALK_IN_CUSTOMER_NAME
        : DEFAULT_WALK_IN_CUSTOMER_NAME,
      customerPhone: order.contactId ? customerMap.get(order.contactId)?.phone ?? null : null,
      customerEmail: order.contactId ? customerMap.get(order.contactId)?.email ?? null : null,
      latestCommunicationAt: latestCommunicationMap.get(order.id) ?? null,
    }));
  }

  static async create(input: CreatePOSServiceOrderInput, userId: string) {
    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.pOSSession.findUnique({ where: { id: input.sessionId } });
      if (!session || session.status !== "OPEN") {
        throw new Error("Session is not open");
      }
      if (!session.companyId) {
        throw new Error("Session is not bound to an active company");
      }

      if (input.items.length === 0) {
        throw new Error("Service order items are required");
      }

      const productIds = input.items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          companyId: session.companyId,
        },
        select: { id: true, name: true, price: true, isService: true },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      let hasServiceItem = false;
      for (const item of input.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        if (product.isService) hasServiceItem = true;
        if (item.quantity <= 0) {
          throw new Error("Quantity must be greater than zero");
        }
      }
      if (!hasServiceItem) {
        throw new Error("Service order must contain at least one service item");
      }

      const [orderNumber, salesOrderNumber, invoiceNumber] = await Promise.all([
        this.generateServiceDocNumber(tx, "SERVICE_ORDER", "Service Order", "SVC-"),
        this.generateServiceDocNumber(tx, "SERVICE_SALES_ORDER", "Service Sales Order", "SSO-"),
        this.generateServiceDocNumber(tx, "SERVICE_INVOICE", "Service Invoice", "SINV-"),
      ]);

      const contactId = await this.resolveCustomer(tx, session.companyId, input.customerId);
      const serviceItems = await Promise.all(
        input.items.map(async (item) => {
          const product = productMap.get(item.productId)!;
          const unitPrice = new Decimal(item.price ?? product.price);
          const lineSubtotal = unitPrice.mul(item.quantity);
          const lineDiscount = new Decimal(item.discount ?? 0);
          const totalPrice = Decimal.max(new Decimal(0), lineSubtotal.minus(lineDiscount));
          const activeBom = await tx.billOfMaterial.findFirst({
            where: { productId: item.productId, isActive: true },
            select: { id: true },
          });

          return {
            productId: item.productId,
            productName: product.name,
            quantity: item.quantity,
            unitPrice,
            discountAmount: lineDiscount,
            totalPrice,
            hasActiveBom: Boolean(activeBom),
            notes: item.notes,
          };
        })
      );

      const subtotal = serviceItems.reduce(
        (sum, item) => sum.plus(item.unitPrice.mul(item.quantity)),
        new Decimal(0),
      );
      const totalDiscount = serviceItems.reduce((sum, item) => sum.plus(item.discountAmount), new Decimal(0));
      const totalAmount = Decimal.max(new Decimal(0), subtotal.minus(totalDiscount));

      const salesOrder = await tx.salesOrder.create({
        data: {
          companyId: session.companyId,
          orderNumber: salesOrderNumber,
          contactId,
          status: "CONFIRMED",
          orderDate: new Date(),
          confirmedAt: new Date(),
          confirmedById: userId,
          subtotal,
          discountAmount: totalDiscount,
          totalAmount,
          posSessionId: input.sessionId,
          notes: "POS Service Workflow",
          items: {
            create: serviceItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              discountRate: new Decimal(0),
            })),
          },
        },
        include: { items: true },
      });

      const downPayment = new Decimal(input.downPaymentAmount ?? 0);
      if (downPayment.lt(0)) {
        throw new Error("Down payment cannot be negative");
      }
      if (downPayment.gt(totalAmount)) {
        throw new Error("Down payment cannot exceed total amount");
      }

      const remaining = totalAmount.minus(downPayment);
      const invoiceStatus = downPayment.eq(0)
        ? "ISSUED"
        : remaining.eq(0)
          ? "PAID"
          : "PARTIALLY_PAID";

      const salesInvoice = await tx.salesInvoice.create({
        data: {
          companyId: session.companyId,
          invoiceNumber,
          contactId,
          salesOrderId: salesOrder.id,
          invoiceDate: new Date(),
          dueDate: input.targetDate ?? new Date(),
          status: invoiceStatus,
          subtotal,
          globalDiscount: totalDiscount,
          totalTax: new Decimal(0),
          shippingCost: new Decimal(0),
          totalAmount,
          balanceDue: remaining,
          notes: "POS Service Workflow",
          posSessionId: input.sessionId,
          items: {
            create: serviceItems.map((item) => ({
              description: item.productName,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              discount: item.discountAmount,
              tax: new Decimal(0),
            })),
          },
        },
      });

      if (downPayment.gt(0)) {
        if (!input.paymentMethod) {
          throw new Error("Payment method is required when down payment is provided");
        }
        await this.createPayment(tx, {
          contactId,
          invoiceNumber,
          salesInvoiceId: salesInvoice.id,
          sessionId: input.sessionId,
          companyId: session.companyId,
          paymentMethod: input.paymentMethod,
          cashAccountId: input.downPaymentCashAccountId,
          paymentAmount: downPayment,
        });
      }

      const serviceOrder = await tx.pOSServiceOrder.create({
        data: {
          companyId: session.companyId,
          orderNumber,
          status: "NEW",
          posSessionId: input.sessionId,
          contactId,
          salesOrderId: salesOrder.id,
          salesInvoiceId: salesInvoice.id,
          notes: input.notes,
          subtotal,
          totalAmount,
          dpAmount: downPayment,
          paidAmount: downPayment,
          remainingAmount: remaining,
          targetDate: input.targetDate,
          createdById: userId,
          items: {
            create: serviceItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountAmount: item.discountAmount,
              totalPrice: item.totalPrice,
              hasActiveBom: item.hasActiveBom,
              notes: item.notes,
            })),
          },
        },
        include: { items: true },
      });

      return serviceOrder;
    }, { timeout: POS_SERVICE_INTERACTIVE_TX_TIMEOUT_MS });

    return result;
  }

  static async transitionStatus(orderId: string, nextStatus: ServiceWorkflowStatus, userId: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.pOSServiceOrder.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) {
        throw new Error("Service order not found");
      }

      if (order.status === nextStatus) {
        return order;
      }

      const allowed = allowedStatusTransitions[order.status as ServiceWorkflowStatus] ?? [];
      if (!allowed.includes(nextStatus)) {
        throw new Error(`Invalid status transition ${order.status} -> ${nextStatus}`);
      }

      if (nextStatus === "DONE") {
        await this.completeServiceOrder(tx, order, userId);
      }

      if (nextStatus === "CLOSED") {
        const invoice = await tx.salesInvoice.findUnique({ where: { id: order.salesInvoiceId } });
        if (!invoice || invoice.status !== "PAID") {
          throw new Error("Service order can only be closed when invoice is fully paid");
        }
      }

      const now = new Date();
      const data: Prisma.POSServiceOrderUpdateInput = {
        status: nextStatus,
      };

      if (nextStatus === "PROCESSING") data.processingAt = now;
      if (nextStatus === "READY") data.readyAt = now;
      if (nextStatus === "DONE") data.doneAt = now;
      if (nextStatus === "CLOSED") data.closedAt = now;
      if (nextStatus === "CANCELLED") data.cancelledAt = now;

      return tx.pOSServiceOrder.update({
        where: { id: orderId },
        data,
        include: { items: true },
      });
    }, { timeout: POS_SERVICE_INTERACTIVE_TX_TIMEOUT_MS });
  }

  static async settle(
    orderId: string,
    cashAccountId?: string,
    amount?: number,
    paymentMethod: ServicePaymentMethod = "CASH",
  ) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.pOSServiceOrder.findUnique({ where: { id: orderId } });
      if (!order) throw new Error("Service order not found");

      const invoice = await tx.salesInvoice.findUnique({
        where: { id: order.salesInvoiceId },
        include: { payments: true },
      });
      if (!invoice) throw new Error("Invoice not found");

      const totalPaid = invoice.payments.reduce(
        (sum, payment) => sum.plus(payment.amount),
        new Decimal(0),
      );
      const remaining = new Decimal(invoice.totalAmount).minus(totalPaid);
      if (remaining.lte(0)) throw new Error("Invoice has no remaining balance");

      const paymentAmount = amount !== undefined ? new Decimal(amount) : remaining;
      if (paymentAmount.lte(0)) throw new Error("Payment amount must be greater than zero");
      if (paymentAmount.gt(remaining)) throw new Error("Payment amount exceeds remaining balance");

      await this.createPayment(tx, {
        contactId: invoice.contactId,
        invoiceNumber: invoice.invoiceNumber,
        salesInvoiceId: invoice.id,
        sessionId: order.posSessionId,
        companyId: order.companyId || undefined,
        paymentMethod,
        cashAccountId,
        paymentAmount,
      });

      const newPaid = totalPaid.plus(paymentAmount);
      const newRemaining = new Decimal(invoice.totalAmount).minus(newPaid);
      const invoiceStatus = newRemaining.lte(0) ? "PAID" : "PARTIALLY_PAID";

      await tx.salesInvoice.update({
        where: { id: invoice.id },
        data: {
          status: invoiceStatus,
          balanceDue: Decimal.max(new Decimal(0), newRemaining),
        },
      });

      return tx.pOSServiceOrder.update({
        where: { id: orderId },
        data: {
          paidAmount: newPaid,
          remainingAmount: Decimal.max(new Decimal(0), newRemaining),
        },
        include: { items: true },
      });
    }, { timeout: POS_SERVICE_INTERACTIVE_TX_TIMEOUT_MS });
  }

  private static async completeServiceOrder(
    tx: Prisma.TransactionClient,
    order: Prisma.POSServiceOrderGetPayload<{ include: { items: true } }>,
    userId: string,
  ) {
    const existingCompletedShipment = await tx.salesShipment.findFirst({
      where: {
        salesOrderId: order.salesOrderId,
        status: "COMPLETED",
      },
      select: { id: true },
    });
    if (existingCompletedShipment) {
      return;
    }

    const salesOrder = await tx.salesOrder.findUnique({
      where: { id: order.salesOrderId },
      include: { items: true },
    });
    if (!salesOrder) {
      throw new Error("Sales order not found for service order");
    }

    const shipmentNumber = await this.generateServiceDocNumber(
      tx,
      "SERVICE_SHIPMENT",
      "Service Shipment",
      "SSHP-",
    );
    const shipment = await tx.salesShipment.create({
      data: {
        shipmentNumber,
        salesOrderId: salesOrder.id,
        contactId: salesOrder.contactId,
        status: "COMPLETED",
        shipmentDate: new Date(),
        notes: `Service completion for ${order.orderNumber}`,
        items: {
          create: salesOrder.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            salesOrderItemId: item.id,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of salesOrder.items) {
      await tx.salesOrderItem.update({
        where: { id: item.id },
        data: { shippedQuantity: item.quantity },
      });
    }

    await tx.salesOrder.update({
      where: { id: salesOrder.id },
      data: {
        status: "SHIPPED",
        closedAt: new Date(),
        closedById: userId,
      },
    });

    const soldItems = shipment.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    const movementItems = await resolveStockConsumptionItems(tx, soldItems);

    if (movementItems.length > 0) {
      await InventoryService.createInventoryMovement(tx, {
        type: MovementType.OUT,
        reference: shipment.shipmentNumber,
        notes: `POS Service ${order.orderNumber} (stock consumption)`,
        items: movementItems,
        transactionDate: new Date(),
      });

      const totalCogs = await this.calculateInventoryOutCost(tx, movementItems);
      if (totalCogs.gt(0)) {
        const cogsAccount = await getRequiredDefaultAccount("COGS");
        const inventoryAccount = await getRequiredDefaultAccount("INVENTORY_ASSET");
        const cogsJournal = await JournalService.createJournalEntry(
          {
            entryNumber: `JE-${shipment.shipmentNumber}`,
            transactionDate: new Date(),
            description: `Cost of Goods Sold for Service Shipment #${shipment.shipmentNumber}`,
            lines: [
              {
                accountId: cogsAccount.accountId,
                debitAmount: totalCogs.toNumber(),
                creditAmount: 0,
                description: "Cost of Goods Sold",
              },
              {
                accountId: inventoryAccount.accountId,
                debitAmount: 0,
                creditAmount: totalCogs.toNumber(),
                description: "Inventory Asset",
              },
            ],
          },
          userId,
          tx,
        );

        await JournalService.postJournalEntry(cogsJournal.id, tx);
      }
    }
  }

  private static async calculateInventoryOutCost(
    tx: Prisma.TransactionClient,
    movementItems: Array<{ productId: string; quantity: number }>,
  ): Promise<Decimal> {
    let total = new Decimal(0);

    for (const item of movementItems) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { averageCost: true, cost: true },
      });
      if (!product) {
        throw new Error(`Product not found for inventory valuation: ${item.productId}`);
      }

      const unitCost = new Decimal(product.averageCost ?? product.cost ?? 0);
      total = total.plus(unitCost.mul(item.quantity));
    }

    return total;
  }

  private static async createPayment(
    tx: Prisma.TransactionClient,
    params: {
      contactId: string;
      invoiceNumber: string;
      salesInvoiceId: string;
      sessionId: string;
      companyId?: string;
      paymentMethod: ServicePaymentMethod;
      cashAccountId?: string;
      paymentAmount: Decimal;
    },
  ) {
    const paymentNumber = await this.generateServiceDocNumber(
      tx,
      "SERVICE_PAYMENT",
      "Service Payment",
      "SPAY-",
    );
    const cashAccount = params.cashAccountId
      ? await tx.cashAccount.findFirst({
          where: {
            id: params.cashAccountId,
            isActive: true,
            glAccount: params.companyId ? { companyId: params.companyId } : undefined,
          },
        })
      : params.companyId
      ? await PaymentAccountResolverService.resolveAccount(tx, {
          companyId: params.companyId,
          method: params.paymentMethod,
        })
      : await tx.cashAccount.findFirst({
          where: {
            isActive: true,
            type: { in: params.paymentMethod === "CASH" ? ["CASH", "PETTY_CASH"] : ["BANK", "EWALLET"] },
          },
          orderBy: [{ name: "asc" }],
        });

    if (!cashAccount) throw new Error("No Cash/Bank account configured");
    const paymentMethod: ServicePaymentMethod =
      cashAccount.type === "CASH" || cashAccount.type === "PETTY_CASH" ? "CASH" : "BANK";

    return tx.salesPayment.create({
      data: {
        companyId: params.companyId,
        paymentNumber,
        contactId: params.contactId,
        amount: params.paymentAmount,
        paymentDate: new Date(),
        method: paymentMethod,
        reference: params.invoiceNumber,
        cashAccountId: cashAccount.id,
        posSessionId: params.sessionId,
        salesInvoiceId: params.salesInvoiceId,
      },
    });
  }

  private static async resolveCustomer(
    tx: Prisma.TransactionClient,
    companyId: string,
    customerId?: string,
  ): Promise<string> {
    if (customerId) {
      const customer = await tx.contact.findFirst({
        where: { id: customerId, companyId, type: "CUSTOMER" },
        select: { id: true },
      });
      if (!customer) {
        throw new Error("Customer not found in active company");
      }
      return customer.id;
    }

    const walkIn = await tx.contact.findFirst({
      where: { companyId, name: DEFAULT_WALK_IN_CUSTOMER_NAME, type: "CUSTOMER" },
    });

    if (walkIn) return walkIn.id;

    const newWalkIn = await tx.contact.create({
      data: { companyId, name: DEFAULT_WALK_IN_CUSTOMER_NAME, type: "CUSTOMER" },
    });
    return newWalkIn.id;
  }
}
