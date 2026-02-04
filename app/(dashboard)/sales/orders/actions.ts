"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { getSession } from "@/lib/auth/auth";
import { SalesOrderInput } from "./types";
import { SuperJSON } from "@/lib/superjson";

export async function getSalesOrders(
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
  startDate?: string,
  endDate?: string,
) {
  const skip = (page - 1) * limit;
  const where: Prisma.SalesOrderWhereInput = {
    AND: [],
  };

  if (search) {
    (where.AND as Prisma.SalesOrderWhereInput[]).push({
      OR: [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { contact: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  if (status && status !== "ALL") {
    (where.AND as Prisma.SalesOrderWhereInput[]).push({
      status: status as Prisma.EnumSalesOrderStatusFilter,
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
    (where.AND as Prisma.SalesOrderWhereInput[]).push({
      orderDate: dateFilter,
    });
  }

  const [orders, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      include: {
        contact: true,
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
        confirmedBy: { select: { name: true } },
        closedBy: { select: { name: true } },
        cancelledBy: { select: { name: true } },
        attachments: true,
        items: {
          include: {
            product: {
              include: {
                baseUnit: true,
                salesUnit: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.salesOrder.count({ where }),
  ]);

  return {
    orders: SuperJSON.serialize(orders),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getSalesOrder(id: string) {
  const order = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      contact: true,
      createdBy: { select: { name: true } },
      updatedBy: { select: { name: true } },
      confirmedBy: { select: { name: true } },
      closedBy: { select: { name: true } },
      cancelledBy: { select: { name: true } },
      attachments: true,
      items: {
        include: {
          product: {
            include: {
              baseUnit: true,
              salesUnit: true,
            },
          },
        },
      },
    },
  });

  if (!order) return null;

  return SuperJSON.serialize(order);
}

// Helper to generate SO Number
async function generateSONumber() {
  const count = await prisma.salesOrder.count({
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
  return `SO-${year}${month}-${sequence}`;
}

export const createSalesOrder = authorizedAction(
  "sales.create",
  async (data: SalesOrderInput) => {
    try {
      const session = await getSession();
      // Generate temporary draft number
      const orderNumber = `DRAFT-${Date.now()}`;

      // Calculate totals
      let totalAmount = 0;
      let taxAmount = 0;
      let discountAmount = 0;
      let subtotal = 0;

      data.items.forEach((item) => {
        const lineTotal = item.quantity * item.unitPrice;
        subtotal += lineTotal;
        totalAmount += lineTotal; // Simplified for now, add tax logic later if needed in item level
      });

      const result = await prisma.salesOrder.create({
        data: {
          orderNumber,
          contactId: data.contactId,
          orderDate: data.orderDate,
          expectedDate: data.expectedDate,
          notes: data.notes,
          status: "DRAFT",
          totalAmount,
          subtotal,
          taxAmount,
          discountAmount,
          createdById: session?.userId,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
          attachments: {
            connect: data.attachmentIds?.map((id) => ({ id })) || [],
          },
        },
        include: {
          items: true,
        },
      });

      revalidatePath("/sales/orders");
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to create SO:", error);
      return { success: false, error: "Failed to create Sales Order" };
    }
  },
);

export const updateSalesOrder = authorizedAction(
  "sales.edit",
  async (id: string, data: SalesOrderInput) => {
    try {
      const session = await getSession();
      const currentOrder = await prisma.salesOrder.findUnique({
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
      let subtotal = 0;
      let taxAmount = 0;
      let discountAmount = 0;

      data.items.forEach((item) => {
        const lineTotal = item.quantity * item.unitPrice;
        subtotal += lineTotal;
        totalAmount += lineTotal;
      });

      const result = await prisma.$transaction(async (tx) => {
        // Delete existing items
        await tx.salesOrderItem.deleteMany({
          where: { salesOrderId: id },
        });

        // Update SO and create new items
        return await tx.salesOrder.update({
          where: { id },
          data: {
            contactId: data.contactId,
            orderDate: data.orderDate,
            expectedDate: data.expectedDate,
            notes: data.notes,
            status: "DRAFT", // Ensure it stays DRAFT during update
            totalAmount,
            subtotal,
            updatedById: session?.userId,
            items: {
              create: data.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * item.unitPrice,
              })),
            },
            attachments: {
              set: data.attachmentIds?.map((id) => ({ id })) || [],
            },
          },
        });
      });

      revalidatePath("/sales/orders");
      revalidatePath(`/sales/orders/${id}`);
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to update SO:", error);
      return { success: false, error: "Failed to update Sales Order" };
    }
  },
);

export const confirmSalesOrder = authorizedAction(
  "sales.edit",
  async (id: string) => {
    try {
      const session = await getSession();
      const currentOrder = await prisma.salesOrder.findUnique({
        where: { id },
      });

      if (!currentOrder) throw new Error("Order not found");
      if (currentOrder.status !== "DRAFT") {
        return { success: false, error: "Only Draft orders can be confirmed" };
      }

      const orderNumber = await generateSONumber();

      const result = await prisma.salesOrder.update({
        where: { id },
        data: {
          status: "CONFIRMED",
          orderNumber, // Assign real SO number
          confirmedAt: new Date(),
          confirmedById: session?.userId,
        },
      });

      revalidatePath("/sales/orders");
      revalidatePath(`/sales/orders/${id}`);
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to confirm SO:", error);
      return { success: false, error: "Failed to confirm Sales Order" };
    }
  },
);

export const cancelSalesOrder = authorizedAction(
  "sales.edit",
  async (id: string) => {
    try {
      const session = await getSession();
      const currentOrder = await prisma.salesOrder.findUnique({
        where: { id },
      });

      if (!currentOrder) throw new Error("Order not found");

      // Can cancel DRAFT or CONFIRMED
      if (!["DRAFT", "CONFIRMED"].includes(currentOrder.status)) {
        return { success: false, error: "Cannot cancel this order" };
      }

      const result = await prisma.salesOrder.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledById: session?.userId,
        },
      });

      revalidatePath("/sales/orders");
      revalidatePath(`/sales/orders/${id}`);
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to cancel SO:", error);
      return { success: false, error: "Failed to cancel Sales Order" };
    }
  },
);

export const closeSalesOrder = authorizedAction(
  "sales.edit",
  async (id: string) => {
    try {
      const session = await getSession();
      const currentOrder = await prisma.salesOrder.findUnique({
        where: { id },
      });

      if (!currentOrder) throw new Error("Order not found");

      // Can close CONFIRMED or SHIPPED
      if (!["CONFIRMED", "SHIPPED", "PARTIALLY_SHIPPED"].includes(currentOrder.status)) {
        return { success: false, error: "Cannot close this order" };
      }

      const result = await prisma.salesOrder.update({
        where: { id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closedById: session?.userId,
        },
      });

      revalidatePath("/sales/orders");
      revalidatePath(`/sales/orders/${id}`);
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to close SO:", error);
      return { success: false, error: "Failed to close Sales Order" };
    }
  },
);

export const deleteSalesOrder = authorizedAction(
  "sales.delete",
  async (id: string) => {
    try {
      await prisma.salesOrder.delete({
        where: { id },
      });
      revalidatePath("/sales/orders");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete SO:", error);
      return { success: false, error: "Failed to delete Sales Order" };
    }
  },
);
