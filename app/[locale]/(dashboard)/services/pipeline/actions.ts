"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { revalidatePath } from "next/cache";
import { revalidateLocalizedPath } from "@/lib/revalidate-localized-path";
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
  const canAccessServices =
    !!session?.permissions &&
    (hasPermission(session.permissions, "pos.access") ||
      hasPermission(session.permissions, "sales.view") ||
      hasPermission(session.permissions, "sales.create"));

  if (!session?.userId || !canAccessServices) {
    throw new Error("Unauthorized");
  }
  if (!session.activeCompanyId) {
    throw new Error("No active company selected");
  }
}

export async function getServicePipelineState(orderId: string): Promise<ServicePipelineState> {
  const session = await getSession();
  assertAccess(session);
  const companyId = session.activeCompanyId!;

  const order = await prisma.pOSServiceOrder.findFirst({
    where: { id: orderId, companyId },
    include: {
      salesInvoice: { select: { id: true, invoiceNumber: true, status: true } },
    },
  });
  if (!order) throw new Error("Service order not found");

  const contact = order.contactId
    ? await prisma.contact.findFirst({
        where: { id: order.contactId, companyId },
        select: { name: true },
      })
    : null;

  const payment = await prisma.salesPayment.findFirst({
    where: { salesInvoiceId: order.salesInvoiceId, companyId },
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
  const companyId = session.activeCompanyId!;

  if (action === "move_processing") {
    await updateServiceOrderStatus(orderId, "PROCESSING");
  }
  if (action === "move_ready") {
    await updateServiceOrderStatus(orderId, "READY");
    await updateServiceOrderStatus(orderId, "DONE");
  }
  if (action === "settle_payment") {
    await settleServiceOrder(orderId);
  }
  if (action === "close_order") {
    const current = await prisma.pOSServiceOrder.findFirst({
      where: { id: orderId, companyId },
      select: { status: true },
    });
    if (!current) throw new Error("Service order not found");
    if (current.status === "READY") {
      await updateServiceOrderStatus(orderId, "DONE");
    }
    await updateServiceOrderStatus(orderId, "CLOSED");
  }

  revalidateLocalizedPath("/services/orders");
  revalidateLocalizedPath(`/services/pipeline/${orderId}`);
  return { success: true };
}
