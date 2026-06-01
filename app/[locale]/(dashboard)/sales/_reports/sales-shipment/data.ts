import { prisma } from "@/lib/prisma";

export interface SalesShipmentReportData {
  shipment: any;
}

export async function getSalesShipmentData(input: { shipmentId: string }): Promise<SalesShipmentReportData> {
  const shipment = await prisma.salesShipment.findUnique({
    where: { id: input.shipmentId },
    include: {
      contact: true,
      salesOrder: true,
      items: {
        include: {
          product: true,
          salesOrderItem: true,
        },
      },
    },
  });

  if (!shipment) {
    throw new Error(`Sales Shipment with ID ${input.shipmentId} not found`);
  }

  return { shipment };
}
