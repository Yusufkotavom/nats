"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  budgetSchema,
} from "./schemas";
import { z } from "zod";
import { getSession } from "@/lib/auth/auth";
import { SuperJSON } from "@/lib/superjson";
import { ActionResponse } from "@/types/actions"; // Assuming shared type exists, or I will define it if needed.
// Checking payroll actions: import { ActionResponse } from '@/modules/payroll/types/payroll.types';
// I should probably define a local ActionResponse or import from a shared location if available. 
// Given the lack of a clear shared validation, I'll define it locally similar to payroll if I can't find a shared one.
// Let's look at `actions.ts` in `payroll` again. It imports from `@/modules/payroll/types/payroll.types`.
// I will assume there is no global ActionResponse yet and define it or use `any` for now? No, better to define it.
// Actually, I'll check if I can import it from `types/actions` or similar.
// Wait, I see `import { ActionResponse } from '@/types/actions';` in my thought process but I haven't verified it exists.
// Let me first check if '@/types/actions' exists or if I should define it in this file or a types file.
// I'll define a generic type here for now or use the one from a common place if I find it.
// The user said "look at the same implementation to other module". Payroll has it in `modules/payroll/types`.
// I'll stick to defining it in a new types file for budgeting or just inline if simple.
// Let's use `SuperJSON.serialize` as requested.

// Define ActionResponse locally for now if not found, but I should probably check for a shared one.
// ref: `app/(dashboard)/hr/payroll/actions.ts` imported it.

// I'll start by replacing the content.

// --- Accounts ---

export async function getAccounts(): Promise<ActionResponse> {
  try {
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });
    return { success: true, data: SuperJSON.serialize(accounts) };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// --- Budgets ---

export async function getBudgets(): Promise<ActionResponse> {
  try {
    const budgets = await prisma.budget.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        department: true,
        project: true,
        items: true,
      },
    });
    const userIds = Array.from(new Set(budgets.map((budget) => budget.createdBy).filter(Boolean)));
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const usersById = new Map(users.map((user) => [user.id, user]));

    const budgetsWithCreator = budgets.map((budget) => ({
      ...budget,
      createdByUser: usersById.get(budget.createdBy) || null,
    }));

    return { success: true, data: SuperJSON.serialize(budgetsWithCreator) };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getBudgetById(id: string): Promise<ActionResponse> {
  try {
    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        department: true,
        project: true,
        items: {
          include: { account: true },
        },
        revisions: {
          orderBy: { revisionNumber: "desc" },
        },
        approvals: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return { success: true, data: SuperJSON.serialize(budget) };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function createBudget(data: z.infer<typeof budgetSchema>): Promise<ActionResponse> {
  try {
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
    return { success: true, data: SuperJSON.serialize(budget) };
  } catch (error) {
    console.error(error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateBudget(id: string, data: z.infer<typeof budgetSchema>): Promise<ActionResponse> {
  try {
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
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function submitBudgetForApproval(id: string): Promise<ActionResponse> {
  try {
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
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function approveBudgetAction(id: string, approvalId: string, status: "APPROVED" | "REJECTED", comments?: string): Promise<ActionResponse> {
  try {
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
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getBudgetVariance(budgetId: string): Promise<ActionResponse> {
  try {
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

    return { success: true, data: SuperJSON.serialize(varianceData) };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function checkBudgetAvailability(
  departmentId: string | null | undefined,
  projectId: string | null | undefined,
  date: Date,
  amount: number
): Promise<ActionResponse> {
  try {
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
      return { success: true, data: { available: true, warning: "No budget defined for this period." } };
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
        success: true,
        data: {
          available: false,
          warning: `Exceeds budget! Limit: ${limit.toFixed(2)}, Used: ${totalActual.toFixed(2)}, Remaining: ${remaining.toFixed(2)}`
        }
      };
    }

    if (remaining - amount < limit * 0.1) {
      return {
        success: true,
        data: {
          available: true,
          warning: `Warning: approaching budget limit. Remaining after this: ${(remaining - amount).toFixed(2)}`
        }
      };
    }

    return { success: true, data: { available: true } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
