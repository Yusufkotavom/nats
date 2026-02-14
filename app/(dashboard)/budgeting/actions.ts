
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  budgetSchema,
  budgetRevisionSchema,
  budgetApprovalSchema
} from "./schemas";
import { z } from "zod";
import { BudgetStatus, ApprovalStatus } from "@/prisma/generated/prisma/client";
import { getSession } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

// --- Accounts ---

export async function getAccounts() {
  return await prisma.account.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });
}

// --- Budgets ---

export async function getBudgets() {
  return await prisma.budget.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      department: true,
      project: true,
      createdByUser: true,
      items: true,
    },
  });
}

export async function getBudgetById(id: string) {
  return await prisma.budget.findUnique({
    where: { id },
    include: {
      department: true,
      project: true,
      createdByUser: true,
      items: {
        include: { account: true },
      },
      revisions: {
        include: { createdByUser: true },
        orderBy: { revisionNumber: "desc" },
      },
      approvals: {
        include: { approver: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function createBudget(data: z.infer<typeof budgetSchema>) {
  const session = await getSession();
  if (!session || !session.userId) throw new Error("Unauthorized");

  const parsed = budgetSchema.parse(data);

  const budget = await prisma.budget.create({
    data: {
      name: parsed.name,
      fiscalYear: parsed.fiscalYear,
      description: parsed.description,
      departmentId: parsed.departmentId,
      projectId: parsed.projectId,
      isDefault: parsed.isDefault,
      totalAmount: parsed.totalAmount,
      createdBy: session.userId,
      status: "DRAFT",
      items: {
        create: parsed.items?.map(item => ({
          accountId: item.accountId,
          totalAmount: item.totalAmount,
          january: item.january,
          february: item.february,
          march: item.march,
          april: item.april,
          may: item.may,
          june: item.june,
          july: item.july,
          august: item.august,
          september: item.september,
          october: item.october,
          november: item.november,
          december: item.december,
        })),
      },
    },
  });

  revalidatePath("/budgeting");
  return budget;
}

export async function updateBudget(id: string, data: z.infer<typeof budgetSchema>) {
  const session = await getSession();
  if (!session || !session.userId) throw new Error("Unauthorized");

  const parsed = budgetSchema.parse(data);

  const existing = await prisma.budget.findUnique({ where: { id } });
  if (!existing) throw new Error("Budget not found");
  if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
    throw new Error("Cannot edit budget in current status");
  }

  await prisma.budget.update({
    where: { id },
    data: {
      name: parsed.name,
      fiscalYear: parsed.fiscalYear,
      description: parsed.description,
      departmentId: parsed.departmentId,
      projectId: parsed.projectId,
      isDefault: parsed.isDefault,
      totalAmount: parsed.totalAmount,
    },
  });

  if (parsed.items) {
    await prisma.budgetItem.deleteMany({ where: { budgetId: id } });
    await prisma.budgetItem.createMany({
      data: parsed.items.map(item => ({
        budgetId: id,
        accountId: item.accountId,
        totalAmount: item.totalAmount,
        january: item.january,
        february: item.february,
        march: item.march,
        april: item.april,
        may: item.may,
        june: item.june,
        july: item.july,
        august: item.august,
        september: item.september,
        october: item.october,
        november: item.november,
        december: item.december,
      })),
    });
  }

  revalidatePath(`/budgeting/budgets/${id}`);
  revalidatePath("/budgeting");
  return { success: true };
}

export async function submitBudgetForApproval(id: string) {
  const session = await getSession();
  if (!session || !session.userId) throw new Error("Unauthorized");

  const budget = await prisma.budget.findUnique({ where: { id } });
  if (!budget) throw new Error("Budget not found");

  await prisma.budget.update({
    where: { id },
    data: { status: "PENDING_APPROVAL" },
  });

  await prisma.budgetApproval.create({
    data: {
      budgetId: id,
      stage: 1, // Dept Head
      role: "DEPT_HEAD",
      status: "PENDING",
    },
  });

  revalidatePath(`/budgeting/budgets/${id}`);
}

export async function approveBudgetAction(id: string, approvalId: string, status: "APPROVED" | "REJECTED", comments?: string) {
  const session = await getSession();
  if (!session || !session.userId) throw new Error("Unauthorized");

  const approval = await prisma.budgetApproval.findUnique({ where: { id: approvalId } });
  if (!approval) throw new Error("Approval record not found");

  await prisma.budgetApproval.update({
    where: { id: approvalId },
    data: {
      status,
      approverId: session.userId,
      comments,
    },
  });

  if (status === "REJECTED") {
    await prisma.budget.update({
      where: { id },
      data: { status: "REJECTED" },
    });
  } else {
    if (approval.stage === 1) {
      await prisma.budgetApproval.create({
        data: {
          budgetId: id,
          stage: 2,
          role: "FINANCE",
          status: "PENDING",
        },
      });
    } else if (approval.stage === 2) {
      await prisma.budgetApproval.create({
        data: {
          budgetId: id,
          stage: 3,
          role: "CFO",
          status: "PENDING",
        },
      });
    } else if (approval.stage === 3) {
      await prisma.budget.update({
        where: { id },
        data: { status: "APPROVED" },
      });
    }
  }

  revalidatePath(`/budgeting/budgets/${id}`);
}

export async function getBudgetVariance(budgetId: string) {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
    include: { items: { include: { account: true } } },
  });

  if (!budget) throw new Error("Budget not found");

  const startDate = new Date(budget.fiscalYear, 0, 1);
  const endDate = new Date(budget.fiscalYear, 11, 31);

  const whereClause: any = {
    journalEntry: {
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
      status: "posted",
    },
  };

  if (budget.departmentId) {
    whereClause.departmentId = budget.departmentId;
  }
  if (budget.projectId) {
    whereClause.projectId = budget.projectId;
  }

  // If no dimensions are set, treat as Default Budget (Unassigned Transactions)
  if (!budget.departmentId && !budget.projectId) {
    whereClause.departmentId = null;
    whereClause.projectId = null;
  }

  const varianceData = await Promise.all(budget.items.map(async (item) => {
    const aggregates = await prisma.journalEntryLine.aggregate({
      where: {
        accountId: item.accountId,
        ...whereClause,
      },
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    const debit = aggregates._sum.debitAmount?.toNumber() || 0;
    const credit = aggregates._sum.creditAmount?.toNumber() || 0;

    let actual = 0;
    const type = item.account.type.toString().toLowerCase();

    if (["expense", "asset", "cost_of_goods_sold"].includes(type)) {
      actual = debit - credit;
    } else {
      actual = credit - debit;
    }

    const budgeted = item.totalAmount.toNumber();
    const variance = budgeted - actual;
    const percentage = budgeted !== 0 ? (actual / budgeted) * 100 : 0;

    return {
      accountId: item.accountId,
      accountName: item.account.name,
      accountCode: item.account.code,
      budgeted,
      actual,
      variance,
      percentage,
    };
  }));

  return varianceData;
}

export async function checkBudgetAvailability(
  departmentId: string | null | undefined,
  projectId: string | null | undefined,
  date: Date,
  amount: number
) {
  const fiscalYear = date.getFullYear();

  // Find Budget
  const where: any = {
    fiscalYear,
    status: "APPROVED",
  };

  if (departmentId) {
    where.departmentId = departmentId;
  } else if (projectId) {
    where.projectId = projectId;
  } else {
    where.departmentId = null;
    where.projectId = null;
  }

  const budget = await prisma.budget.findFirst({
    where,
    include: { items: true }
  });

  if (!budget) {
    return { available: true, warning: "No budget defined for this period." };
  }

  const startDate = new Date(fiscalYear, 0, 1);
  const endDate = new Date(fiscalYear, 11, 31);

  const jeWhere: any = {
    transactionDate: { gte: startDate, lte: endDate },
    status: "posted",
  };

  if (departmentId) jeWhere.departmentId = departmentId;
  if (projectId) jeWhere.projectId = projectId;
  if (!departmentId && !projectId) {
    jeWhere.departmentId = null;
    jeWhere.projectId = null;
  }

  const aggregates = await prisma.journalEntryLine.aggregate({
    where: jeWhere,
    _sum: { debitAmount: true, creditAmount: true }
  });

  // Assuming expense nature (Debit positive)
  const totalActual = (aggregates._sum.debitAmount?.toNumber() || 0) - (aggregates._sum.creditAmount?.toNumber() || 0);

  const totalBudget = budget.totalAmount.toNumber();
  const itemsTotal = budget.items.reduce((sum, item) => sum + item.totalAmount.toNumber(), 0);

  const limit = totalBudget > 0 ? totalBudget : itemsTotal;

  const remaining = limit - totalActual;

  if (amount > remaining) {
    return {
      available: false,
      warning: `Exceeds budget! Limit: ${limit.toFixed(2)}, Used: ${totalActual.toFixed(2)}, Remaining: ${remaining.toFixed(2)}`
    };
  }

  if (remaining - amount < limit * 0.1) {
    return {
      available: true,
      warning: `Warning: approaching budget limit. Remaining after this: ${(remaining - amount).toFixed(2)}`
    };
  }

  return { available: true };
}
