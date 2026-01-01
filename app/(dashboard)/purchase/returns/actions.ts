"use server";

import { prisma, serializePrisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma, ContactType } from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { PurchaseReturnInput } from "./types";
import { getPurchaseOrder } from "../orders/actions";
import { getPurchaseInvoice } from "../invoices/actions";

export { getPurchaseOrder, getPurchaseInvoice };

export async function getPurchaseReturns(
  page: number = 1,
  limit: number = 10,
  search?: string
) {
  const skip = (page - 1) * limit;
  const where: Prisma.PurchaseReturnWhereInput = {
    AND: [],
  };

  if (search) {
    (where.AND as Prisma.PurchaseReturnWhereInput[]).push({
      OR: [
        { returnNumber: { contains: search, mode: "insensitive" } },
        { contact: { name: { contains: search, mode: "insensitive" } } },
        {
          purchaseOrder: {
            orderNumber: { contains: search, mode: "insensitive" },
          },
        },
        {
          purchaseInvoice: {
            invoiceNumber: { contains: search, mode: "insensitive" },
          },
        },
      ],
    });
  }

  const [returns, total] = await Promise.all([
    prisma.purchaseReturn.findMany({
      where,
      include: {
        contact: true,
        purchaseOrder: true,
        purchaseInvoice: true,
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
    prisma.purchaseReturn.count({ where }),
  ]);

  return {
    returns: serializePrisma(returns),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getPurchaseReturn(id: string) {
  const purchaseReturn = await prisma.purchaseReturn.findUnique({
    where: { id },
    include: {
      contact: true,
      purchaseOrder: true,
      purchaseInvoice: true,
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

  return serializePrisma(purchaseReturn);
}

export async function getVendors() {
  const vendors = await prisma.contact.findMany({
    where: { isActive: true, type: ContactType.VENDOR },
    orderBy: { name: "asc" },
  });
  return serializePrisma(vendors);
}

export async function getPurchaseOrdersForReturn() {
  const orders = await prisma.purchaseOrder.findMany({
    where: { status: { in: ["ISSUED", "PARTIALLY_RECEIVED", "CLOSED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      contact: true,
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
  return serializePrisma(orders);
}

export async function getPurchaseInvoicesForReturn() {
  const invoices = await prisma.purchaseInvoice.findMany({
    where: { status: { in: ["BILLED", "PAID", "PARTIALLY_PAID"] } },
    orderBy: { createdAt: "desc" },
    include: {
      contact: true,
      items: {
        // Invoice items don't have direct product link in schema?
        // Wait, PurchaseInvoiceItem has `description` but no `productId`.
        // Ah, PurchaseInvoiceItem in my implementation of `06_purchasing.prisma` does NOT have `productId`.
        // It only has description.
        // BUT PurchaseReturnItem DOES have `productId`.
        // This is a discrepancy. If we return from Invoice, we might not know the product ID if Invoice doesn't track it.
        // However, PurchaseOrder tracks ProductId.
        // If Invoice is linked to PO, we can trace it.
        // But PurchaseReturnItem requires `productId`.
        // So we should probably return based on Purchase Order mostly, or if Invoice, we assume we know the product?
        // Or maybe I should check if PurchaseInvoiceItem can link to Product.
        // Let's check `06_purchasing.prisma`.
      },
    },
  });
  return serializePrisma(invoices);
}

// Let's check the schema again for PurchaseInvoiceItem.
// If it doesn't have productId, we can't easily create PurchaseReturnItem with productId from Invoice alone.
// Unless we manually select product.
// For now, I'll rely on Purchase Order for auto-population of Products.

export const createPurchaseReturn = authorizedAction(
  "purchase.create",
  async (data: PurchaseReturnInput) => {
    try {
      const existing = await prisma.purchaseReturn.findUnique({
        where: { returnNumber: data.returnNumber },
      });

      if (existing) {
        return { success: false, error: "Return number already exists" };
      }

      let totalAmount = 0;
      data.items.forEach((item) => {
        totalAmount += item.quantity * item.unitPrice;
      });

      const result = await prisma.purchaseReturn.create({
        data: {
          returnNumber: data.returnNumber,
          contactId: data.contactId,
          purchaseOrderId: data.purchaseOrderId || undefined,
          purchaseInvoiceId: data.purchaseInvoiceId || undefined,
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

      revalidatePath("/purchase/returns");
      return { success: true, data: serializePrisma(result) };
    } catch (error) {
      console.error("Failed to create Return:", error);
      return { success: false, error: "Failed to create Purchase Return" };
    }
  }
);

export const updatePurchaseReturn = authorizedAction(
  "purchase.edit",
  async (id: string, data: PurchaseReturnInput) => {
    try {
      const currentReturn = await prisma.purchaseReturn.findUnique({
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
        const existing = await prisma.purchaseReturn.findUnique({
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
        await tx.purchaseReturnItem.deleteMany({
          where: { purchaseReturnId: id },
        });

        return await tx.purchaseReturn.update({
          where: { id },
          data: {
            returnNumber: data.returnNumber,
            contactId: data.contactId,
            purchaseOrderId: data.purchaseOrderId || undefined,
            purchaseInvoiceId: data.purchaseInvoiceId || undefined,
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

      revalidatePath("/purchase/returns");
      return { success: true, data: serializePrisma(result) };
    } catch (error) {
      console.error("Failed to update Return:", error);
      return { success: false, error: "Failed to update Purchase Return" };
    }
  }
);

export const deletePurchaseReturn = authorizedAction(
  "purchase.delete",
  async (id: string) => {
    try {
      const currentReturn = await prisma.purchaseReturn.findUnique({
        where: { id },
      });

      if (!currentReturn) throw new Error("Return not found");

      if (currentReturn.status !== "DRAFT") {
        return { success: false, error: "Can only delete draft returns" };
      }

      await prisma.purchaseReturn.delete({
        where: { id },
      });

      revalidatePath("/purchase/returns");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete Return:", error);
      return { success: false, error: "Failed to delete Purchase Return" };
    }
  }
);
