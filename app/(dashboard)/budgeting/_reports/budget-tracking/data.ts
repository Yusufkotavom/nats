import { prisma } from "@/lib/prisma";
import { getBudgetVariance } from "@/app/(dashboard)/budgeting/actions";

export async function fetchBudgetTrackingData(input: { fiscalYear?: number }) {
  const fiscalYear = input.fiscalYear || new Date().getFullYear();

  const budgets = await prisma.budget.findMany({
    where: { fiscalYear },
    include: {
      department: true,
      project: true,
      items: { include: { account: true } }
    }
  });

  const reportData = await Promise.all(budgets.map(async (budget) => {
    // Reuse existing variance logic per budget
    const varianceItems = await getBudgetVariance(budget.id);
    
    const itemsTotal = varianceItems.reduce((sum, item) => sum + item.budgeted, 0);
    const totalBudget = budget.totalAmount.toNumber() > 0 
        ? budget.totalAmount.toNumber() 
        : itemsTotal;
        
    const totalActual = varianceItems.reduce((sum, item) => sum + item.actual, 0);
    
    return {
        id: budget.id,
        name: budget.name,
        department: budget.department?.name,
        project: budget.project?.name,
        isDefault: budget.isDefault,
        totalBudget,
        totalActual,
        variance: totalBudget - totalActual,
        percentage: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0,
        items: varianceItems
    };
  }));

  return {
      fiscalYear,
      budgets: reportData
  };
}
