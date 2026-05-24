import { prisma } from "@/lib/prisma";

export interface ServiceInvoiceReportData {
  serviceOrder: any;
  invoice: any;
}

export async function getServiceInvoiceData(input: { invoiceId: string }): Promise<ServiceInvoiceReportData> {
  const invoice = await prisma.salesInvoice.findUnique({
    where: { id: input.invoiceId },
    include: {
      contact: true,
      items: { include: { product: true } },
      payments: true,
    },
  });

  if (!invoice) {
    throw new Error(`Service invoice with ID ${input.invoiceId} not found`);
  }

  const serviceOrder = await prisma.pOSServiceOrder.findFirst({
    where: { salesInvoiceId: invoice.id },
  });

  if (!serviceOrder) {
    throw new Error(`Service order linked to invoice ID ${input.invoiceId} not found`);
  }

  return { serviceOrder, invoice };
}
