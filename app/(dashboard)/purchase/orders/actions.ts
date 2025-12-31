"use server";

import { prisma, serializePrisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { PurchaseOrderInput } from "./types";

export async function getPurchaseOrders(
  page: number = 1,
  limit: number = 10,
  search?: string
) {
  const skip = (page - 1) * limit;
  const where: Prisma.PurchaseOrderWhereInput = {
    AND: [],
  };

  if (search) {
    (where.AND as Prisma.PurchaseOrderWhereInput[]).push({
      OR: [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { vendor: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: true,
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
    orders: serializePrisma(orders),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getPurchaseOrder(id: string) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      vendor: true,
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

  return serializePrisma(order);
}

export async function getVendors() {
  const vendors = await prisma.vendor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return serializePrisma(vendors);
}

export async function getProducts() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      cost: true,
      baseUnit: {
        select: {
          symbol: true,
        },
      },
      purchaseUnit: {
        select: {
          symbol: true,
        },
      },
    },
  });
  return serializePrisma(products);
}

// Helper to generate PO Number
async function generatePONumber() {
  const count = await prisma.purchaseOrder.count();
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
      const orderNumber = await generatePONumber();

      // Calculate totals
      let totalAmount = 0;
      data.items.forEach((item) => {
        totalAmount += item.quantity * item.unitCost;
      });

      const result = await prisma.purchaseOrder.create({
        data: {
          orderNumber,
          vendorId: data.vendorId,
          orderDate: data.orderDate,
          expectedDate: data.expectedDate,
          notes: data.notes,
          status: "DRAFT", // Default to DRAFT
          totalAmount,
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
      return { success: true, data: serializePrisma(result) };
    } catch (error) {
      console.error("Failed to create PO:", error);
      return { success: false, error: "Failed to create Purchase Order" };
    }
  }
);

export const updatePurchaseOrder = authorizedAction(
  "purchase.edit",
  async (id: string, data: PurchaseOrderInput) => {
    try {
      // Calculate totals
      let totalAmount = 0;
      data.items.forEach((item) => {
        totalAmount += item.quantity * item.unitCost;
      });

      // We need to handle items update: delete missing, update existing, create new.
      // Simplest strategy: delete all and recreate if status is DRAFT.
      // If status is not DRAFT, we might need stricter rules, but for now assuming DRAFT editing.

      const currentOrder = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!currentOrder) throw new Error("Order not found");
      if (currentOrder.status !== "DRAFT" && currentOrder.status !== "ISSUED") {
        // Maybe allow updating expectedDate or notes?
        // For now, allow full edit only in DRAFT/ISSUED.
      }

      const result = await prisma.$transaction(async (tx) => {
        // Delete existing items
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id },
        });

        // Update PO and create new items
        return await tx.purchaseOrder.update({
          where: { id },
          data: {
            vendorId: data.vendorId,
            orderDate: data.orderDate,
            expectedDate: data.expectedDate,
            notes: data.notes,
            status: data.status || currentOrder.status,
            totalAmount,
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
      return { success: true, data: serializePrisma(result) };
    } catch (error) {
      console.error("Failed to update PO:", error);
      return { success: false, error: "Failed to update Purchase Order" };
    }
  }
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
  }
);
