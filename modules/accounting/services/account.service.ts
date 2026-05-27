
import { prisma } from "@/lib/prisma";
import { AccountType } from "@/prisma/generated/prisma/enums";
import { getPaginationMetadata } from "@/lib/pagination";
import { enqueueIntegrationEvent } from "@/modules/integration/outbox";
import { Prisma } from "@/prisma/generated/prisma/client";

export class AccountService {
    /**
     * Fetch accounts for list or tree display.
     */
    static async getAccounts(companyId: string, page?: number, pageSize?: number) {
        if (!page || !pageSize) {
            return await prisma.account.findMany({
                where: { companyId },
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
                where: { companyId },
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
            prisma.account.count({ where: { companyId } }),
        ]);

        return {
            data,
            pagination: getPaginationMetadata(total, page, pageSize),
        };
    }

    /**
     * Create a new account.
     */
    static async createAccount(
        data: {
            code: string;
            name: string;
            type: AccountType;
            parentId?: string;
        },
        userId: string,
        companyId: string,
    ) {
        return prisma.$transaction(async (tx) => {
            let level = 0;

            if (data.parentId) {
                const parent = await tx.account.findFirst({
                    where: { id: data.parentId, companyId },
                    include: {
                        _count: {
                            select: { journalEntryLines: true },
                        },
                    },
                });

                if (!parent) {
                    throw new Error("Parent account not found");
                }

                // Validation: Cannot add child if parent has transactions
                if (parent._count.journalEntryLines > 0) {
                    throw new Error(
                        "Cannot add child account: Parent account has existing transactions."
                    );
                }

                // Update parent isPosting to false if it was true
                if (parent.isPosting) {
                    await tx.account.update({
                        where: { id: data.parentId },
                        data: { isPosting: false },
                    });
                }

                level = parent.level + 1;
            }

            const account = await tx.account.create({
                data: {
                    companyId,
                    code: data.code,
                    name: data.name,
                    type: data.type,
                    parentId: data.parentId || null,
                    level,
                    isPosting: true, // New accounts are always posting (leaf) initially
                },
            });

            // Emit Outbox event
            await enqueueIntegrationEvent(tx, {
                topic: "ACCOUNTING",
                type: "ACCOUNT_CREATED",
                aggregateType: "ACCOUNT",
                aggregateId: account.id,
                payload: {
                    accountId: account.id,
                    code: account.code,
                    name: account.name,
                    type: account.type,
                    userId,
                },
            });

            return account;
        });
    }

    /**
     * Generate the next available account code based on parent and type.
     */
    static async getNextAccountCode(companyId: string, parentId: string | null, type: AccountType) {
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
                    companyId,
                    type,
                    parentId: null,
                    code: { startsWith: prefix },
                },
                orderBy: { code: "desc" },
                take: 1,
            });

            if (accounts.length === 0) {
                return `${prefix}000`;
            }

            const lastCode = accounts[0].code;

            return (parseInt(lastCode) + 100).toString();
        }

        // Child level logic
        const parent = await prisma.account.findFirst({
            where: { id: parentId, companyId },
            include: { children: true },
        });

        if (!parent) {
            throw new Error("Parent account not found");
        }

        const parentCode = parent.code;
        let step = 1;

        // Determine increment step based on trailing zeros
        if (parentCode.endsWith("000")) step = 100;
        else if (parentCode.endsWith("00")) step = 10;
        else if (parentCode.endsWith("0")) step = 1;

        // Find max code among children
        const children = await prisma.account.findMany({
            where: { parentId, companyId },
            orderBy: { code: "desc" },
            take: 1,
        });

        let nextCodeInt: number;

        if (children.length > 0) {
            nextCodeInt = parseInt(children[0].code) + step;
        } else {
            nextCodeInt = parseInt(parentCode) + step;
        }

        return nextCodeInt.toString();
    }

    /**
     * Update an existing account's name.
     */
    static async updateAccount(id: string, data: { name: string }, companyId: string) {
        const existing = await prisma.account.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!existing) {
            throw new Error("Account not found");
        }
        return prisma.account.update({
            where: { id },
            data: { name: data.name },
        });
    }

    /**
     * Delete an account if it is not referenced by any journal entry.
     */
    static async deleteAccount(id: string, companyId: string) {
        const existing = await prisma.account.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!existing) {
            throw new Error("Account not found");
        }
        const childCount = await prisma.account.count({
            where: { parentId: id, companyId },
        });
        if (childCount > 0) {
            throw new Error("Cannot delete: account has child accounts");
        }
        const defaultMappingCount = await prisma.defaultAccount.count({
            where: { accountId: id, companyId },
        });
        if (defaultMappingCount > 0) {
            throw new Error("Cannot delete: account is used in default account mapping");
        }
        const linkedCashAccountCount = await prisma.cashAccount.count({
            where: { glAccountId: id },
        });
        if (linkedCashAccountCount > 0) {
            throw new Error("Cannot delete: account is linked to Cash/Bank account");
        }
        const usageCount = await prisma.journalEntryLine.count({
            where: { accountId: id, account: { companyId } },
        });
        if (usageCount > 0) {
            throw new Error(
                "Cannot delete: account is referenced in one or more transactions"
            );
        }
        try {
            return await prisma.account.delete({
                where: { id },
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2003"
            ) {
                throw new Error("Cannot delete: account is still referenced by related data");
            }
            throw error;
        }
    }
}
