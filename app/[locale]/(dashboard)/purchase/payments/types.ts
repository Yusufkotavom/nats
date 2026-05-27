import { Prisma } from "@/prisma/generated/prisma/client";
import { UnifiedPaymentMethod } from "@/lib/payments/payment-methods";

export type PurchasePaymentInput = {
  paymentNumber: string;
  contactId: string;
  purchaseInvoiceId: string;
  paymentDate: Date;
  amount: number;
  reference?: string;
  notes?: string;
  departmentId?: string | null;
  projectId?: string | null;
  cashAccountId: string;
  method?: UnifiedPaymentMethod;
  attachmentIds?: string[];
};

export type PurchasePaymentWithDetails = Prisma.PurchasePaymentGetPayload<{
  include: {
    contact: true;
    purchaseInvoice: true;
    cashAccount: true;
    journalEntry: true;
    department: true;
    project: true;
    attachments: true;
  };
}>;
