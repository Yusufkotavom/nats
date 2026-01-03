import { Prisma } from "@/prisma/generated/prisma/client";
import { CashAccountType } from "@/prisma/generated/prisma/enums";

export type CashAccount = Prisma.CashAccountGetPayload<{
  include: {
    glAccount: true;
  };
}>;

export type CashAccountWithBalance = CashAccount & {
  balance: number;
};

export type CashAccountFormData = {
  name: string;
  type: CashAccountType;
  accountNumber?: string;
  bankName?: string;
  description?: string;
  glAccountId: string;
};

export type CashTransfer = Prisma.CashTransferGetPayload<{
  include: {
    fromAccount: true;
    toAccount: true;
    journalEntry: true;
  };
}>;

export type CashTransferFormData = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: Date;
  reference?: string;
  description?: string;
  attachmentIds?: string[];
};
