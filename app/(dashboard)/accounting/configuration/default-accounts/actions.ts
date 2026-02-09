"use server"

import { prisma } from "@/lib/prisma"
import { DefaultAccountPurpose } from "@/prisma/generated/prisma/client"
import { revalidatePath } from "next/cache"
import { authorizedAction } from "@/lib/permissions/protected-action"
import { getSession } from "@/lib/auth/auth"
import { hasPermission } from "@/lib/permissions/utils"

export type DefaultAccountWithAccount = {
  id: string
  purpose: DefaultAccountPurpose
  accountId: string
  account: {
    id: string
    code: string
    name: string
  }
}

export async function getDefaultAccounts() {
  const session = await getSession()
  if (!session || !hasPermission(session.permissions, "default_accounts.view")) {
    return []
  }

  const defaultAccounts = await prisma.defaultAccount.findMany({
    where: { isActive: true },
    include: { account: true },
  })
  return defaultAccounts
}

export async function getAccounts() {
  const session = await getSession()
  if (!session || !hasPermission(session.permissions, "accounts.view")) {
    return []
  }

  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
    },
    orderBy: { code: "asc" },
  })
  return accounts
}

export async function updateDefaultAccount(purpose: DefaultAccountPurpose, accountId: string) {
  const session = await getSession()
  if (!session || !hasPermission(session.permissions, "default_accounts.manage")) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Find current active default account for this purpose
    const current = await prisma.defaultAccount.findFirst({
      where: {
        purpose,
        isActive: true,
      },
    })

    // If same account, do nothing
    if (current?.accountId === accountId) {
      return { success: true }
    }

    // Transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Deactivate current
      if (current) {
        await tx.defaultAccount.update({
          where: { id: current.id },
          data: { isActive: false },
        })
      }

      // Create new
      await tx.defaultAccount.create({
        data: {
          purpose,
          accountId,
          isActive: true,
        },
      })
    })

    revalidatePath("/accounting/configuration/default-accounts")
    return { success: true }
  } catch (error) {
    console.error("Error updating default account:", error)
    return { success: false, error: "Failed to update default account" }
  }
}

export const saveDefaultAccounts = authorizedAction(
  "default_accounts.manage",
  async (updates: { purpose: DefaultAccountPurpose; accountId: string }[]) => {
    try {
      await prisma.$transaction(async (tx) => {
        for (const update of updates) {
          const { purpose, accountId } = update

          // Find current active default account for this purpose
          const current = await tx.defaultAccount.findFirst({
            where: {
              purpose,
              isActive: true,
            },
          })

          // If same account, do nothing
          if (current?.accountId === accountId) {
            continue
          }

          // Deactivate current
          if (current) {
            await tx.defaultAccount.update({
              where: { id: current.id },
              data: { isActive: false },
            })
          }

          // Create new
          await tx.defaultAccount.create({
            data: {
              purpose,
              accountId,
              isActive: true,
            },
          })
        }
      })

      revalidatePath("/accounting/configuration/default-accounts")
      return { success: true }
    } catch (error) {
      console.error("Error saving default accounts:", error)
      return { success: false, error: "Failed to save default accounts" }
    }
  }
)
