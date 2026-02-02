import { Prisma } from "@/prisma/generated/prisma/client";

export type SalesPaymentInput = {
  paymentNumber: string;
  contactId: string;
  salesInvoiceId: string;
  paymentDate: Date;
  amount: number;
  reference?: string;
  notes?: string;
  method?: string;
  cashAccountId: string;
  attachmentIds?: string[];
};

export type SalesPaymentWithDetails = Prisma.SalesPaymentGetPayload<{
  include: {
    contact: true;
    salesInvoice: true;
    cashAccount: true;
    journalEntry: true;
    attachments: true;
  };
}>;
