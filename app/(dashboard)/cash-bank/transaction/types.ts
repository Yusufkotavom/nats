import { CashTransactionType } from "@/prisma/generated/prisma/enums";

export type CashTransactionAllocationFormData = {
  accountId: string;
  amount: number;
  description?: string;
};

export interface Attachment {
  id: string;
  name: string;
  url: string;
}

export type CashTransactionFormData = {
  type: CashTransactionType;
  date: Date;
  reference?: string;
  description?: string;
  contactId?: string;
  cashAccountId: string;
  allocations: CashTransactionAllocationFormData[];
  attachments: Attachment[];
  notes?: string;
};
