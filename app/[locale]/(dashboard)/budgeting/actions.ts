"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { budgetSchema } from "./schemas";
import { z } from "zod";
import { getSession } from "@/lib/auth/auth";
import { SuperJSON } from "@/lib/superjson";
import { ActionResponse } from "@/types/actions";
import { BudgetKind } from "@/prisma/generated/prisma/client";

type BudgetInput = z.infer<typeof budgetSchema>;

function resolveBudgetPeriod(budget: {
  fiscalYear: number;
  periodStart: Date | null;
  periodEnd: Date | null;
}) {
  if (budget.periodStart && budget.periodEnd) {
    return {
      startDate: budget.periodStart,
      endDate: budget.periodEnd,
    };
  }

  return {
    startDate: new Date(budget.fiscalYear, 0, 1),
    endDate: new Date(budget.fiscalYear, 11, 31),
  };
}

function normalizeBudgetPayload(parsed: BudgetInput) {
  const periodStart = parsed.periodStart ?? null;
  const periodEnd = parsed.periodEnd ?? null;

  const fiscalYear = periodEnd
    ? periodEnd.getFullYear()
    : periodStart
      ? periodStart.getFullYear()
      : parsed.fiscalYear;

  return {
    name: parsed.name,
    kind: parsed.kind,
    fiscalYear,
    periodStart,
    periodEnd,
    description: parsed.description,
    departmentId: parsed.departmentId,
    projectId: parsed.projectId,
    isDefault: parsed.isDefault,
    totalAmount: parsed.totalAmount,
    items: parsed.items,
  };
}

function buildBudgetItemsCreate(items: BudgetInput["items"]) {
  return items.map((item) => ({
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
  }));
}

function getActualByAccountType(
  accountType: string,
  debit: number,
  credit: number,
): number {
  const type = accountType.toLowerCase();
  if (["expense", "asset", "cost_of_goods_sold"].includes(type)) {
    return debit - credit;
  }
  return credit - debit;
}

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

export async function getBudgets(kind: BudgetKind = "BUDGET"): Promise<ActionResponse> {
  try {
    const budgets = await prisma.budget.findMany({
      where: { kind },
      orderBy: { createdAt: "desc" },
      include: {
        department: true,
        project: true,
        items: true,
      },
    });

    const userIds = Array.from(
      new Set(budgets.map((budget) => budget.createdBy).filter(Boolean)),
    );
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

export async function getSavingTargets(): Promise<ActionResponse> {
  return getBudgets("SAVING_TARGET");
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

export async function createBudget(data: BudgetInput): Promise<ActionResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) throw new Error("Unauthorized");

    const parsed = budgetSchema.parse(data);
    const normalized = normalizeBudgetPayload(parsed);

    const budget = await prisma.budget.create({
      data: {
        ...normalized,
        createdBy: session.userId,
        status: "DRAFT",
        items: {
          create: buildBudgetItemsCreate(normalized.items),
        },
      },
    });

    revalidatePath("/budgeting");
    revalidatePath("/budgeting/budgets");
    revalidatePath("/budgeting/saving-targets");
    return { success: true, data: SuperJSON.serialize(budget) };
  } catch (error) {
    console.error(error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateBudget(
  id: string,
  data: BudgetInput,
): Promise<ActionResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) throw new Error("Unauthorized");

    const parsed = budgetSchema.parse(data);
    const normalized = normalizeBudgetPayload(parsed);

    const existing = await prisma.budget.findUnique({ where: { id } });
    if (!existing) throw new Error("Budget not found");
    if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
      throw new Error("Cannot edit budget in current status");
    }

    await prisma.budget.update({
      where: { id },
      data: {
        ...normalized,
      },
    });

    await prisma.budgetItem.deleteMany({ where: { budgetId: id } });
    if (normalized.items.length > 0) {
      await prisma.budgetItem.createMany({
        data: normalized.items.map((item) => ({
          budgetId: id,
          ...item,
        })),
      });
    }

    revalidatePath(`/budgeting/budgets/${id}`);
    revalidatePath("/budgeting");
    revalidatePath("/budgeting/budgets");
    revalidatePath("/budgeting/saving-targets");
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function submitBudgetForApproval(id: string): Promise<ActionResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) throw new Error("Unauthorized");

    const budget = await prisma.budget.findUnique({ where: { id } });
    if (!budget) throw new Error("Budget not found");

    await prisma.budget.update({
      where: { id },
      data: { status: "PENDING_APPROVAL" },
    });

    await prisma.budgetApproval.create({
      data: {
        budgetId: id,
        stage: 1,
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

export async function approveBudgetAction(
  id: string,
  approvalId: string,
  status: "APPROVED" | "REJECTED",
  comments?: string,
): Promise<ActionResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) throw new Error("Unauthorized");

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
    } else if (approval.stage === 1) {
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

    const { startDate, endDate } = resolveBudgetPeriod(budget);

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

    if (!budget.departmentId && !budget.projectId) {
      whereClause.departmentId = null;
      whereClause.projectId = null;
    }

    const varianceData = await Promise.all(
      budget.items.map(async (item) => {
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
        const actual = getActualByAccountType(item.account.type, debit, credit);

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
      }),
    );

    return { success: true, data: SuperJSON.serialize(varianceData) };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getSavingTargetProgress(): Promise<ActionResponse> {
  try {
    const targets = await prisma.budget.findMany({
      where: { kind: "SAVING_TARGET" },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: { account: true },
          orderBy: { createdAt: "asc" },
        },
        department: true,
        project: true,
      },
    });

    const enriched = await Promise.all(
      targets.map(async (target) => {
        const primaryItem = target.items[0] || null;
        const { startDate, endDate } = resolveBudgetPeriod(target);

        let actual = 0;
        if (primaryItem) {
          const whereClause: any = {
            accountId: primaryItem.accountId,
            journalEntry: {
              transactionDate: { gte: startDate, lte: endDate },
              status: "posted",
            },
          };

          if (target.departmentId) whereClause.departmentId = target.departmentId;
          if (target.projectId) whereClause.projectId = target.projectId;

          const sum = await prisma.journalEntryLine.aggregate({
            where: whereClause,
            _sum: {
              debitAmount: true,
              creditAmount: true,
            },
          });

          const debit = sum._sum.debitAmount?.toNumber() || 0;
          const credit = sum._sum.creditAmount?.toNumber() || 0;
          actual = getActualByAccountType(primaryItem.account.type, debit, credit);
        }

        const targetAmount =
          target.totalAmount.toNumber() > 0
            ? target.totalAmount.toNumber()
            : target.items.reduce((sum, item) => sum + item.totalAmount.toNumber(), 0);

        const progressPct = targetAmount > 0 ? (actual / targetAmount) * 100 : 0;

        return {
          ...target,
          startDate,
          endDate,
          primaryAccount: primaryItem?.account || null,
          targetAmount,
          actual,
          remaining: targetAmount - actual,
          progressPct,
        };
      }),
    );

    return { success: true, data: SuperJSON.serialize(enriched) };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function checkBudgetAvailability(
  departmentId: string | null | undefined,
  projectId: string | null | undefined,
  date: Date,
  amount: number,
): Promise<ActionResponse> {
  try {
    const fiscalYear = date.getFullYear();

    const where: any = {
      kind: "BUDGET",
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
      include: { items: true },
    });

    if (!budget) {
      return {
        success: true,
        data: { available: true, warning: "No budget defined for this period." },
      };
    }

    const { startDate, endDate } = resolveBudgetPeriod(budget);

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
      _sum: { debitAmount: true, creditAmount: true },
    });

    const totalActual =
      (aggregates._sum.debitAmount?.toNumber() || 0) -
      (aggregates._sum.creditAmount?.toNumber() || 0);

    const totalBudget = budget.totalAmount.toNumber();
    const itemsTotal = budget.items.reduce(
      (sum, item) => sum + item.totalAmount.toNumber(),
      0,
    );

    const limit = totalBudget > 0 ? totalBudget : itemsTotal;
    const remaining = limit - totalActual;

    if (amount > remaining) {
      return {
        success: true,
        data: {
          available: false,
          warning: `Exceeds budget! Limit: ${limit.toFixed(2)}, Used: ${totalActual.toFixed(2)}, Remaining: ${remaining.toFixed(2)}`,
        },
      };
    }

    if (remaining - amount < limit * 0.1) {
      return {
        success: true,
        data: {
          available: true,
          warning: `Warning: approaching budget limit. Remaining after this: ${(remaining - amount).toFixed(2)}`,
        },
      };
    }

    return { success: true, data: { available: true } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
