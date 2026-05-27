import { Prisma } from "@/prisma/generated/prisma/client";
import { UnifiedPaymentMethod } from "@/lib/payments/payment-methods";

export type SalesPaymentInput = {
  paymentNumber: string;
  contactId: string;
  salesInvoiceId: string;
  paymentDate: Date;
  amount: number;
  reference?: string;
  notes?: string;
  method?: UnifiedPaymentMethod;
  departmentId?: string | null;
  projectId?: string | null;
  cashAccountId: string;
  attachmentIds?: string[];
};

export type SalesPaymentWithDetails = Prisma.SalesPaymentGetPayload<{
  include: {
    contact: true;
    salesInvoice: true;
    cashAccount: true;
    journalEntry: true;
    department: true;
    project: true;
    attachments: true;
  };
}>;
