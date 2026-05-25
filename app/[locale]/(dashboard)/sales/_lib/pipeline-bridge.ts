import { prisma } from "@/lib/prisma";

export type SalesPipelineBridge = {
  orderId: string | null;
  shipmentId: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  orderStatus?: string | null;
  shipmentStatus?: string | null;
  invoiceStatus?: string | null;
};

export async function getSalesPipelineBridgeByContext(input: {
  kind: "order" | "shipment" | "invoice" | "payment";
  id: string;
}): Promise<SalesPipelineBridge> {
  if (input.kind === "order") {
    const order = await prisma.salesOrder.findUnique({
      where: { id: input.id },
      select: { id: true, status: true },
    });
    if (!order) {
      return { orderId: null, shipmentId: null, invoiceId: null, paymentId: null };
    }

    const shipment = await prisma.salesShipment.findFirst({
      where: { salesOrderId: order.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    });
    const invoice = await prisma.salesInvoice.findFirst({
      where: { salesOrderId: order.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    });
    const payment = invoice
      ? await prisma.salesPayment.findFirst({
          where: { salesInvoiceId: invoice.id },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        })
      : null;

    return {
      orderId: order.id,
      shipmentId: shipment?.id || null,
      invoiceId: invoice?.id || null,
      paymentId: payment?.id || null,
      orderStatus: order.status,
      shipmentStatus: shipment?.status || null,
      invoiceStatus: invoice?.status || null,
    };
  }

  if (input.kind === "shipment") {
    const shipment = await prisma.salesShipment.findUnique({
      where: { id: input.id },
      select: { id: true, status: true, salesOrderId: true },
    });
    if (!shipment) return { orderId: null, shipmentId: null, invoiceId: null, paymentId: null };

    const order = shipment.salesOrderId
      ? await prisma.salesOrder.findUnique({
          where: { id: shipment.salesOrderId },
          select: { id: true, status: true },
        })
      : null;
    const invoice = shipment.salesOrderId
      ? await prisma.salesInvoice.findFirst({
          where: { salesOrderId: shipment.salesOrderId },
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true },
        })
      : null;
    const payment = invoice
      ? await prisma.salesPayment.findFirst({
          where: { salesInvoiceId: invoice.id },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        })
      : null;

    return {
      orderId: order?.id || null,
      shipmentId: shipment.id,
      invoiceId: invoice?.id || null,
      paymentId: payment?.id || null,
      orderStatus: order?.status || null,
      shipmentStatus: shipment.status,
      invoiceStatus: invoice?.status || null,
    };
  }

  if (input.kind === "invoice") {
    const invoice = await prisma.salesInvoice.findUnique({
      where: { id: input.id },
      select: { id: true, status: true, salesOrderId: true },
    });
    if (!invoice) return { orderId: null, shipmentId: null, invoiceId: null, paymentId: null };

    const order = invoice.salesOrderId
      ? await prisma.salesOrder.findUnique({
          where: { id: invoice.salesOrderId },
          select: { id: true, status: true },
        })
      : null;
    const shipment = invoice.salesOrderId
      ? await prisma.salesShipment.findFirst({
          where: { salesOrderId: invoice.salesOrderId },
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true },
        })
      : null;
    const payment = await prisma.salesPayment.findFirst({
      where: { salesInvoiceId: invoice.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    return {
      orderId: order?.id || null,
      shipmentId: shipment?.id || null,
      invoiceId: invoice.id,
      paymentId: payment?.id || null,
      orderStatus: order?.status || null,
      shipmentStatus: shipment?.status || null,
      invoiceStatus: invoice.status,
    };
  }

  const payment = await prisma.salesPayment.findUnique({
    where: { id: input.id },
    select: { id: true, salesInvoiceId: true },
  });
  if (!payment) return { orderId: null, shipmentId: null, invoiceId: null, paymentId: null };

  const invoice = await prisma.salesInvoice.findUnique({
    where: { id: payment.salesInvoiceId },
    select: { id: true, status: true, salesOrderId: true },
  });
  const order = invoice?.salesOrderId
    ? await prisma.salesOrder.findUnique({
        where: { id: invoice.salesOrderId },
        select: { id: true, status: true },
      })
    : null;
  const shipment = invoice?.salesOrderId
    ? await prisma.salesShipment.findFirst({
        where: { salesOrderId: invoice.salesOrderId },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true },
      })
    : null;

  return {
    orderId: order?.id || null,
    shipmentId: shipment?.id || null,
    invoiceId: invoice?.id || null,
    paymentId: payment.id,
    orderStatus: order?.status || null,
    shipmentStatus: shipment?.status || null,
    invoiceStatus: invoice?.status || null,
  };
}
