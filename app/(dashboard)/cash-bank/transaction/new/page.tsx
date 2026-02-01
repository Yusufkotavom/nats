import { prisma } from "@/lib/prisma";
import { TransactionForm } from "../_components/transaction-form";

export default async function NewTransactionPage() {
  const [cashAccounts, glAccounts, contacts] = await Promise.all([
    prisma.cashAccount.findMany({
      where: { isActive: true },
    }),
    prisma.account.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    }),
    prisma.contact.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="grid gap-4">
        <TransactionForm
          cashAccounts={cashAccounts}
          glAccounts={glAccounts}
          contacts={contacts}
        />
      </div>
    </div>
  );
}
