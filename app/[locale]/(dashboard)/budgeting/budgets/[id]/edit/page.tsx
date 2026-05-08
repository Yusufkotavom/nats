export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getBudgetById, getAccounts } from "@/app/[locale]/(dashboard)/budgeting/actions";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";
import { BudgetForm } from "@/app/[locale]/(dashboard)/budgeting/_components/budget-form";
import { SuperJSON } from "@/lib/superjson";

export default async function EditBudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [budgetResponse, departments, projectsResult, accountsResult] = await Promise.all([
    getBudgetById(id),
    getDepartments(),
    getProjects(),
    getAccounts(),
  ]);

  if (!budgetResponse.success || !budgetResponse.data) {
    return notFound();
  }

  const budget = SuperJSON.deserialize<any>(budgetResponse.data);
  if (budget.status !== "DRAFT" && budget.status !== "REJECTED") {
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
      initialData={budget}
      isEdit
    />
  );
}

