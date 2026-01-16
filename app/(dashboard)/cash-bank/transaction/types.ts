import { CashTransactionType } from "@/prisma/generated/prisma/enums";

export type CashTransactionAllocationFormData = {
  accountId: string;
  amount: number;
  description?: string;
};

export type CashTransactionFormData = {
  type: CashTransactionType;
  date: Date;
  reference?: string;
  description?: string;
  cashAccountId: string;
  allocations: CashTransactionAllocationFormData[];
  attachmentIds: string[];
};
