"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { revalidatePath } from "next/cache";
import { settleServiceOrder, updateServiceOrderStatus } from "../actions";

type ServicePipelineState = {
  order: {
    id: string;
    orderNumber: string;
    salesOrderId: string;
    salesInvoiceId: string;
    status: "NEW" | "PROCESSING" | "READY" | "DONE" | "CLOSED" | "CANCELLED";
    customerName: string;
    totalAmount: number;
    remainingAmount: number;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
  } | null;
  payment: {
    id: string;
    paymentNumber: string;
    journalPosted: boolean;
  } | null;
};

function assertAccess(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session?.userId || !hasPermission(session.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }
}

export async function getServicePipelineState(orderId: string): Promise<ServicePipelineState> {
  const session = await getSession();
  assertAccess(session);

  const order = await prisma.pOSServiceOrder.findUnique({
    where: { id: orderId },
    include: {
      salesInvoice: { select: { id: true, invoiceNumber: true, status: true } },
    },
  });
  if (!order) throw new Error("Service order not found");

  const contact = order.contactId
    ? await prisma.contact.findUnique({
        where: { id: order.contactId },
        select: { name: true },
      })
    : null;

  const payment = await prisma.salesPayment.findFirst({
    where: { salesInvoiceId: order.salesInvoiceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      paymentNumber: true,
      journalEntryId: true,
    },
  });

  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      salesOrderId: order.salesOrderId,
      salesInvoiceId: order.salesInvoiceId,
      status: order.status as ServicePipelineState["order"]["status"],
      customerName: contact?.name || "Walk-in Customer",
      totalAmount: Number(order.totalAmount),
      remainingAmount: Number(order.remainingAmount),
    },
    invoice: order.salesInvoice
      ? {
          id: order.salesInvoice.id,
          invoiceNumber: order.salesInvoice.invoiceNumber,
          status: order.salesInvoice.status,
        }
      : null,
    payment: payment
      ? {
          id: payment.id,
          paymentNumber: payment.paymentNumber,
          journalPosted: !!payment.journalEntryId,
        }
      : null,
  };
}

export async function runServicePipelineAction(
  orderId: string,
  action: "move_processing" | "move_ready" | "settle_payment" | "close_order",
) {
  const session = await getSession();
  assertAccess(session);

  if (action === "move_processing") {
    await updateServiceOrderStatus(orderId, "PROCESSING");
  }
  if (action === "move_ready") {
    await updateServiceOrderStatus(orderId, "READY");
    await updateServiceOrderStatus(orderId, "DONE");
  }
  if (action === "settle_payment") {
    await settleServiceOrder(orderId, "CASH");
  }
  if (action === "close_order") {
    const current = await prisma.pOSServiceOrder.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    if (!current) throw new Error("Service order not found");
    if (current.status === "READY") {
      await updateServiceOrderStatus(orderId, "DONE");
    }
    await updateServiceOrderStatus(orderId, "CLOSED");
  }

  revalidatePath("/services/orders");
  revalidatePath(`/services/pipeline/${orderId}`);
  return { success: true };
}
