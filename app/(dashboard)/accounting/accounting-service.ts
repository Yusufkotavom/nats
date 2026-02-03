import { prisma } from "@/lib/prisma"
import { DefaultAccountPurpose } from "@/prisma/generated/prisma/client"
import { cache } from "react"

export type DefaultAccountResult = {
    accountId: string
    accountCode: string
    accountName: string
} | null

/**
 * Retrieves a single default account by purpose.
 * Uses React cache to deduplicate requests within the same request lifecycle.
 */
export const getDefaultAccount = cache(async (
    purpose: DefaultAccountPurpose
): Promise<DefaultAccountResult> => {
    const defaultAccount = await prisma.defaultAccount.findFirst({
        where: {
            purpose,
            isActive: true,
        },
        include: {
            account: {
                select: {
                    id: true,
                    code: true,
                    name: true,
                },
            },
        },
    })

    if (!defaultAccount) return null

    return {
        accountId: defaultAccount.accountId,
        accountCode: defaultAccount.account.code,
        accountName: defaultAccount.account.name,
    }
})

/**
 * Retrieves multiple default accounts by purposes.
 * Returns a map of purpose -> DefaultAccountResult.
 */
export const getDefaultAccounts = cache(async (
    purposes: DefaultAccountPurpose[]
): Promise<Record<string, DefaultAccountResult>> => {
    const defaultAccounts = await prisma.defaultAccount.findMany({
        where: {
            purpose: {
                in: purposes,
            },
            isActive: true,
        },
        include: {
            account: {
                select: {
                    id: true,
                    code: true,
                    name: true,
                },
            },
        },
    })

    const result: Record<string, DefaultAccountResult> = {}

    // Initialize all requested purposes as null
    purposes.forEach(p => {
        result[p] = null
    })

    // Fill in found accounts
    defaultAccounts.forEach(da => {
        result[da.purpose] = {
            accountId: da.accountId,
            accountCode: da.account.code,
            accountName: da.account.name,
        }
    })

    return result
})

/**
 * Helper to throw error if a required default account is missing
 */
export async function getRequiredDefaultAccount(purpose: DefaultAccountPurpose) {
    const account = await getDefaultAccount(purpose)
    if (!account) {
        throw new Error(`Missing default account configuration for ${purpose}`)
    }
    return account
}
