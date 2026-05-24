import { prisma } from "@/lib/prisma";

export interface ServiceWorkOrderReportData {
  serviceOrder: any;
  salesOrder: any;
}

export async function getServiceWorkOrderData(input: { orderId: string }): Promise<ServiceWorkOrderReportData> {
  const salesOrder = await prisma.salesOrder.findUnique({
    where: { id: input.orderId },
    include: {
      contact: true,
      items: { include: { product: true } },
    },
  });

  if (!salesOrder) {
    throw new Error(`Service work order with sales order ID ${input.orderId} not found`);
  }

  const serviceOrder = await prisma.pOSServiceOrder.findFirst({
    where: { salesOrderId: salesOrder.id },
    include: {
      items: { include: { product: true } },
    },
  });

  if (!serviceOrder) {
    throw new Error(`Service order linked to sales order ID ${input.orderId} not found`);
  }

  return { serviceOrder, salesOrder };
}
