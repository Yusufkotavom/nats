"use server";

import { prisma } from "@/lib/prisma";
import { authorizedAction } from "@/lib/protected-action";
import { AccountType } from "@/prisma/generated/prisma/enums";
import { revalidatePath } from "next/cache";

export async function getAccounts(page?: number, pageSize?: number) {
  // If no pagination provided, fetch all (for tree view)
  if (!page || !pageSize) {
    return await prisma.account.findMany({
      orderBy: {
        code: "asc",
      },
      include: {
        parent: true,
        children: true,
        _count: {
          select: { journalEntryLines: true },
        },
      },
    });
  }

  const skip = (page - 1) * pageSize;
  const [data, total] = await Promise.all([
    prisma.account.findMany({
      orderBy: {
        code: "asc",
      },
      include: {
        parent: true,
        children: true,
        _count: {
          select: { journalEntryLines: true },
        },
      },
      skip,
      take: pageSize,
    }),
    prisma.account.count(),
  ]);

  return {
    data,
    pagination: {
      total,
      totalPages: Math.ceil(total / pageSize),
      currentPage: page,
      pageSize,
    },
  };
}

export const createAccount = authorizedAction(
  "accounts.create",
  async (data: {
    code: string;
    name: string;
    type: AccountType;
    parentId?: string;
  }) => {
    try {
      const account = await prisma.account.create({
        data: {
          code: data.code,
          name: data.name,
          type: data.type,
          parentId: data.parentId || null,
        },
      });
      revalidatePath("/accounting/accounts");
      return { success: true, data: account };
    } catch (error) {
      console.error(error);
      return { success: false, error: "Failed to create account" };
    }
  }
);

export async function getNextAccountCode(
  parentId: string | null,
  type: AccountType
) {
  try {
    if (!parentId) {
      // Root level logic
      const prefixMap: Record<AccountType, string> = {
        asset: "1",
        liability: "2",
        equity: "3",
        revenue: "4",
        expense: "5",
      };
      const prefix = prefixMap[type];

      // Find existing root accounts of this type
      const accounts = await prisma.account.findMany({
        where: {
          type,
          parentId: null,
          code: { startsWith: prefix },
        },
        orderBy: { code: "desc" },
        take: 1,
      });

      if (accounts.length === 0) {
        return { success: true, code: `${prefix}000` };
      }

      const lastCode = accounts[0].code;
      const nextCode = (parseInt(lastCode) + 1000).toString(); // Logic depends on convention.

      return { success: true, code: (parseInt(lastCode) + 100).toString() };
    }

    // Child level logic
    const parent = await prisma.account.findUnique({
      where: { id: parentId },
      include: { children: true },
    });

    if (!parent) {
      return { success: false, error: "Parent account not found" };
    }

    const parentCode = parent.code;
    let step = 1;

    // Determine increment step based on trailing zeros
    if (parentCode.endsWith("000")) step = 100;
    else if (parentCode.endsWith("00")) step = 10;
    else if (parentCode.endsWith("0")) step = 1;

    // Find max code among children
    const children = await prisma.account.findMany({
      where: { parentId },
      orderBy: { code: "desc" },
      take: 1,
    });

    let nextCodeInt: number;

    if (children.length > 0) {
      nextCodeInt = parseInt(children[0].code) + step;
    } else {
      nextCodeInt = parseInt(parentCode) + step;
    }

    return { success: true, code: nextCodeInt.toString() };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to generate code" };
  }
}

export async function updateAccount(id: string, data: { name: string }) {
  try {
    await prisma.account.update({
      where: { id },
      data: { name: data.name },
    });
    revalidatePath("/accounting/accounts");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to update account" };
  }
}

export async function deleteAccount(id: string) {
  try {
    const usageCount = await prisma.journalEntryLine.count({
      where: { accountId: id },
    });
    if (usageCount > 0) {
      return {
        success: false,
        error:
          "Cannot delete: account is referenced in one or more transactions",
      };
    }
    await prisma.account.delete({
      where: { id },
    });
    revalidatePath("/accounting/accounts");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to delete account" };
  }
}
