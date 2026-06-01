import { prisma } from "@/lib/prisma";

export interface SalesPaymentReportData {
  payment: any;
}

export async function getSalesPaymentData(input: { paymentId: string }): Promise<SalesPaymentReportData> {
  const payment = await prisma.salesPayment.findUnique({
    where: { id: input.paymentId },
    include: {
      contact: true,
      salesInvoice: true,
      cashAccount: true,
    },
  });

  if (!payment) {
    throw new Error(`Sales Payment with ID ${input.paymentId} not found`);
  }

  return { payment };
}
