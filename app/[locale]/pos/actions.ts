"use server";

import { prisma } from "@/lib/prisma";
import { revalidateLocalizedPath, revalidateLocalizedPaths } from "@/lib/revalidate-localized-path";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { SuperJSON } from "@/lib/superjson";
import type { ActionResponse } from "@/lib/permissions/protected-action";
import { POSTransactionService } from "@/modules/pos/services/pos-transaction.service";
import { POSSessionService } from "@/modules/pos/services/pos-session.service";
import { HeldOrderService } from "@/modules/pos/services/held-order.service";
import { DiningSpotService } from "@/modules/pos/services/dining-spot.service";
import { RestaurantOrderService } from "@/modules/pos/services/restaurant-order.service";
import {
  POSServiceWorkflowService,
  type ServicePaymentMethod,
  type ServiceWorkflowStatus,
} from "@/modules/services/services/pos-service-workflow.service";
import { ContactType } from "@/prisma/generated/prisma/client";
import { POSCartItem } from "./types";

export type POSCheckoutSettings = {
  feeLines: {
    id: string;
    name: string;
    category: "TAX" | "FEE";
    valueType: "PERCENTAGE" | "FIXED";
    value: number;
    sortOrder: number;
    isActive: boolean;
  }[];
};

async function isRestaurantFeaturesEnabled() {
  const session = await getSession();
  if (!session?.activeCompanyId) return false;

  const profile = await prisma.companyProfile.findUnique({
    where: { companyId: session.activeCompanyId },
    select: { posEnableRestaurantFeatures: true },
  });
  return profile?.posEnableRestaurantFeatures !== false;
}

async function assertRestaurantFeaturesEnabled() {
  const enabled = await isRestaurantFeaturesEnabled();
  if (!enabled) {
    throw new Error("Restaurant features are disabled in POS settings");
  }
}

export async function getPOSSessions() {
  const session = await getSession();
  if (!session || !session.activeCompanyId || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize([]);
  }

  const sessions = await prisma.pOSSession.findMany({
    where: { companyId: session.activeCompanyId },
    orderBy: { startTime: "desc" },
    include: {
      warehouse: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          salesOrders: true,
        },
      },
    },
  });

  const sessionsWithCashier = await Promise.all(
    sessions.map(async (s: any) => {
      const cashier = await prisma.user.findUnique({
        where: { id: s.cashierId },
        select: { name: true },
      });
      return {
        ...s,
        cashier,
      };
    }),
  );

  return SuperJSON.serialize(sessionsWithCashier);
}

export async function getPOSProducts(
  page: number = 1,
  pageSize: number = 20,
  query?: string,
  categoryId?: string,
) {
  const session = await getSession();
  if (!session || !session.activeCompanyId || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize({
      items: [],
      total: 0,
      hasMore: false,
    });
  }

  const companyProfile = session.activeCompanyId
    ? await prisma.companyProfile.findUnique({
        where: { companyId: session.activeCompanyId },
        select: { posProductVisibilityMode: true },
      })
    : null;
  const visibilityMode = companyProfile?.posProductVisibilityMode || "POS_ONLY";

  const where: any = {
    companyId: session.activeCompanyId,
    isActive: true,
  };
  if (visibilityMode !== "ALL_ACTIVE") {
    where.showInPos = true;
  }

  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { sku: { contains: query, mode: "insensitive" } },
    ];
  }

  if (categoryId && categoryId !== "all") {
    where.categoryId = categoryId;
  }

  const now = new Date();

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        inventory: {
          include: {
            warehouse: true,
          },
        },
        discounts: {
          where: {
            isActive: true,
            startDate: { lte: now },
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
        },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  const mapped = products.map((p) => {
    const totalStock = p.inventory.reduce((acc, inv) => acc + inv.quantity, 0);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price.toNumber(),
      image: p.image,
      isService: p.isService,
      categoryId: p.categoryId,
      categoryName: p.category?.name || null,
      stock: totalStock,
      availableDiscounts: p.discounts.map((d) => ({
        code: d.code,
        type: d.type,
        value: d.value.toNumber(),
      })),
    };
  });

  return SuperJSON.serialize({
    items: mapped,
    total,
    hasMore: page * pageSize < total,
  });
}

export async function getPOSServiceProducts() {
  const session = await getSession();
  if (!session || !session.activeCompanyId || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize([]);
  }

  const now = new Date();
  const products = await prisma.product.findMany({
    where: {
      companyId: session.activeCompanyId,
      isActive: true,
    },
    include: {
      category: true,
      inventory: {
        include: {
          warehouse: true,
        },
      },
      discounts: {
        where: {
          isActive: true,
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const mapped = products.map((p) => {
    const totalStock = p.inventory.reduce((acc, inv) => acc + inv.quantity, 0);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price.toNumber(),
      image: p.image,
      isService: p.isService,
      categoryId: p.categoryId,
      categoryName: p.category?.name || null,
      stock: totalStock,
      availableDiscounts: p.discounts.map((d) => ({
        code: d.code,
        type: d.type,
        value: d.value.toNumber(),
      })),
    };
  });

  return SuperJSON.serialize(mapped);
}

export async function getPOSContacts(search: string = "", take: number = 30) {
  const session = await getSession();
  if (!session || !session.activeCompanyId || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize([]);
  }

  const normalizedTake = Number.isFinite(take) ? Math.max(1, Math.min(take, 100)) : 30;
  const normalizedSearch = search.trim();

  const contacts = await prisma.contact.findMany({
    where: {
      companyId: session.activeCompanyId,
      type: ContactType.CUSTOMER,
      isActive: true,
      ...(normalizedSearch
        ? {
            OR: [
              { name: { contains: normalizedSearch, mode: "insensitive" } },
              { phone: { contains: normalizedSearch, mode: "insensitive" } },
              { email: { contains: normalizedSearch, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
    },
    orderBy: { name: "asc" },
    take: normalizedTake,
  });

  return SuperJSON.serialize(contacts);
}

export async function getPOSServiceNotifySettings() {
  const session = await getSession();
  if (!session || !session.activeCompanyId || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize({
      serviceNotifyOnCreated: true,
      serviceNotifyOnReady: true,
      serviceNotifyOnCostDone: true,
      serviceNotifyOnPickedUp: true,
      serviceTemplateCreated: "",
      serviceTemplateReady: "",
      serviceTemplateCostDone: "",
      serviceTemplatePickedUp: "",
      serviceWarrantyDuration: 0,
      serviceWarrantyUnit: "DAY",
    });
  }

  const profile = await prisma.companyProfile.findUnique({
    where: { companyId: session.activeCompanyId },
    select: {
      serviceNotifyOnCreated: true,
      serviceNotifyOnReady: true,
      serviceNotifyOnCostDone: true,
      serviceNotifyOnPickedUp: true,
      serviceTemplateCreated: true,
      serviceTemplateReady: true,
      serviceTemplateCostDone: true,
      serviceTemplatePickedUp: true,
      serviceWarrantyDuration: true,
      serviceWarrantyUnit: true,
    },
  });

  return SuperJSON.serialize({
    serviceNotifyOnCreated: profile?.serviceNotifyOnCreated ?? true,
    serviceNotifyOnReady: profile?.serviceNotifyOnReady ?? true,
    serviceNotifyOnCostDone: profile?.serviceNotifyOnCostDone ?? true,
    serviceNotifyOnPickedUp: profile?.serviceNotifyOnPickedUp ?? true,
    serviceTemplateCreated: profile?.serviceTemplateCreated || "",
    serviceTemplateReady: profile?.serviceTemplateReady || "",
    serviceTemplateCostDone: profile?.serviceTemplateCostDone || "",
    serviceTemplatePickedUp: profile?.serviceTemplatePickedUp || "",
    serviceWarrantyDuration: profile?.serviceWarrantyDuration ?? 0,
    serviceWarrantyUnit: profile?.serviceWarrantyUnit || "DAY",
  });
}

export async function createPOSQuickContact(input: {
  name: string;
  phone?: string;
  email?: string;
}) {
  const session = await getSession();
  if (!session || !session.activeCompanyId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }

  const name = input.name.trim();
  const phone = input.phone?.trim() || null;
  const email = input.email?.trim() || null;

  if (!name) {
    throw new Error("Nama kontak wajib diisi");
  }

  const contact = await prisma.contact.create({
    data: {
      companyId: session.activeCompanyId,
      type: ContactType.CUSTOMER,
      name,
      phone,
      email,
      isActive: true,
      taxExempt: false,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
    },
  });

  revalidateLocalizedPath("/pos");
  revalidateLocalizedPath("/general/contacts");
  return SuperJSON.serialize(contact);
}

export async function getPOSCheckoutSettings(): Promise<POSCheckoutSettings> {
  const session = await getSession();
  if (!session?.activeCompanyId) {
    return { feeLines: [] };
  }

  const feeLines = await prisma.pOSFeeSetting.findMany({
    where: { isActive: true, companyId: session.activeCompanyId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return {
    feeLines: feeLines.map((line) => ({
      id: line.id,
      name: line.name,
      category: line.category as "TAX" | "FEE",
      valueType: line.valueType as "PERCENTAGE" | "FIXED",
      value: Number(line.value || 0),
      sortOrder: line.sortOrder,
      isActive: line.isActive,
    })),
  };
}

export async function getPOSCategories() {
  const session = await getSession();
  if (!session || !session.activeCompanyId || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize([]);
  }

  const categories = await prisma.category.findMany({
    where: { companyId: session.activeCompanyId },
    orderBy: { name: "asc" },
  });
  return SuperJSON.serialize(categories);
}

export async function getWarehouses() {
  const session = await getSession();
  if (!session || !session.activeCompanyId || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize([]);
  }

  const warehouses = await prisma.warehouse.findMany({
    where: { companyId: session.activeCompanyId },
    orderBy: { name: "asc" },
  });
  return SuperJSON.serialize(warehouses);
}

export async function getOpenPOSSession() {
  const session = await getSession();
  const userId = session?.userId;

  if (!userId || !session?.activeCompanyId || !hasPermission(session.permissions, "pos.access"))
    return null;

  const posSession = await prisma.pOSSession.findFirst({
    where: {
      companyId: session.activeCompanyId,
      status: "OPEN",
      cashierId: userId,
    },
    include: {
      warehouse: true,
    },
  });

  if (!posSession) return null;

  const cashier = await prisma.user.findUnique({
    where: { id: posSession.cashierId },
    select: { name: true },
  });

  return SuperJSON.serialize({
    ...posSession,
    cashier,
  });
}

export async function getDiningSpots() {
  const session = await getSession();
  if (!session || !session.activeCompanyId || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize([]);
  }
  const restaurantEnabled = await isRestaurantFeaturesEnabled();
  if (!restaurantEnabled) {
    return SuperJSON.serialize([]);
  }

  await DiningSpotService.ensureDefaultLayout();

  const spots = await prisma.diningSpot.findMany({
    where: { isActive: true, companyId: session.activeCompanyId },
    include: {
      area: true,
      sessions: {
        where: { closedAt: null },
        orderBy: { openedAt: "desc" },
        take: 1,
      },
      _count: {
        select: { heldOrders: true },
      },
    },
    orderBy: [{ area: { sortOrder: "asc" } }, { spotCode: "asc" }],
  });

  return SuperJSON.serialize(spots);
}

export async function openDiningSpot(
  diningSpotId: string,
  guestCount?: number,
  notes?: string,
) {
  const session = await getSession();
  if (!session?.userId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }
  await assertRestaurantFeaturesEnabled();

  const result = await DiningSpotService.openSpot(
    diningSpotId,
    session.userId,
    guestCount,
    notes,
  );
  revalidateLocalizedPath("/pos");
  return SuperJSON.serialize(result);
}

export async function closeDiningSpot(diningSpotId: string, notes?: string) {
  const session = await getSession();
  if (!session?.userId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }
  await assertRestaurantFeaturesEnabled();

  await DiningSpotService.closeSpot(diningSpotId, session.userId, notes);
  revalidateLocalizedPath("/pos");
}

export async function getRestaurantFloorOverview(sessionId: string) {
  const session = await getSession();
  if (!session?.userId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }
  const restaurantEnabled = await isRestaurantFeaturesEnabled();
  if (!restaurantEnabled) {
    return SuperJSON.serialize([]);
  }
  const data = await RestaurantOrderService.getFloorOverview(sessionId);
  return SuperJSON.serialize(data);
}

export async function sendOrderToKitchen(
  sessionId: string,
  diningSpotId: string,
  items: {
    productId: string;
    quantity: number;
    price: number;
    discount?: number;
    note?: string;
    station?: string;
  }[],
  note?: string,
  customerId?: string,
  globalDiscount: number = 0,
) {
  const session = await getSession();
  if (!session?.userId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }
  await assertRestaurantFeaturesEnabled();

  const result = await RestaurantOrderService.sendToKitchen({
    sessionId,
    userId: session.userId,
    diningSpotId,
    items,
    note,
    customerId,
    globalDiscount,
  });

  revalidateLocalizedPaths([
    "/pos",
    "/pos/restaurant",
    "/pos/restaurant/kitchen",
    "/pos/restaurant/billing",
  ]);
  return SuperJSON.serialize(result);
}

export async function getKitchenTickets(sessionId: string, station?: string) {
  const session = await getSession();
  if (!session?.userId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }
  const restaurantEnabled = await isRestaurantFeaturesEnabled();
  if (!restaurantEnabled) {
    return SuperJSON.serialize([]);
  }
  const data = await RestaurantOrderService.getKitchenTickets(sessionId, station);
  return SuperJSON.serialize(data);
}

export async function getKitchenTicketForPrint(ticketId: string) {
  const session = await getSession();
  if (!session?.userId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }
  await assertRestaurantFeaturesEnabled();
  const data = await RestaurantOrderService.getKitchenTicketForPrint(ticketId);
  return SuperJSON.serialize(data);
}

export async function updateKitchenItemStatus(
  kitchenItemId: string,
  status: "NEW" | "COOKING" | "READY" | "SERVED" | "CANCELLED",
) {
  const session = await getSession();
  if (!session?.userId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }
  await assertRestaurantFeaturesEnabled();

  await RestaurantOrderService.updateKitchenItemStatus(kitchenItemId, status);
  revalidateLocalizedPaths([
    "/pos/restaurant",
    "/pos/restaurant/kitchen",
    "/pos/restaurant/billing",
  ]);
}

export async function getRestaurantBillingQueue(sessionId: string) {
  const session = await getSession();
  if (!session?.userId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }
  const restaurantEnabled = await isRestaurantFeaturesEnabled();
  if (!restaurantEnabled) {
    return SuperJSON.serialize([]);
  }
  const data = await RestaurantOrderService.getBillingQueue(sessionId);
  return SuperJSON.serialize(data);
}

export async function generateRestaurantBill(
  sessionId: string,
  orderId: string,
  feeBreakdown: {
    lines: {
      name: string;
      category: "TAX" | "FEE";
      valueType: "PERCENTAGE" | "FIXED";
      value: number;
      amount: number;
    }[];
  },
) {
  const session = await getSession();
  if (!session?.userId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }
  await assertRestaurantFeaturesEnabled();

  const result = await RestaurantOrderService.generateBill(sessionId, orderId, feeBreakdown);
  revalidateLocalizedPaths(["/pos/restaurant", "/pos/restaurant/billing"]);
  return SuperJSON.serialize(result);
}

export async function settleRestaurantBill(
  sessionId: string,
  orderId: string,
  paymentMethod: "CASH" | "CARD" | "QRIS",
  amount?: number,
) {
  const session = await getSession();
  if (!session?.userId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }
  await assertRestaurantFeaturesEnabled();

  const result = await RestaurantOrderService.settleBill(
    sessionId,
    orderId,
    paymentMethod,
    amount,
  );
  revalidateLocalizedPaths(["/pos/restaurant", "/pos/restaurant/billing"]);
  return SuperJSON.serialize(result);
}

export async function closeRestaurantOrder(orderId: string) {
  const session = await getSession();
  if (!session?.userId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }
  await assertRestaurantFeaturesEnabled();

  await RestaurantOrderService.closePaidOrder(orderId, session.userId);
  revalidateLocalizedPaths(["/pos/restaurant", "/pos/restaurant/billing"]);
}

export async function openPOSSession(openingCash: number, warehouseId: string) {
  const session = await getSession();
  const userId = session?.userId;
  if (!userId || !hasPermission(session.permissions, "pos.access"))
    throw new Error("Unauthorized");
  if (!session.activeCompanyId) {
    throw new Error("No active company selected");
  }

  const newSession = await POSSessionService.open(
    userId,
    session.activeCompanyId,
    openingCash,
    warehouseId,
  );

  revalidateLocalizedPath("/pos");
  return SuperJSON.serialize(newSession);
}

export async function closePOSSession(
  sessionId: string,
  actualCash: number,
  notes?: string,
) {
  const sessionUser = await getSession();
  if (!sessionUser || !hasPermission(sessionUser.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }

  await POSSessionService.close(sessionId, actualCash, notes, sessionUser.userId);

  revalidateLocalizedPath("/pos");
}

export async function getPOSSessionCloseSummary(sessionId: string) {
  const sessionUser = await getSession();
  if (!sessionUser || !hasPermission(sessionUser.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }

  const summary = await POSSessionService.getCashSummary(sessionId);
  return SuperJSON.serialize({
    openingCash: Number(summary.openingCash),
    cashSales: Number(summary.cashSales),
    systemCash: Number(summary.systemCash),
  });
}

export async function getPOSSessionTransactions(sessionId: string) {
  const transactions = await prisma.salesInvoice.findMany({
    where: { posSessionId: sessionId },
    orderBy: { createdAt: "desc" },
    include: {
      contact: {
        select: {
          name: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
      posSession: true,
    },
  });

  const transactionsWithCashier = await Promise.all(
    transactions.map(async (t: any) => {
      const cashier = await prisma.user.findUnique({
        where: { id: t.posSession?.cashierId },
        select: { name: true },
      });
      return {
        ...t,
        posSession: {
          ...t.posSession,
          cashier,
        },
      };
    }),
  );

  return SuperJSON.serialize(transactionsWithCashier);
}

export async function processPOSTransaction(
  sessionId: string,
  items: {
    productId: string;
    quantity: number;
    price: number;
    discount: number;
  }[],
  paymentMethod: "CASH" | "CARD" | "QRIS",
  amountPaid: number,
  globalDiscount: number = 0,
  feeBreakdown: {
    lines: {
      name: string;
      category: "TAX" | "FEE";
      valueType: "PERCENTAGE" | "FIXED";
      value: number;
      amount: number;
    }[];
  },
  customerId?: string,
  diningSpotId?: string,
): Promise<
  ActionResponse<{
    invoiceId: string;
    outbox: {
      outboxIds: string[];
      alreadyQueuedIds: string[];
      processed: boolean;
    };
  }>
> {
  try {
    const result = await POSTransactionService.process(
      sessionId,
      items,
      paymentMethod,
      amountPaid,
      globalDiscount,
      feeBreakdown,
      customerId,
      diningSpotId,
    );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to process POS transaction",
    };
  }
}

export async function holdOrder(
  cart: POSCartItem[],
  totalAmount: number,
  note?: string,
  customerId?: string,
  customerName?: string,
  globalDiscount: number = 0,
  diningSpotId?: string,
) {
  const session = await getSession();
  const userId = session?.userId;
  if (!userId) throw new Error("Unauthorized");

  const heldOrder = await HeldOrderService.hold(
    userId,
    cart,
    totalAmount,
    note,
    customerId,
    customerName,
    globalDiscount,
    diningSpotId,
  );

  revalidateLocalizedPath("/pos");
  return SuperJSON.serialize(heldOrder);
}

export async function validateDiscountCode(code: string) {
  const discount = await prisma.discount.findUnique({
    where: { code, isActive: true },
    include: {
      products: {
        select: { id: true },
      },
    },
  });

  if (!discount) {
    throw new Error("Invalid discount code");
  }

  const now = new Date();
  if (
    discount.startDate > now ||
    (discount.endDate && discount.endDate < now)
  ) {
    throw new Error("Discount code is expired or not yet active");
  }

  return SuperJSON.serialize(discount);
}

export async function getHeldOrders() {
  const session = await getSession();
  if (!session?.userId || !session.activeCompanyId) throw new Error("Unauthorized");

  await HeldOrderService.cleanupExpired();

  const heldOrders = await prisma.heldOrder.findMany({
    where: { companyId: session.activeCompanyId },
    orderBy: { createdAt: "desc" },
    include: { customer: true, diningSpot: true },
  });

  return SuperJSON.serialize(heldOrders);
}

export async function getPOSInvoice(id: string) {
  const session = await getSession();
  if (!session?.userId || !session.activeCompanyId) throw new Error("Unauthorized");

  const invoice = await prisma.salesInvoice.findFirst({
    where: { id, companyId: session.activeCompanyId },
    include: {
      contact: true,
      items: {
        include: {
          product: true,
        },
      },
      payments: {
        include: {
          cashAccount: true,
        },
      },
      salesOrder: true,
      posSession: true,
    },
  });

  if (!invoice) return null;

  return SuperJSON.serialize(invoice);
}

export async function getPOSServiceOrders(
  sessionId: string,
  status?: ServiceWorkflowStatus,
) {
  const session = await getSession();
  if (!session?.userId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }

  const orders = await POSServiceWorkflowService.list(sessionId, status);
  return SuperJSON.serialize(orders);
}

export async function createPOSServiceOrder(input: {
  sessionId: string;
  customerId?: string;
  notes?: string;
  targetDate?: Date;
  downPaymentAmount?: number;
  paymentMethod?: ServicePaymentMethod;
  items: Array<{
    productId: string;
    quantity: number;
    price?: number;
    discount?: number;
    notes?: string;
  }>;
}) {
  const session = await getSession();
  if (!session?.userId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }

  const order = await POSServiceWorkflowService.create(input, session.userId);
  revalidateLocalizedPath("/pos");
  return SuperJSON.serialize(order);
}

export async function updatePOSServiceOrderStatus(
  orderId: string,
  status: ServiceWorkflowStatus,
) {
  const session = await getSession();
  if (!session?.userId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }

  const order = await POSServiceWorkflowService.transitionStatus(
    orderId,
    status,
    session.userId,
  );
  revalidateLocalizedPath("/pos");
  return SuperJSON.serialize(order);
}

export async function settlePOSServiceOrder(
  orderId: string,
  paymentMethod: ServicePaymentMethod,
  amount?: number,
) {
  const session = await getSession();
  if (!session?.userId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }

  const order = await POSServiceWorkflowService.settle(orderId, paymentMethod, amount);
  revalidateLocalizedPath("/pos");
  return SuperJSON.serialize(order);
}

export async function resumeOrder(heldOrderId: string) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  const heldOrder = await HeldOrderService.resume(heldOrderId);

  revalidateLocalizedPath("/pos");
  return SuperJSON.serialize(heldOrder);
}

export async function deleteHeldOrder(heldOrderId: string) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  await HeldOrderService.delete(heldOrderId);

  revalidateLocalizedPath("/pos");
}
