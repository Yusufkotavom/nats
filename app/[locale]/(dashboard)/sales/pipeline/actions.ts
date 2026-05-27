"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { revalidatePath } from "next/cache";
import { revalidateLocalizedPath } from "@/lib/revalidate-localized-path";
import { confirmSalesOrder, closeSalesOrder } from "../orders/actions";
import { createSalesInvoice, postSalesInvoice } from "../invoices/actions";
import { createSalesPayment, postSalesPayment } from "../payments/actions";
import { createSalesShipment, updateSalesShipment } from "../shipments/actions";

type SalesPipelineState = {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    contactId: string;
    notes: string | null;
    totalAmount: number;
  };
  hasShipment: boolean;
  hasDraftShipment: boolean;
  shipmentSkipped: boolean;
  shipment: {
    id: string;
    shipmentNumber: string;
    status: string;
  } | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    balanceDue: number;
    totalAmount: number;
  } | null;
  hasPayment: boolean;
  payment: {
    id: string;
    paymentNumber: string;
    amount: number;
    journalPosted: boolean;
  } | null;
  activeCashAccountId: string | null;
};

function assertAccess(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session?.userId || !hasPermission(session.permissions, "sales.edit")) {
    throw new Error("Unauthorized");
  }
  if (!session.activeCompanyId) {
    throw new Error("No active company selected");
  }
}

const SHIPMENT_SKIPPED_MARKER = "[PIPELINE_SHIPMENT_SKIPPED]";

export async function getSalesPipelineState(orderId: string): Promise<SalesPipelineState> {
  const session = await getSession();
  assertAccess(session);
  const companyId = session.activeCompanyId!;

  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId, companyId },
    include: {
      items: true,
      shipments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          shipmentNumber: true,
          status: true,
        },
      },
    },
  });
  if (!order) throw new Error("Sales order not found");

  const invoice = await prisma.salesInvoice.findFirst({
    where: { salesOrderId: order.id, companyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      totalAmount: true,
      balanceDue: true,
    },
  });

  const payment = invoice
    ? await prisma.salesPayment.findFirst({
        where: { salesInvoiceId: invoice.id, companyId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          paymentNumber: true,
          amount: true,
          journalEntryId: true,
        },
      })
    : null;

  const cashAccount = await prisma.cashAccount.findFirst({
    where: { isActive: true, companyId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const latestShipment = order.shipments[0] || null;

  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      contactId: order.contactId,
      notes: order.notes,
      totalAmount: Number(order.totalAmount),
    },
    hasShipment: order.shipments.length > 0,
    hasDraftShipment: order.shipments.some((shipment) => shipment.status === "DRAFT"),
    shipmentSkipped: !!order.notes?.includes(SHIPMENT_SKIPPED_MARKER),
    shipment: latestShipment
      ? {
          id: latestShipment.id,
          shipmentNumber: latestShipment.shipmentNumber,
          status: latestShipment.status,
        }
      : null,
    invoice: invoice
      ? {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          totalAmount: Number(invoice.totalAmount),
          balanceDue: Number(invoice.balanceDue),
        }
      : null,
    hasPayment: !!payment,
    payment: payment
      ? {
          id: payment.id,
          paymentNumber: payment.paymentNumber,
          amount: Number(payment.amount),
          journalPosted: !!payment.journalEntryId,
        }
      : null,
    activeCashAccountId: cashAccount?.id ?? null,
  };
}

export async function runSalesPipelineAction(
  orderId: string,
  action:
    | "confirm_order"
    | "create_shipment"
    | "complete_shipment"
    | "skip_shipment"
    | "create_invoice"
    | "post_invoice"
    | "create_payment"
    | "post_payment"
    | "close_order",
) {
  const session = await getSession();
  assertAccess(session);
  const companyId = session.activeCompanyId!;

  const current = await prisma.salesOrder.findFirst({
    where: { id: orderId, companyId },
    include: {
      items: true,
      shipments: true,
    },
  });
  if (!current) throw new Error("Sales order not found");

  if (action === "confirm_order") {
    const result = await confirmSalesOrder(orderId);
    if (!result.success) throw new Error(result.error || "Failed to confirm order");
  }

  if (action === "create_shipment") {
    if (!current.shipments.length) {
      const items = current.items.map((item) => ({
        productId: item.productId,
        quantity: Math.max(item.quantity - item.shippedQuantity, 1),
        salesOrderItemId: item.id,
      }));
      const result = await createSalesShipment({
        contactId: current.contactId,
        salesOrderId: current.id,
        shipmentDate: new Date(),
        notes: "Created from sales pipeline workspace",
        items,
      });
      if (!result.success) throw new Error(result.error || "Failed to create shipment");
    }
  }

  if (action === "complete_shipment") {
    const shipment = await prisma.salesShipment.findFirst({
      where: { salesOrderId: current.id, companyId },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
      },
    });
    if (!shipment) throw new Error("Shipment not found");
    if (shipment.status !== "COMPLETED") {
      const result = await updateSalesShipment(shipment.id, {
        contactId: shipment.contactId,
        salesOrderId: shipment.salesOrderId || undefined,
        shipmentDate: shipment.shipmentDate,
        notes: shipment.notes || undefined,
        trackingNumber: shipment.trackingNumber || undefined,
        carrier: shipment.carrier || undefined,
        status: "COMPLETED",
        items: shipment.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          salesOrderItemId: item.salesOrderItemId || undefined,
        })),
      });
      if (!result.success) throw new Error(result.error || "Failed to complete shipment");
    }
  }

  if (action === "skip_shipment") {
    const notes = current.notes || "";
    if (!notes.includes(SHIPMENT_SKIPPED_MARKER)) {
      await prisma.salesOrder.update({
        where: { id: orderId },
        data: {
          notes: notes ? `${notes}\n${SHIPMENT_SKIPPED_MARKER}` : SHIPMENT_SKIPPED_MARKER,
        },
      });
    }
  }

  if (action === "create_invoice") {
    const existingInvoice = await prisma.salesInvoice.findFirst({
      where: { salesOrderId: current.id, companyId },
      select: { id: true },
    });
    if (!existingInvoice) {
      const invoiceResult = await createSalesInvoice({
        invoiceNumber: "",
        contactId: current.contactId,
        salesOrderId: current.id,
        invoiceDate: new Date(),
        dueDate: new Date(),
        globalDiscount: 0,
        totalTax: 0,
        shippingCost: 0,
        items: current.items.map((item) => ({
          description: item.description || "Item",
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discount: 0,
          tax: 0,
          productId: item.productId,
        })),
      });
      if (!invoiceResult.success) throw new Error(invoiceResult.error || "Failed to create invoice");
    }
  }

  if (action === "post_invoice") {
    const invoice = await prisma.salesInvoice.findFirst({
      where: { salesOrderId: current.id, companyId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!invoice) throw new Error("Invoice not found");
    const result = await postSalesInvoice(invoice.id);
    if (!result.success) throw new Error(result.error || "Failed to post invoice");
  }

  if (action === "create_payment") {
    const invoice = await prisma.salesInvoice.findFirst({
      where: { salesOrderId: current.id, companyId },
      orderBy: { createdAt: "desc" },
      select: { id: true, balanceDue: true },
    });
    if (!invoice) throw new Error("Invoice not found");

    const cashAccount = await prisma.cashAccount.findFirst({
      where: { isActive: true, companyId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!cashAccount) throw new Error("No active cash account found");

    const amount = Number(invoice.balanceDue);
    if (amount <= 0) return { success: true };

    const result = await createSalesPayment({
      paymentNumber: "",
      contactId: current.contactId,
      salesInvoiceId: invoice.id,
      paymentDate: new Date(),
      amount,
      method: "CASH",
      cashAccountId: cashAccount.id,
    });
    if (!result.success) throw new Error(result.error || "Failed to create payment");
  }

  if (action === "post_payment") {
    const invoice = await prisma.salesInvoice.findFirst({
      where: { salesOrderId: current.id, companyId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!invoice) throw new Error("Invoice not found");
    const payment = await prisma.salesPayment.findFirst({
      where: { salesInvoiceId: invoice.id, companyId, journalEntryId: null },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!payment) throw new Error("Draft payment not found");
    const result = await postSalesPayment(payment.id);
    if (!result.success) throw new Error(result.error || "Failed to post payment");
  }

  if (action === "close_order") {
    const result = await closeSalesOrder(orderId);
    if (!result.success) throw new Error(result.error || "Failed to close sales order");
  }

  revalidateLocalizedPath("/sales/orders");
  revalidateLocalizedPath(`/sales/pipeline/${orderId}`);
  return { success: true };
}
