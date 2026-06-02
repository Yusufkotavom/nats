export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { TransactionForm } from "../_components/transaction-form";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";
import { verifySession } from "@/lib/auth/auth";
import { ensureCompanyMinimalCashTransactionCategories } from "@/lib/setup/minimal-cash-transaction-categories";
import { getOperationalPaymentMethodAccounts } from "../../actions";

export default async function NewTransactionPage() {
  const session = await verifySession();
  if (!session.activeCompanyId) {
    throw new Error("No active company selected");
  }
  const companyId = session.activeCompanyId;

  await prisma.$transaction(async (tx) => {
    await ensureCompanyMinimalCashTransactionCategories(tx, companyId);
  });

  const [paymentMethodAccounts, glAccounts, contacts, departments, projects, defaultAccounts] = await Promise.all([
    getOperationalPaymentMethodAccounts(),
    prisma.account.findMany({
      where: { isActive: true, companyId },
      orderBy: { code: "asc" },
    }),
    prisma.contact.findMany({
      where: { isActive: true, companyId },
      orderBy: { name: "asc" },
    }),
    getDepartments(),
    getProjects(),
    prisma.defaultAccount.findMany({
      where: {
        companyId,
        isActive: true,
        purpose: { in: ["UNCATEGORIZED_EXPENSE", "UNCATEGORIZED_INCOME"] },
      },
      select: { purpose: true, accountId: true },
    }),
  ]);

  const expenseParentAccountId =
    defaultAccounts.find((item) => item.purpose === "UNCATEGORIZED_EXPENSE")?.accountId || null;
  const incomeParentAccountId =
    defaultAccounts.find((item) => item.purpose === "UNCATEGORIZED_INCOME")?.accountId || null;

  return (
    <TransactionForm
      paymentMethodAccounts={paymentMethodAccounts}
      glAccounts={glAccounts}
      expenseParentAccountId={expenseParentAccountId}
      incomeParentAccountId={incomeParentAccountId}
      contacts={contacts}
      departments={departments}
      projects={projects.projects}
    />
  );
}
