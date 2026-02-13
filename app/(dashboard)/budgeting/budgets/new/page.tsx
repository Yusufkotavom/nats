
import { getDepartments, getProjects, getAccounts } from "@/app/(dashboard)/budgeting/actions";
import { BudgetForm } from "@/components/budgeting/budget-form";

export default async function NewBudgetPage() {
  const [departments, projects, accounts] = await Promise.all([
    getDepartments(),
    getProjects(),
    getAccounts(),
  ]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Create New Budget</h2>
      </div>
      <BudgetForm departments={departments} projects={projects} accounts={accounts} />
    </div>
  );
}
