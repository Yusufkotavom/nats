export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getBudgetById, getAccounts } from "@/app/[locale]/(dashboard)/budgeting/actions";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";
import { BudgetForm } from "@/app/[locale]/(dashboard)/budgeting/_components/budget-form";
import { SuperJSON } from "@/lib/superjson";

export default async function EditSavingTargetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [targetResponse, departments, projectsResult, accountsResult] = await Promise.all([
    getBudgetById(id),
    getDepartments(),
    getProjects(),
    getAccounts(),
  ]);

  if (!targetResponse.success || !targetResponse.data) {
    return notFound();
  }

  const target = SuperJSON.deserialize<any>(targetResponse.data);
  if (target.kind !== "SAVING_TARGET") {
    return notFound();
  }
  if (target.status !== "DRAFT" && target.status !== "REJECTED") {
    return notFound();
  }

  const projectList = Array.isArray((projectsResult as any)?.projects)
    ? (projectsResult as any).projects
    : Array.isArray(projectsResult)
      ? projectsResult
      : [];

  const accounts = accountsResult.success
    ? SuperJSON.deserialize<any[]>(accountsResult.data)
    : [];

  return (
    <BudgetForm
      departments={SuperJSON.serialize(departments)}
      projects={SuperJSON.serialize(projectList)}
      accounts={SuperJSON.serialize(accounts)}
      initialData={target}
      isEdit
      kind="SAVING_TARGET"
    />
  );
}
