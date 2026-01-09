import { Prisma } from "@/prisma/generated/prisma/client";
import { getJournalEntry } from "./journal-entries/actions";

// Use Prisma's generated type for Account, including relations we commonly fetch
export type Account = Prisma.AccountGetPayload<{
  include: {
    parent: true;
    children: true;
    _count: {
      select: { journalEntryLines: true };
    };
  };
}>;

export type CalculatedAccount = Account & {
  ownDebit: number;
  ownCredit: number;
  totalDebit: number;
  totalCredit: number;
  children: string[]; // IDs of children
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

export type CreateJournalEntryData = NonNullable<
  Awaited<ReturnType<typeof getJournalEntry>>["data"]
>;
