"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { SalesShipmentInput } from "./types";
import { getSalesOrder } from "../orders/actions";
import { SuperJSON } from "@/lib/superjson";

export { getSalesOrder };

export async function getSalesShipments(
  page: number = 1,
  limit: number = 10,
  search?: string,
) {
  const skip = (page - 1) * limit;
  const where: Prisma.SalesShipmentWhereInput = {
    AND: [],
  };

  if (search) {
    (where.AND as Prisma.SalesShipmentWhereInput[]).push({
      OR: [
        { shipmentNumber: { contains: search, mode: "insensitive" } },
        { contact: { name: { contains: search, mode: "insensitive" } } },
        {
          salesOrder: {
            orderNumber: { contains: search, mode: "insensitive" },
          },
        },
      ],
    });
  }

  const [shipments, total] = await Promise.all([
    prisma.salesShipment.findMany({
      where,
      include: {
        contact: true,
        salesOrder: true,
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
    prisma.salesShipment.count({ where }),
  ]);

  return {
    shipments: SuperJSON.serialize(shipments),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getSalesShipment(id: string) {
  const shipment = await prisma.salesShipment.findUnique({
    where: { id },
    include: {
      contact: true,
      salesOrder: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!shipment) return null;

  return SuperJSON.serialize(shipment);
}

export async function getProducts() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      baseUnit: {
        select: {
          symbol: true,
        },
      },
      salesUnit: {
        select: {
          symbol: true,
        },
      },
    },
  });
  return SuperJSON.serialize(products);
}

export async function getSalesOrdersForSelect() {
  const orders = await prisma.salesOrder.findMany({
    where: {
      status: { in: ["CONFIRMED", "PARTIALLY_SHIPPED"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      contact: true,
      items: true,
    },
  });
  return SuperJSON.serialize(orders);
}

// Helper to generate Shipment Number
async function generateShipmentNumber() {
  const count = await prisma.salesShipment.count();
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const sequence = (count + 1).toString().padStart(4, "0");
  return `SHP-${year}${month}-${sequence}`;
}

export const createSalesShipment = authorizedAction(
  "sales.create",
  async (data: SalesShipmentInput) => {
    try {
      const shipmentNumber = await generateShipmentNumber();

      const result = await prisma.$transaction(async (tx) => {
        // Create Shipment
        const shipment = await tx.salesShipment.create({
          data: {
            shipmentNumber,
            contactId: data.contactId,
            salesOrderId: data.salesOrderId,
            shipmentDate: data.shipmentDate,
            notes: data.notes,
            trackingNumber: data.trackingNumber,
            carrier: data.carrier,
            status: "DRAFT", // Default to DRAFT
            items: {
              create: data.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                salesOrderItemId: item.salesOrderItemId,
              })),
            },
          },
          include: {
            items: true,
          },
        });

        return shipment;
      });

      revalidatePath("/sales/shipments");
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to create Shipment:", error);
      return { success: false, error: "Failed to create Sales Shipment" };
    }
  },
);

export const updateSalesShipment = authorizedAction(
  "sales.edit",
  async (
    id: string,
    data: SalesShipmentInput & {
      status?: "DRAFT" | "COMPLETED" | "CANCELLED";
    },
  ) => {
    try {
      const currentShipment = await prisma.salesShipment.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!currentShipment) throw new Error("Shipment not found");

      if (currentShipment.status === "COMPLETED") {
        return { success: false, error: "Cannot edit completed shipment" };
      }

      const result = await prisma.$transaction(async (tx) => {
        // Delete existing items
        await tx.salesShipmentItem.deleteMany({
          where: { salesShipmentId: id },
        });

        // Update Shipment and create new items
        const updatedShipment = await tx.salesShipment.update({
          where: { id },
          data: {
            contactId: data.contactId,
            salesOrderId: data.salesOrderId,
            shipmentDate: data.shipmentDate,
            notes: data.notes,
            trackingNumber: data.trackingNumber,
            carrier: data.carrier,
            status: data.status || currentShipment.status,
            items: {
              create: data.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                salesOrderItemId: item.salesOrderItemId,
              })),
            },
          },
          include: {
            items: true,
          },
        });

        // If status changed to COMPLETED, update SO items and Inventory
        if (
          data.status === "COMPLETED" &&
          currentShipment.status !== "COMPLETED"
        ) {
          for (const item of data.items) {
            if (item.salesOrderItemId) {
              await tx.salesOrderItem.update({
                where: { id: item.salesOrderItemId },
                data: {
                  shippedQuantity: {
                    increment: item.quantity,
                  },
                },
              });
            }
          }

          // Check SO status
          if (data.salesOrderId) {
            const so = await tx.salesOrder.findUnique({
              where: { id: data.salesOrderId },
              include: { items: true },
            });

            if (so) {
              const allShipped = so.items.every(
                (item) => item.shippedQuantity >= item.quantity,
              );
              const anyShipped = so.items.some(
                (item) => item.shippedQuantity > 0,
              );

              let newStatus = so.status;
              if (allShipped) {
                newStatus = "SHIPPED";
              } else if (anyShipped) {
                newStatus = "PARTIALLY_SHIPPED";
              }

              if (newStatus !== so.status) {
                await tx.salesOrder.update({
                  where: { id: so.id },
                  data: { status: newStatus },
                });
              }
            }
          }

          // TODO: Create InventoryMovement (OUT)
        }

        return updatedShipment;
      });

      revalidatePath("/sales/shipments");
      revalidatePath("/sales/orders");
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to update Shipment:", error);
      return { success: false, error: "Failed to update Sales Shipment" };
    }
  },
);

export const deleteSalesShipment = authorizedAction(
  "sales.delete",
  async (id: string) => {
    try {
      const currentShipment = await prisma.salesShipment.findUnique({
        where: { id },
      });

      if (!currentShipment) throw new Error("Shipment not found");

      if (currentShipment.status === "COMPLETED") {
        return { success: false, error: "Cannot delete completed shipment" };
      }

      await prisma.salesShipment.delete({
        where: { id },
      });

      revalidatePath("/sales/shipments");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete Shipment:", error);
      return { success: false, error: "Failed to delete Sales Shipment" };
    }
  },
);
