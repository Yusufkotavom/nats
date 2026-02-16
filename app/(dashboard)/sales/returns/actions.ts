"use server";

import { InventoryService } from "@/app/(dashboard)/inventory/inventory-service";

import { prisma } from "@/lib/prisma";
import { SuperJSON } from "@/lib/superjson";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { SalesReturnInput } from "./types";
import { getSalesOrder } from "../orders/actions";
import { getSalesInvoice } from "../invoices/actions";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";

export { getSalesOrder, getSalesInvoice };

export async function getSalesReturns(
  page: number = 1,
  limit: number = 10,
  search?: string,
) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "sales.view")) {
    return {
      returns: [],
      total: 0,
      totalPages: 0,
    };
  }

  const skip = (page - 1) * limit;
  const where: Prisma.SalesReturnWhereInput = {
    AND: [],
  };

  if (search) {
    (where.AND as Prisma.SalesReturnWhereInput[]).push({
      OR: [
        { returnNumber: { contains: search, mode: "insensitive" } },
        { contact: { name: { contains: search, mode: "insensitive" } } },
        {
          salesOrder: {
            orderNumber: { contains: search, mode: "insensitive" },
          },
        },
        {
          salesInvoice: {
            invoiceNumber: { contains: search, mode: "insensitive" },
          },
        },
      ],
    });
  }

  const [returns, total] = await Promise.all([
    prisma.salesReturn.findMany({
      where,
      include: {
        contact: true,
        salesOrder: true,
        salesInvoice: true,
        items: {
          include: {
            product: true,
          },
        },
        attachments: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.salesReturn.count({ where }),
  ]);

  return {
    returns: SuperJSON.serialize(returns),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getSalesReturn(id: string) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "sales.view")) {
    return null;
  }

  const salesReturn = await prisma.salesReturn.findUnique({
    where: { id },
    include: {
      contact: true,
      salesOrder: true,
      salesInvoice: true,
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
      attachments: true,
    },
  });

  if (!salesReturn) return null;

  return SuperJSON.serialize(salesReturn);
}

export async function getSalesOrdersForReturn() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "sales.view")) {
    return [];
  }

  const orders = await prisma.salesOrder.findMany({
    where: { status: { in: ["CONFIRMED", "SHIPPED", "PARTIALLY_SHIPPED", "CLOSED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      contact: true,
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
  return SuperJSON.serialize(orders);
}

export async function getSalesInvoicesForReturn() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "sales.view")) {
    return [];
  }

  const invoices = await prisma.salesInvoice.findMany({
    where: { status: { in: ["ISSUED", "PAID", "PARTIALLY_PAID"] } },
    orderBy: { createdAt: "desc" },
    include: {
      contact: true,
      items: {
        // Sales Invoice Item has productId in schema 08_sales.prisma
        include: {
          product: true
        },
      },
    },
  });
  return SuperJSON.serialize(invoices);
}

import { SalesReturnService } from "@/modules/sales/services/sales-return.service";

export const createSalesReturn = authorizedAction(
  "sales.create",
  async (data: SalesReturnInput) => {
    try {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");

      const result = await SalesReturnService.create(data, session.userId);

      revalidatePath("/sales/returns");
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to create Return:", error);
      const message = error instanceof Error ? error.message : "Failed to create Sales Return";
      return { success: false, error: message };
    }
  },
);

export const updateSalesReturn = authorizedAction(
  "sales.edit",
  async (id: string, data: SalesReturnInput) => {
    try {
      const currentReturn = await prisma.salesReturn.findUnique({
        where: { id },
      });

      if (!currentReturn) throw new Error("Return not found");

      if (
        currentReturn.status === "APPROVED" ||
        currentReturn.status === "COMPLETED"
      ) {
        return {
          success: false,
          error: "Cannot edit approved or completed return",
        };
      }

      if (data.returnNumber !== currentReturn.returnNumber) {
        const existing = await prisma.salesReturn.findUnique({
          where: { returnNumber: data.returnNumber },
        });
        if (existing && existing.id !== id) {
          return { success: false, error: "Return number already exists" };
        }
      }

      let totalAmount = 0;
      data.items.forEach((item) => {
        totalAmount += item.quantity * item.unitPrice;
      });

      const result = await prisma.$transaction(async (tx) => {
        await tx.salesReturnItem.deleteMany({
          where: { salesReturnId: id },
        });

        const updatedReturn = await tx.salesReturn.update({
          where: { id },
          data: {
            returnNumber: data.returnNumber,
            contactId: data.contactId,
            salesOrderId: data.salesOrderId || undefined,
            salesInvoiceId: data.salesInvoiceId || undefined,
            departmentId: data.departmentId,
            projectId: data.projectId,
            returnDate: data.returnDate,
            notes: data.notes,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            status: (data.status || currentReturn.status) as any,
            totalAmount,
            items: {
              create: data.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * item.unitPrice,
              })),
            },
            attachments: data.attachmentIds
              ? {
                set: data.attachmentIds.map((id) => ({ id })),
              }
              : undefined,
          },
          include: {
            items: true,
          },
        });

        // Inventory Movement (IN) if COMPLETED
        if (
          data.status === "COMPLETED" &&
          currentReturn.status !== "COMPLETED"
        ) {
          await InventoryService.createInventoryMovement(tx, {
            type: "IN",
            reference: updatedReturn.returnNumber,
            notes: data.notes || "Sales Return Completed",
            items: data.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              notes: "Sales Return"
            })),
            transactionDate: data.returnDate
          });
        }

        return updatedReturn;
      });

      revalidatePath("/sales/returns");
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to update Return:", error);
      return { success: false, error: "Failed to update Sales Return" };
    }
  },
);

export const deleteSalesReturn = authorizedAction(
  "sales.delete",
  async (id: string) => {
    try {
      const currentReturn = await prisma.salesReturn.findUnique({
        where: { id },
      });

      if (!currentReturn) throw new Error("Return not found");

      if (currentReturn.status !== "DRAFT") {
        return { success: false, error: "Can only delete draft returns" };
      }

      await prisma.salesReturn.delete({
        where: { id },
      });

      revalidatePath("/sales/returns");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete Return:", error);
      return { success: false, error: "Failed to delete Sales Return" };
    }
  },
);
