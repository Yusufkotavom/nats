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
    journalEntry: {
      include: {
        attachments: true;
      };
    };
  };
}>;

export type CashTransferFormData = {
  fromAccountId: string;
  toAccountId: string;
  amount: Prisma.Decimal;
  date: Date;
  reference?: string;
  description?: string;
  attachmentIds?: string[];
};
