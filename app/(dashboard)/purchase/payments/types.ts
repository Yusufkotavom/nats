import { Prisma } from "@/prisma/generated/prisma/client";

export type PurchasePaymentInput = {
  paymentNumber: string;
  contactId: string;
  purchaseInvoiceId: string;
  paymentDate: Date;
  amount: number;
  reference?: string;
  notes?: string;
  cashAccountId: string;
};

export type PurchasePaymentWithDetails = Prisma.PurchasePaymentGetPayload<{
  include: {
    contact: true;
    purchaseInvoice: true;
    cashAccount: true;
  };
}>;
