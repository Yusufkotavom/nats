"use server";

import { prisma } from "@/lib/prisma";
import { SuperJSON } from "@/lib/superjson";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { SalesReturnInput } from "./types";
import { getSalesOrder } from "../orders/actions";
import { getSalesInvoice } from "../invoices/actions";

export { getSalesOrder, getSalesInvoice };

export async function getSalesReturns(
  page: number = 1,
  limit: number = 10,
  search?: string,
) {
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
    },
  });

  if (!salesReturn) return null;

  return SuperJSON.serialize(salesReturn);
}

export async function getSalesOrdersForReturn() {
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
  const invoices = await prisma.salesInvoice.findMany({
    where: { status: { in: ["ISSUED", "PAID", "PARTIALLY_PAID"] } },
    orderBy: { createdAt: "desc" },
    include: {
      contact: true,
      items: {
        // Sales Invoice Item has productId in schema 08_sales.prisma
        product: true
      },
    },
  });
  return SuperJSON.serialize(invoices);
}

// Helper to generate Return Number
async function generateReturnNumber() {
  const count = await prisma.salesReturn.count();
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const sequence = (count + 1).toString().padStart(4, "0");
  return `RET-${year}${month}-${sequence}`;
}

export const createSalesReturn = authorizedAction(
  "sales.create",
  async (data: SalesReturnInput) => {
    try {
      
      let returnNumber = data.returnNumber;
      if (!returnNumber) {
        returnNumber = await generateReturnNumber();
      }

      const existing = await prisma.salesReturn.findUnique({
        where: { returnNumber: returnNumber },
      });

      if (existing) {
        return { success: false, error: "Return number already exists" };
      }

      let totalAmount = 0;
      data.items.forEach((item) => {
        totalAmount += item.quantity * item.unitPrice;
      });

      const result = await prisma.salesReturn.create({
        data: {
          returnNumber: returnNumber,
          contactId: data.contactId,
          salesOrderId: data.salesOrderId || undefined,
          salesInvoiceId: data.salesInvoiceId || undefined,
          returnDate: data.returnDate,
          notes: data.notes,
          status: "DRAFT",
          totalAmount,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      revalidatePath("/sales/returns");
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to create Return:", error);
      return { success: false, error: "Failed to create Sales Return" };
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

        return await tx.salesReturn.update({
          where: { id },
          data: {
            returnNumber: data.returnNumber,
            contactId: data.contactId,
            salesOrderId: data.salesOrderId || undefined,
            salesInvoiceId: data.salesInvoiceId || undefined,
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
          },
          include: {
            items: true,
          },
        });
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
