import { prisma } from "@/lib/prisma";

export interface POSReceiptData {
  invoice: any;
  payment: any;
  cashierId?: string | null;
}

export async function getPOSReceiptData(input: { invoiceId: string }): Promise<POSReceiptData> {
  const invoice = await prisma.salesInvoice.findUnique({
    where: { id: input.invoiceId },
    include: {
      contact: true,
      items: {
        include: {
          product: true,
        },
      },
      posSession: true,
    },
  });

  if (!invoice) {
    throw new Error(`Invoice with ID ${input.invoiceId} not found`);
  }

  // Find associated payment
  const payment = await prisma.salesPayment.findFirst({
    where: {
      // SalesPayment in prisma schema has salesInvoiceId relationship
      // Let's check schema provided in search result:
      // salesInvoice   SalesInvoice @relation(fields: [salesInvoiceId], references: [id])
      salesInvoiceId: input.invoiceId
    }
  });

  return {
    invoice,
    payment,
    cashierId: invoice.posSession?.cashierId
  };
}
