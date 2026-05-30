"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { revalidateLocalizedPath } from "@/lib/revalidate-localized-path";
import { Prisma } from "@/prisma/generated/prisma/client";

type CategoryType = "EXPENSE" | "INCOME";

function nextChildCode(parentCode: string, siblingCodes: string[]) {
  const used = new Set(
    siblingCodes
      .map((code) => Number(code.replace(`${parentCode}-`, "")))
      .filter((value) => Number.isFinite(value)),
  );

  let next = 1;
  while (used.has(next)) next += 1;
  return `${parentCode}-${String(next).padStart(2, "0")}`;
}

async function getParentAccountId(companyId: string, type: CategoryType) {
  const purpose = type === "EXPENSE" ? "UNCATEGORIZED_EXPENSE" : "UNCATEGORIZED_INCOME";
  const defaultAccount = await prisma.defaultAccount.findFirst({
    where: {
      companyId,
      purpose,
      isActive: true,
    },
    select: { accountId: true },
  });

  return defaultAccount?.accountId || null;
}

export async function getCashTransactionCategories(
  type?: CategoryType,
  search?: string,
) {
  const session = await getSession();
  if (!session?.activeCompanyId || !hasPermission(session.permissions, "cash_bank.view")) {
    return [];
  }

  const expenseParentId = await getParentAccountId(session.activeCompanyId, "EXPENSE");
  const incomeParentId = await getParentAccountId(session.activeCompanyId, "INCOME");

  const parentIds: string[] = [];
  if (!type || type === "EXPENSE") {
    if (expenseParentId) parentIds.push(expenseParentId);
  }
  if (!type || type === "INCOME") {
    if (incomeParentId) parentIds.push(incomeParentId);
  }
  if (parentIds.length === 0) return [];

  const where: Prisma.AccountWhereInput = {
    companyId: session.activeCompanyId,
    isActive: true,
    isPosting: true,
    parentId: { in: parentIds },
  };

  if (search?.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: "insensitive" } },
      { code: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  const rows = await prisma.account.findMany({
    where,
    include: {
      parent: {
        select: { id: true, name: true },
      },
      _count: {
        select: { cashTransactionAllocations: true },
      },
    },
    orderBy: [{ parentId: "asc" }, { code: "asc" }],
  });

  return rows.map((row) => ({
    ...row,
    categoryType: row.parentId === incomeParentId ? "INCOME" : "EXPENSE",
  }));
}

export async function createCashTransactionCategory(input: {
  name: string;
  type: CategoryType;
}) {
  const session = await getSession();
  if (!session?.activeCompanyId || !hasPermission(session.permissions, "cash_bank.create")) {
    return { success: false, error: "Unauthorized" };
  }

  const name = input.name.trim();
  if (!name) return { success: false, error: "Category name is required" };

  const parentAccountId = await getParentAccountId(session.activeCompanyId, input.type);
  if (!parentAccountId) {
    return { success: false, error: "Default parent account is not configured" };
  }

  const parent = await prisma.account.findFirst({
    where: {
      id: parentAccountId,
      companyId: session.activeCompanyId,
    },
    select: {
      id: true,
      code: true,
      type: true,
      normalBalance: true,
      level: true,
    },
  });
  if (!parent) return { success: false, error: "Parent account not found" };

  const existing = await prisma.account.findFirst({
    where: {
      companyId: session.activeCompanyId,
      parentId: parent.id,
      name,
      isActive: true,
      isPosting: true,
    },
    select: { id: true },
  });
  if (existing) {
    return { success: false, error: "Category already exists" };
  }

  const siblings = await prisma.account.findMany({
    where: {
      companyId: session.activeCompanyId,
      parentId: parent.id,
      code: { startsWith: `${parent.code}-` },
    },
    select: { code: true },
    orderBy: { code: "asc" },
  });

  const code = nextChildCode(parent.code, siblings.map((item) => item.code));
  const created = await prisma.account.create({
    data: {
      companyId: session.activeCompanyId,
      code,
      name,
      type: parent.type,
      normalBalance: parent.normalBalance,
      isPosting: true,
      parentId: parent.id,
      level: parent.level + 1,
      isActive: true,
    },
  });

  revalidateLocalizedPath("/cash-bank/categories");
  revalidateLocalizedPath("/cash-bank/transaction/new");
  return { success: true, data: created };
}

export async function updateCashTransactionCategory(
  id: string,
  input: { name: string },
) {
  const session = await getSession();
  if (!session?.activeCompanyId || !hasPermission(session.permissions, "cash_bank.edit")) {
    return { success: false, error: "Unauthorized" };
  }

  const name = input.name.trim();
  if (!name) return { success: false, error: "Category name is required" };

  const account = await prisma.account.findFirst({
    where: {
      id,
      companyId: session.activeCompanyId,
      isPosting: true,
      isActive: true,
    },
    include: {
      parent: { select: { id: true } },
    },
  });
  if (!account || !account.parent?.id) {
    return { success: false, error: "Category not found" };
  }

  const duplicate = await prisma.account.findFirst({
    where: {
      id: { not: id },
      companyId: session.activeCompanyId,
      parentId: account.parent.id,
      name,
      isActive: true,
      isPosting: true,
    },
    select: { id: true },
  });
  if (duplicate) {
    return { success: false, error: "Category already exists" };
  }

  const updated = await prisma.account.update({
    where: { id },
    data: { name },
  });

  revalidateLocalizedPath("/cash-bank/categories");
  revalidateLocalizedPath("/cash-bank/transaction/new");
  return { success: true, data: updated };
}

export async function deleteCashTransactionCategory(id: string) {
  const session = await getSession();
  if (!session?.activeCompanyId || !hasPermission(session.permissions, "cash_bank.delete")) {
    return { success: false, error: "Unauthorized" };
  }

  const account = await prisma.account.findFirst({
    where: {
      id,
      companyId: session.activeCompanyId,
      isPosting: true,
      isActive: true,
    },
    select: {
      id: true,
      _count: {
        select: {
          cashTransactionAllocations: true,
          journalEntryLines: true,
        },
      },
    },
  });
  if (!account) {
    return { success: false, error: "Category not found" };
  }

  if (
    account._count.cashTransactionAllocations > 0 ||
    account._count.journalEntryLines > 0
  ) {
    return { success: false, error: "Category is already used in transactions" };
  }

  await prisma.account.update({
    where: { id: account.id },
    data: { isActive: false },
  });

  revalidateLocalizedPath("/cash-bank/categories");
  revalidateLocalizedPath("/cash-bank/transaction/new");
  return { success: true };
}
