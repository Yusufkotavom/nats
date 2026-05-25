import { prisma } from "@/lib/prisma";

export type ServicePipelineBridge = {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
  paymentId: string | null;
  paymentNumber: string | null;
  paymentPosted: boolean | null;
};

export async function getServicePipelineBridgeByOrderId(
  orderId: string,
): Promise<ServicePipelineBridge | null> {
  const order = await prisma.pOSServiceOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      salesInvoiceId: true,
    },
  });

  if (!order) return null;

  const invoice = order.salesInvoiceId
    ? await prisma.salesInvoice.findUnique({
        where: { id: order.salesInvoiceId },
        select: { id: true, invoiceNumber: true, status: true },
      })
    : null;

  const payment = invoice
    ? await prisma.salesPayment.findFirst({
        where: { salesInvoiceId: invoice.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, paymentNumber: true, journalEntryId: true },
      })
    : null;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderStatus: String(order.status),
    invoiceId: invoice?.id ?? null,
    invoiceNumber: invoice?.invoiceNumber ?? null,
    invoiceStatus: invoice?.status ? String(invoice.status) : null,
    paymentId: payment?.id ?? null,
    paymentNumber: payment?.paymentNumber ?? null,
    paymentPosted: payment ? Boolean(payment.journalEntryId) : null,
  };
}
