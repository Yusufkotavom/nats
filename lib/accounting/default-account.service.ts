import { prisma } from "@/lib/prisma";
import { DefaultAccountPurpose } from "@/prisma/generated/prisma/client";
import { cache } from "react";
import { getSession } from "@/lib/auth/auth";

export type DefaultAccountResult = {
    accountId: string;
    accountCode: string;
    accountName: string;
} | null;

const ACCOUNT_SELECT_FIELDS = {
    id: true,
    code: true,
    name: true,
} as const;

export class DefaultAccountService {
    /**
     * Retrieves a single default account by its purpose.
     * Results are cached per request via React's cache().
     */
    static getDefaultAccount = cache(
        async (purpose: DefaultAccountPurpose): Promise<DefaultAccountResult> => {
            const session = await getSession();
            const activeCompanyId = session?.activeCompanyId ?? null;
            const defaultAccount = await prisma.defaultAccount.findFirst({
                where: {
                    purpose,
                    isActive: true,
                    ...(activeCompanyId
                        ? {
                            OR: [
                                { companyId: activeCompanyId },
                                { companyId: null },
                            ],
                        }
                        : {}),
                },
                include: {
                    account: {
                        select: ACCOUNT_SELECT_FIELDS,
                    },
                },
                orderBy: activeCompanyId
                    ? [
                        { companyId: { sort: "desc", nulls: "last" } },
                        { updatedAt: "desc" },
                    ]
                    : [{ updatedAt: "desc" }],
            });

            if (!defaultAccount) return null;

            return {
                accountId: defaultAccount.accountId,
                accountCode: defaultAccount.account.code,
                accountName: defaultAccount.account.name,
            };
        }
    );

    /**
     * Retrieves multiple default accounts by their purposes.
     * Returns a record keyed by purpose string, with null for missing accounts.
     */
    static getDefaultAccounts = cache(
        async (
            purposes: DefaultAccountPurpose[]
        ): Promise<Record<string, DefaultAccountResult>> => {
            const session = await getSession();
            const activeCompanyId = session?.activeCompanyId ?? null;
            const defaultAccounts = await prisma.defaultAccount.findMany({
                where: {
                    purpose: {
                        in: purposes,
                    },
                    isActive: true,
                    ...(activeCompanyId
                        ? {
                            OR: [
                                { companyId: activeCompanyId },
                                { companyId: null },
                            ],
                        }
                        : {}),
                },
                include: {
                    account: {
                        select: ACCOUNT_SELECT_FIELDS,
                    },
                },
                orderBy: activeCompanyId
                    ? [
                        { companyId: { sort: "desc", nulls: "last" } },
                        { updatedAt: "desc" },
                    ]
                    : [{ updatedAt: "desc" }],
            });

            const result: Record<string, DefaultAccountResult> = {};

            purposes.forEach((p) => {
                result[p] = null;
            });

            for (const da of defaultAccounts) {
                // Prioritize company-scoped mapping; keep first hit per purpose.
                if (!result[da.purpose]) {
                    result[da.purpose] = {
                        accountId: da.accountId,
                        accountCode: da.account.code,
                        accountName: da.account.name,
                    };
                }
            }

            return result;
        }
    );

    /**
     * Retrieves a default account by purpose, throwing if not configured.
     * Use this when the account is required for the operation to proceed.
     */
    static async getRequiredDefaultAccount(purpose: DefaultAccountPurpose) {
        const account = await DefaultAccountService.getDefaultAccount(purpose);
        if (!account) {
            throw new Error(
                `Missing default account configuration for ${purpose}`
            );
        }
        return account;
    }
}

export const { getDefaultAccount, getDefaultAccounts, getRequiredDefaultAccount } =
    DefaultAccountService;
