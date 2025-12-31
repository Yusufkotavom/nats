"use server";

import { prisma, serializePrisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { PurchaseReceiveInput } from "./types";
import { getPurchaseOrder } from "../orders/actions";

export { getPurchaseOrder };

export async function getPurchaseReceives(
  page: number = 1,
  limit: number = 10,
  search?: string
) {
  const skip = (page - 1) * limit;
  const where: Prisma.PurchaseReceiveWhereInput = {
    AND: [],
  };

  if (search) {
    (where.AND as Prisma.PurchaseReceiveWhereInput[]).push({
      OR: [
        { receiveNumber: { contains: search, mode: "insensitive" } },
        { vendor: { name: { contains: search, mode: "insensitive" } } },
        {
          purchaseOrder: {
            orderNumber: { contains: search, mode: "insensitive" },
          },
        },
      ],
    });
  }

  const [receives, total] = await Promise.all([
    prisma.purchaseReceive.findMany({
      where,
      include: {
        vendor: true,
        purchaseOrder: true,
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
    prisma.purchaseReceive.count({ where }),
  ]);

  return {
    receives: serializePrisma(receives),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getPurchaseReceive(id: string) {
  const receive = await prisma.purchaseReceive.findUnique({
    where: { id },
    include: {
      vendor: true,
      purchaseOrder: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  return serializePrisma(receive);
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
      purchaseUnit: {
        select: {
          symbol: true,
        },
      },
    },
  });
  return serializePrisma(products);
}

export async function getPurchaseOrdersForSelect() {
  const orders = await prisma.purchaseOrder.findMany({
    where: {
      status: { in: ["ISSUED", "PARTIALLY_RECEIVED"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      vendor: true,
      items: true,
    },
  });
  return serializePrisma(orders);
}

// Helper to generate Receive Number
async function generateReceiveNumber() {
  const count = await prisma.purchaseReceive.count();
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const sequence = (count + 1).toString().padStart(4, "0");
  return `RCV-${year}${month}-${sequence}`;
}

export const createPurchaseReceive = authorizedAction(
  "purchase.create",
  async (data: PurchaseReceiveInput) => {
    try {
      const receiveNumber = await generateReceiveNumber();

      const result = await prisma.$transaction(async (tx) => {
        // Create Receive
        const receive = await tx.purchaseReceive.create({
          data: {
            receiveNumber,
            vendorId: data.vendorId,
            purchaseOrderId: data.purchaseOrderId,
            receiveDate: data.receiveDate,
            notes: data.notes,
            status: "DRAFT", // Default to DRAFT
            items: {
              create: data.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                purchaseOrderItemId: item.purchaseOrderItemId,
              })),
            },
          },
          include: {
            items: true,
          },
        });

        // TODO: If we allow creating as COMPLETED immediately, handle inventory and PO updates here.
        // For now, we assume creation is DRAFT, then status change happens in update.

        return receive;
      });

      revalidatePath("/purchase/receives");
      return { success: true, data: serializePrisma(result) };
    } catch (error) {
      console.error("Failed to create Receive:", error);
      return { success: false, error: "Failed to create Purchase Receive" };
    }
  }
);

export const updatePurchaseReceive = authorizedAction(
  "purchase.edit",
  async (
    id: string,
    data: PurchaseReceiveInput & {
      status?: "DRAFT" | "COMPLETED" | "CANCELLED";
    }
  ) => {
    try {
      const currentReceive = await prisma.purchaseReceive.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!currentReceive) throw new Error("Receive not found");

      if (currentReceive.status === "COMPLETED") {
        return { success: false, error: "Cannot edit completed receive" };
      }

      const result = await prisma.$transaction(async (tx) => {
        // Delete existing items
        await tx.purchaseReceiveItem.deleteMany({
          where: { purchaseReceiveId: id },
        });

        // Update Receive and create new items
        const updatedReceive = await tx.purchaseReceive.update({
          where: { id },
          data: {
            vendorId: data.vendorId,
            purchaseOrderId: data.purchaseOrderId,
            receiveDate: data.receiveDate,
            notes: data.notes,
            status: data.status || currentReceive.status,
            items: {
              create: data.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                purchaseOrderItemId: item.purchaseOrderItemId,
              })),
            },
          },
          include: {
            items: true,
          },
        });

        // If status changed to COMPLETED, update PO items and Inventory
        if (
          data.status === "COMPLETED" &&
          currentReceive.status !== "COMPLETED"
        ) {
          for (const item of data.items) {
            if (item.purchaseOrderItemId) {
              await tx.purchaseOrderItem.update({
                where: { id: item.purchaseOrderItemId },
                data: {
                  receivedQuantity: {
                    increment: item.quantity,
                  },
                },
              });
            }
          }

          // Check PO status
          if (data.purchaseOrderId) {
            const po = await tx.purchaseOrder.findUnique({
              where: { id: data.purchaseOrderId },
              include: { items: true },
            });

            if (po) {
              const allReceived = po.items.every(
                (item) => item.receivedQuantity >= item.quantity
              );
              const anyReceived = po.items.some(
                (item) => item.receivedQuantity > 0
              );

              let newStatus = po.status;
              if (allReceived) {
                newStatus = "CLOSED";
              } else if (anyReceived) {
                newStatus = "PARTIALLY_RECEIVED";
              }

              if (newStatus !== po.status) {
                await tx.purchaseOrder.update({
                  where: { id: po.id },
                  data: { status: newStatus },
                });
              }
            }
          }

          // TODO: Create InventoryMovement
        }

        return updatedReceive;
      });

      revalidatePath("/purchase/receives");
      revalidatePath("/purchase/orders");
      return { success: true, data: serializePrisma(result) };
    } catch (error) {
      console.error("Failed to update Receive:", error);
      return { success: false, error: "Failed to update Purchase Receive" };
    }
  }
);

export const deletePurchaseReceive = authorizedAction(
  "purchase.delete",
  async (id: string) => {
    try {
      const currentReceive = await prisma.purchaseReceive.findUnique({
        where: { id },
      });

      if (!currentReceive) throw new Error("Receive not found");

      if (currentReceive.status === "COMPLETED") {
        return { success: false, error: "Cannot delete completed receive" };
      }

      await prisma.purchaseReceive.delete({
        where: { id },
      });

      revalidatePath("/purchase/receives");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete Receive:", error);
      return { success: false, error: "Failed to delete Purchase Receive" };
    }
  }
);
