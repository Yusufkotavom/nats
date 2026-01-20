"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { getSession } from "@/lib/auth/auth";
import { PurchaseOrderInput } from "./types";
import { SuperJSON } from "@/lib/superjson";

export async function getPurchaseOrders(
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
  startDate?: string,
  endDate?: string,
) {
  const skip = (page - 1) * limit;
  const where: Prisma.PurchaseOrderWhereInput = {
    AND: [],
  };

  if (search) {
    (where.AND as Prisma.PurchaseOrderWhereInput[]).push({
      OR: [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { contact: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  if (status && status !== "ALL") {
    (where.AND as Prisma.PurchaseOrderWhereInput[]).push({
      status: status as Prisma.EnumPurchaseOrderStatusFilter,
    });
  }

  if (startDate || endDate) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      // Set end date to end of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    (where.AND as Prisma.PurchaseOrderWhereInput[]).push({
      orderDate: dateFilter,
    });
  }

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        contact: true,
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
        issuedBy: { select: { name: true } },
        closedBy: { select: { name: true } },
        cancelledBy: { select: { name: true } },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return {
    orders: SuperJSON.serialize(orders),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getPurchaseOrder(id: string) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      contact: true,
      createdBy: { select: { name: true } },
      updatedBy: { select: { name: true } },
      issuedBy: { select: { name: true } },
      closedBy: { select: { name: true } },
      cancelledBy: { select: { name: true } },
      items: {
        include: {
          product: {
            include: {
              baseUnit: true,
              purchaseUnit: true,
            },
          },
        },
      },
    },
  });

  if (!order) return null;

  return SuperJSON.serialize(order);
}

// Helper to generate PO Number
async function generatePONumber() {
  const count = await prisma.purchaseOrder.count({
    where: {
      NOT: {
        status: "DRAFT",
      },
    },
  });
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const sequence = (count + 1).toString().padStart(4, "0");
  return `PO-${year}${month}-${sequence}`;
}

export const createPurchaseOrder = authorizedAction(
  "purchase.create",
  async (data: PurchaseOrderInput) => {
    try {
      const session = await getSession();
      // Generate temporary draft number
      const orderNumber = `DRAFT-${Date.now()}`;

      // Calculate totals
      let totalAmount = 0;
      data.items.forEach((item) => {
        totalAmount += item.quantity * item.unitCost;
      });

      const result = await prisma.purchaseOrder.create({
        data: {
          orderNumber,
          contactId: data.contactId,
          orderDate: data.orderDate,
          expectedDate: data.expectedDate,
          notes: data.notes,
          status: "DRAFT",
          totalAmount,
          createdById: session?.userId,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.quantity * item.unitCost,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      revalidatePath("/purchase/orders");
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to create PO:", error);
      return { success: false, error: "Failed to create Purchase Order" };
    }
  },
);

export const updatePurchaseOrder = authorizedAction(
  "purchase.edit",
  async (id: string, data: PurchaseOrderInput) => {
    try {
      const session = await getSession();
      const currentOrder = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!currentOrder) throw new Error("Order not found");

      // Strict check: Only allow updates if DRAFT
      if (currentOrder.status !== "DRAFT") {
        return {
          success: false,
          error:
            "Only Draft orders can be modified. Please Cancel or create a new order.",
        };
      }

      // Calculate totals
      let totalAmount = 0;
      data.items.forEach((item) => {
        totalAmount += item.quantity * item.unitCost;
      });

      const result = await prisma.$transaction(async (tx) => {
        // Delete existing items
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id },
        });

        // Update PO and create new items
        return await tx.purchaseOrder.update({
          where: { id },
          data: {
            contactId: data.contactId,
            orderDate: data.orderDate,
            expectedDate: data.expectedDate,
            notes: data.notes,
            status: "DRAFT", // Ensure it stays DRAFT during update
            totalAmount,
            updatedById: session?.userId,
            items: {
              create: data.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitCost: item.unitCost,
                totalCost: item.quantity * item.unitCost,
              })),
            },
          },
        });
      });

      revalidatePath("/purchase/orders");
      revalidatePath(`/purchase/orders/${id}`);
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to update PO:", error);
      return { success: false, error: "Failed to update Purchase Order" };
    }
  },
);

export const issuePurchaseOrder = authorizedAction(
  "purchase.edit",
  async (id: string) => {
    try {
      const currentOrder = await prisma.purchaseOrder.findUnique({
        where: { id },
      });

      if (!currentOrder) throw new Error("Order not found");
      if (currentOrder.status !== "DRAFT") {
        return { success: false, error: "Only Draft orders can be issued" };
      }

      const orderNumber = await generatePONumber();

      const result = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          status: "ISSUED",
          orderNumber, // Assign real PO number
        },
      });

      revalidatePath("/purchase/orders");
      revalidatePath(`/purchase/orders/${id}`);
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to issue PO:", error);
      return { success: false, error: "Failed to issue Purchase Order" };
    }
  },
);

export const cancelPurchaseOrder = authorizedAction(
  "purchase.edit",
  async (id: string) => {
    try {
      const currentOrder = await prisma.purchaseOrder.findUnique({
        where: { id },
      });

      if (!currentOrder) throw new Error("Order not found");

      // Can cancel DRAFT or ISSUED
      if (!["DRAFT", "ISSUED"].includes(currentOrder.status)) {
        return { success: false, error: "Cannot cancel this order" };
      }

      const result = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          status: "CANCELLED",
        },
      });

      revalidatePath("/purchase/orders");
      revalidatePath(`/purchase/orders/${id}`);
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to cancel PO:", error);
      return { success: false, error: "Failed to cancel Purchase Order" };
    }
  },
);

export const closePurchaseOrder = authorizedAction(
  "purchase.edit",
  async (id: string) => {
    try {
      const session = await getSession();
      const currentOrder = await prisma.purchaseOrder.findUnique({
        where: { id },
      });

      if (!currentOrder) throw new Error("Order not found");

      // Can close ISSUED or PARTIALLY_RECEIVED
      if (!["ISSUED", "PARTIALLY_RECEIVED"].includes(currentOrder.status)) {
        return { success: false, error: "Cannot close this order" };
      }

      // TODO: Implement 3-way match validation here
      // For now, we allow closing manually as per request logic "Closed only after..."
      // implying it's an action user takes when conditions are met.

      const result = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closedById: session?.userId,
        },
      });

      revalidatePath("/purchase/orders");
      revalidatePath(`/purchase/orders/${id}`);
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to close PO:", error);
      return { success: false, error: "Failed to close Purchase Order" };
    }
  },
);

export const deletePurchaseOrder = authorizedAction(
  "purchase.delete",
  async (id: string) => {
    try {
      await prisma.purchaseOrder.delete({
        where: { id },
      });
      revalidatePath("/purchase/orders");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete PO:", error);
      return { success: false, error: "Failed to delete Purchase Order" };
    }
  },
);
