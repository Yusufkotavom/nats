import { prisma } from "@/lib/prisma";
import { TransactionForm } from "../_components/transaction-form";
import { getCashTransaction } from "../actions";
import { notFound } from "next/navigation";
import { CashTransactionFormData } from "../types";

interface PageProps {
  params: Promise<{
    transactionId: string;
  }>;
}

export default async function EditTransactionPage({ params }: PageProps) {
  const { transactionId } = await params;

  const [cashAccounts, glAccounts, transaction] = await Promise.all([
    prisma.cashAccount.findMany({
      where: { isActive: true },
    }),
    prisma.account.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    }),
    getCashTransaction(transactionId),
  ]);

  if (!transaction) {
    notFound();
  }

  // Transform to form data
  const initialData: CashTransactionFormData & { id: string } = {
    id: transaction.id,
    date: transaction.date,
    type: transaction.type,
    cashAccountId: transaction.cashAccountId,
    reference: transaction.reference || undefined,
    description: transaction.description || undefined,
    notes: transaction.note || undefined,
    allocations: transaction.allocations.map((a) => ({
      accountId: a.accountId,
      amount: Number(a.amount),
      description: a.description || undefined,
    })),
    attachments: transaction.journalEntry.attachments.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
    })),
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="grid gap-4">
        <TransactionForm
          cashAccounts={cashAccounts}
          glAccounts={glAccounts}
          initialData={initialData}
          readOnly={transaction.status === "APPROVED"}
        />
      </div>
    </div>
  );
}
