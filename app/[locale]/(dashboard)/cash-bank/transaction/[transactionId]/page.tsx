export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { TransactionForm } from "../_components/transaction-form";
import { getCashTransaction } from "../actions";
import { notFound } from "next/navigation";
import { CashTransactionFormData } from "../types";
import { SuperJSON } from "@/lib/superjson";
import { Decimal } from "decimal.js";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";
import { verifySession } from "@/lib/auth/auth";

interface PageProps {
  params: Promise<{
    transactionId: string;
  }>;
}

export default async function EditTransactionPage({ params }: PageProps) {
  const { transactionId } = await params;
  const session = await verifySession();
  if (!session.activeCompanyId) {
    throw new Error("No active company selected");
  }

  const [cashAccounts, glAccounts, transactionResult, contacts, departments, projects] = await Promise.all([
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
    getCashTransaction(transactionId),
    prisma.contact.findMany({
      where: { isActive: true, companyId: session.activeCompanyId },
      orderBy: { name: "asc" },
    }),
    getDepartments(),
    getProjects(),
  ]);

  const transaction: any = transactionResult
    ? SuperJSON.deserialize(transactionResult)
    : null;

  if (!transaction) {
    notFound();
  }

  // Transform to form data
  const initialData: CashTransactionFormData & { id: string } = {
    id: transaction.id,
    date: transaction.date,
    type: transaction.type,
    cashAccountId: transaction.cashAccountId,
    contactId: transaction.contactId || undefined,
    departmentId: transaction.departmentId,
    projectId: transaction.projectId,
    reference: transaction.reference || undefined,
    description: transaction.description || undefined,
    notes: transaction.note || undefined,
    allocations: transaction.allocations.map((a: any) => ({
      accountId: a.accountId,
      amount: new Decimal(a.amount).toNumber(),
      description: a.description || undefined,
    })),
    attachments: transaction.journalEntry.attachments.map((a: any) => ({
      id: a.id,
      name: a.name,
      url: a.url,
    })),
  };

  return (
    <TransactionForm
      cashAccounts={cashAccounts}
      glAccounts={glAccounts}
      initialData={initialData}
      readOnly={transaction.status === "APPROVED"}
      contacts={contacts}
      departments={departments}
      projects={projects.projects}
    />
  );
}
