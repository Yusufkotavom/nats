
export const dynamic = "force-dynamic";

import { getDepartments, getProjects } from "@/app/(dashboard)/general/actions";
import { getAccounts } from "@/app/(dashboard)/budgeting/actions";
import { BudgetForm } from "@/components/budgeting/budget-form";

export default async function NewBudgetPage() {
  const [departments, projects, accounts] = await Promise.all([
    getDepartments(),
    getProjects(),
    getAccounts(),
  ]);

  return (
    <BudgetForm departments={departments} projects={projects} accounts={accounts} />
  );
}
