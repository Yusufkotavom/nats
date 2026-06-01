import { prisma } from "@/lib/prisma";

export interface SalesReturnReportData {
  returnItem: any;
}

export async function getSalesReturnData(input: { returnId: string }): Promise<SalesReturnReportData> {
  const returnItem = await prisma.salesReturn.findUnique({
    where: { id: input.returnId },
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
  });

  if (!returnItem) {
    throw new Error(`Sales Return with ID ${input.returnId} not found`);
  }

  return { returnItem };
}
