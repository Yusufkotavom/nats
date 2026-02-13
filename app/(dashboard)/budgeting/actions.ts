
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  departmentSchema,
  projectSchema,
  budgetSchema,
  budgetRevisionSchema,
  budgetApprovalSchema
} from "./schemas";
import { z } from "zod";
import { BudgetStatus, ApprovalStatus } from "@/prisma/generated/prisma/client";
import { getSession } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

// --- Departments ---

export async function getDepartments() {
  return await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { manager: true },
  });
}

export async function createDepartment(data: z.infer<typeof departmentSchema>) {
  const parsed = departmentSchema.parse(data);
  const department = await prisma.department.create({
    data: parsed,
  });
  revalidatePath("/budgeting/configuration");
  return department;
}

// --- Projects ---

export async function getProjects() {
  return await prisma.project.findMany({
    orderBy: { name: "asc" },
    include: { manager: true },
  });
}

export async function getAccounts() {
  return await prisma.account.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });
}

export async function createProject(data: z.infer<typeof projectSchema>) {
  const parsed = projectSchema.parse(data);
  const project = await prisma.project.create({
    data: parsed,
  });
  revalidatePath("/budgeting/configuration");
  return project;
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
    // @ts-ignore - AccountType might be enum
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
