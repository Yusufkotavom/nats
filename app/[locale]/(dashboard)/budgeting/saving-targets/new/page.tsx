export const dynamic = "force-dynamic";

import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";
import { getAccounts } from "@/app/[locale]/(dashboard)/budgeting/actions";
import { BudgetForm } from "@/app/[locale]/(dashboard)/budgeting/_components/budget-form";
import { SuperJSON } from "@/lib/superjson";

export default async function NewSavingTargetPage() {
  const [departments, projectsResult, accountsResult] = await Promise.all([
    getDepartments(),
    getProjects(),
    getAccounts(),
  ]);

  const accounts = accountsResult.success
    ? SuperJSON.deserialize<any[]>(accountsResult.data)
    : [];

  const projectList = Array.isArray((projectsResult as any)?.projects)
    ? (projectsResult as any).projects
    : Array.isArray(projectsResult)
      ? projectsResult
      : [];

  return (
    <BudgetForm
      departments={SuperJSON.serialize(departments)}
      projects={SuperJSON.serialize(projectList)}
      accounts={SuperJSON.serialize(accounts)}
      kind="SAVING_TARGET"
    />
  );
}
