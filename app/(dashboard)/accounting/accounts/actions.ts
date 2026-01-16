/**
 * accounts.ts
 * Server-side data layer for the Chart of Accounts.
 *
 * This module exposes the main CRUD and helper operations
 * for managing accounting accounts (assets, liabilities, equity, revenue, expense).
 */

"use server";

import { prisma } from "@/lib/prisma";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { AccountType } from "@/prisma/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { getPaginationMetadata } from "@/lib/pagination";

/**
 * Fetch accounts for list or tree display.
 *
 * @param page     - Optional page number (1-based). When omitted, all accounts are returned.
 * @param pageSize - Optional number of items per page. Required when `page` is provided.
 *
 * @returns
 * - Without pagination: `Account[]` with parent, children, and journal-entry usage count.
 * - With pagination: object containing `data` (same shape) plus `pagination` metadata.
 */
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
    pagination: getPaginationMetadata(total, page, pageSize),
  };
}

/**
 * Create a new account.
 * Permission: "accounts.create"
 *
 * @param data - Shape: { code, name, type, parentId? }
 * @returns    - Object with `success` flag plus either `data` (created account) or `error`.
 */
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

/**
 * Generate the next available account code based on parent and type.
 * Implements hierarchical numbering rules:
 * - Root accounts start with type prefix (1-5) and increment by 1000 or 100.
 * - Children increment by 100, 10, or 1 depending on parent code's trailing zeros.
 *
 * @param parentId - Parent account ID; pass `null` for root level.
 * @param type     - One of the five account types.
 * @returns        - Object with `success` flag plus either `code` or `error`.
 */
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

/**
 * Update an existing account's name.
 *
 * @param id   - Account ID to update
 * @param data - Object containing the new `name`
 * @returns    - Object with `success` flag; `error` on failure
 */
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

/**
 * Delete an account if it is not referenced by any journal entry.
 *
 * @param id - Account ID to delete
 * @returns  - Object with `success` flag plus descriptive `error` when deletion is blocked
 */
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
