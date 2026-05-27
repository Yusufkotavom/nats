export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { TransactionForm } from "../_components/transaction-form";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";
import { verifySession } from "@/lib/auth/auth";

export default async function NewTransactionPage() {
  const session = await verifySession();
  if (!session.activeCompanyId) {
    throw new Error("No active company selected");
  }

  const [cashAccounts, glAccounts, contacts, departments, projects] = await Promise.all([
    prisma.cashAccount.findMany({
      where: {
        isActive: true,
        glAccount: { companyId: session.activeCompanyId },
      },
    }),
    prisma.account.findMany({
      where: { isActive: true, companyId: session.activeCompanyId },
      orderBy: { code: "asc" },
    }),
    prisma.contact.findMany({
      where: { isActive: true, companyId: session.activeCompanyId },
      orderBy: { name: "asc" },
    }),
    getDepartments(),
    getProjects(),
  ]);

  return (
    <TransactionForm
      cashAccounts={cashAccounts}
      glAccounts={glAccounts}
      contacts={contacts}
      departments={departments}
      projects={projects.projects}
    />
  );
}
