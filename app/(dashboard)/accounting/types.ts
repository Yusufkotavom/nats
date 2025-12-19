import { AccountType } from "@prisma/client";

export type Account = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
  children?: Account[];
  isPosting?: boolean;
  level?: number;
  _count?: { journalEntryLines: number };
};

export type CalculatedAccount = Account & {
  ownDebit: number;
  ownCredit: number;
  totalDebit: number;
  totalCredit: number;
  children: string[];
  calculated: boolean;
  level: number;
};

export type TrialBalanceItem = {
  accountId: string;
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  level: number;
  hasChildren: boolean;
  parentId: string | null;
};

export type TrialBalanceResult = {
  items: TrialBalanceItem[];
  totalDebit: number;
  totalCredit: number;
};
