"use server";

import { prisma } from "@/lib/prisma";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { revalidatePath } from "next/cache";
import {
    AVAILABLE_TEMPLATES,
    RECOMMENDED_DEFAULT_ACCOUNT_MAPPINGS,
    DEFAULT_UNITS,
    DEFAULT_CATEGORIES,
    DEFAULT_SAMPLE_CATALOG,
} from "@/lib/setup/chart-of-accounts-template";
import { ensureCompanyMinimalPaymentMethods } from "@/lib/setup/minimal-payment-methods";
import { DefaultAccountPurpose } from "@/prisma/generated/prisma/client";
import { requireActiveCompanyContext } from "@/lib/company-context";

export type SetupStatus = {
    hasCompanyProfile: boolean;
    accountCount: number;
    defaultAccountCount: number;
    warehouseCount: number;
    unitCount: number;
    categoryCount: number;
};

/**
 * Fetches current setup completion status for each wizard step.
 */
export async function getSetupStatus(): Promise<SetupStatus> {
    const { companyId } = await requireActiveCompanyContext();
    const [
        companyProfile,
        accountCount,
        defaultAccountCount,
        warehouseCount,
        unitCount,
        categoryCount,
    ] = await Promise.all([
        prisma.companyProfile.findUnique({ where: { companyId } }),
        prisma.account.count({ where: { companyId } }),
        prisma.defaultAccount.count({ where: { companyId, isActive: true } }),
        prisma.warehouse.count({ where: { companyId } }),
        prisma.unit.count({ where: { companyId } }),
        prisma.category.count({ where: { companyId } }),
    ]);

    return {
        hasCompanyProfile: !!companyProfile,
        accountCount,
        defaultAccountCount,
        warehouseCount,
        unitCount,
        categoryCount,
    };
}

interface CompanyProfileInput {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    taxId?: string;
    currency: string;
    currencySymbol: string;
    dateFormat: string;
    currencyFormat: string;
    locale: string;
    timezone: string;
}

/**
 * Creates or updates the company profile during initial setup.
 */
export const saveCompanyProfile = authorizedAction(
    "company.settings",
    async (data: CompanyProfileInput) => {
        if (!data.name) {
            return { success: false, error: "Company name is required" };
        }

        const { companyId } = await requireActiveCompanyContext();
        const existing = await prisma.companyProfile.findUnique({
            where: { companyId },
        });

        if (existing) {
            await prisma.companyProfile.update({
                where: { id: existing.id },
                data,
            });
        } else {
            await prisma.companyProfile.create({
                data: {
                    companyId,
                    ...data,
                    enableDepartmentDimension: false,
                    enableProjectDimension: false,
                    posEnableRestaurantFeatures: false,
                },
            });
        }
        
        revalidatePath("/", "layout");
        return { success: true };
    }
);

/**
 * Seeds the standard chart of accounts.
 * Skips accounts that already exist (matched by code).
 */
export const seedChartOfAccounts = authorizedAction(
    "company.settings",
    async (templateId?: string) => {
        let createdCount = 0;
        const { companyId } = await requireActiveCompanyContext();

        const id = templateId || "umkm_balanced";
        const templateDef = AVAILABLE_TEMPLATES.find(t => t.id === id) || AVAILABLE_TEMPLATES[0];
        const chartTemplate = templateDef.getTemplate();

        for (const account of chartTemplate) {
            let parentId: string | null = null;

            if (account.parentCode) {
                const parent = await prisma.account.findFirst({
                    where: {
                        code: account.parentCode,
                        companyId,
                    },
                });
                if (parent) {
                    parentId = parent.id;
                }
            }

            const existing = await prisma.account.findFirst({
                where: {
                    code: account.code,
                    companyId,
                },
            });

            if (!existing) {
                await prisma.account.create({
                    data: {
                        companyId,
                        code: account.code,
                        name: account.name,
                        type: account.type,
                        normalBalance: account.normalBalance,
                        isPosting: account.isPosting,
                        level: account.level,
                        parentId,
                    },
                });
                createdCount++;
            }
        }

        return { success: true, data: { createdCount } };
    }
);

/**
 * Seeds recommended default account mappings.
 * Uses the standard CoA codes to find the account IDs.
 */
export const seedDefaultAccounts = authorizedAction(
    "company.settings",
    async () => {
        let mappedCount = 0;
        const { companyId } = await requireActiveCompanyContext();

        for (const mapping of RECOMMENDED_DEFAULT_ACCOUNT_MAPPINGS) {
            const account = await prisma.account.findFirst({
                where: {
                    code: mapping.code,
                    companyId,
                },
            });

            const purpose = mapping.purpose as DefaultAccountPurpose;

            if (account) {
                // Deactivate existing mapping for this purpose
                await prisma.defaultAccount.updateMany({
                    where: { companyId, purpose, isActive: true },
                    data: { isActive: false },
                });

                await prisma.defaultAccount.create({
                    data: {
                        companyId,
                        purpose,
                        accountId: account.id,
                        isActive: true,
                    },
                });
                mappedCount++;
            }
        }

        await prisma.$transaction(async (tx) => {
            await ensureCompanyMinimalPaymentMethods(tx, companyId);
        });

        return { success: true, data: { mappedCount } };
    }
);

/**
 * Saves custom default account mappings provided by the user.
 */
export const saveCustomDefaultAccounts = authorizedAction(
    "company.settings",
    async (
        mappings: { purpose: DefaultAccountPurpose; accountId: string }[]
    ) => {
        const { companyId } = await requireActiveCompanyContext();
        for (const mapping of mappings) {
            await prisma.defaultAccount.updateMany({
                where: { companyId, purpose: mapping.purpose, isActive: true },
                data: { isActive: false },
            });

            await prisma.defaultAccount.create({
                data: {
                    companyId,
                    purpose: mapping.purpose,
                    accountId: mapping.accountId,
                    isActive: true,
                },
            });
        }

        return { success: true };
    }
);

interface WarehouseInput {
    name: string;
    location?: string;
}

/**
 * Creates the first warehouse and seeds default units/categories.
 */
export const saveInitialWarehouse = authorizedAction(
    "company.settings",
    async (data: WarehouseInput) => {
        if (!data.name) {
            return { success: false, error: "Warehouse name is required" };
        }

        const { companyId } = await requireActiveCompanyContext();

        // Create warehouse
        const existing = await prisma.warehouse.findFirst({
            where: {
                name: data.name,
                companyId,
            },
        });

        if (!existing) {
            await prisma.warehouse.create({
                data: {
                    name: data.name,
                    location: data.location || null,
                    companyId,
                },
            });
        }

        // Seed default units
        for (const unit of DEFAULT_UNITS) {
            const existingUnit = await prisma.unit.findFirst({
                where: {
                    name: unit.name,
                    companyId,
                },
            });
            if (!existingUnit) {
                await prisma.unit.create({
                    data: {
                        ...unit,
                        companyId,
                    },
                });
            }
        }

        // Seed default categories
        for (const category of DEFAULT_CATEGORIES) {
            const existingCategory = await prisma.category.findFirst({
                where: {
                    name: category.name,
                    companyId,
                },
            });
            if (!existingCategory) {
                await prisma.category.create({
                    data: {
                        ...category,
                        companyId,
                    },
                });
            }
        }

        // Seed sample products/services for quick onboarding trial
        const [units, categories] = await Promise.all([
            prisma.unit.findMany({
                where: { companyId },
                select: { id: true, symbol: true },
            }),
            prisma.category.findMany({
                where: { companyId },
                select: { id: true, name: true },
            }),
        ]);

        const unitBySymbol = new Map(units.map((u) => [u.symbol, u.id]));
        const categoryByName = new Map(categories.map((c) => [c.name, c.id]));

        for (const item of DEFAULT_SAMPLE_CATALOG) {
            const existingProduct = await prisma.product.findFirst({
                where: {
                    companyId,
                    name: item.name,
                },
                select: { id: true },
            });
            if (existingProduct) {
                continue;
            }

            const categoryId = categoryByName.get(item.categoryName) || null;
            const unitId = unitBySymbol.get(item.unitSymbol) || null;
            const companyScopedSku = `${companyId}-${item.skuCode}`;

            await prisma.product.create({
                data: {
                    companyId,
                    sku: companyScopedSku,
                    name: item.name,
                    description: item.description || null,
                    categoryId,
                    baseUnitId: unitId,
                    purchaseUnitId: unitId,
                    salesUnitId: unitId,
                    price: item.price,
                    cost: item.cost,
                    averageCost: item.cost,
                    purchaseConversionFactor: 1,
                    salesConversionFactor: 1,
                    isService: item.isService ?? false,
                    isActive: true,
                    showInPos: true,
                },
            });
        }

        return { success: true };
    }
);

/**
 * Fetches all posting accounts for the default accounts step.
 */
export async function getPostingAccounts() {
    const { companyId } = await requireActiveCompanyContext();
    return prisma.account.findMany({
        where: { isPosting: true, companyId },
        select: { id: true, code: true, name: true, type: true },
        orderBy: { code: "asc" },
    });
}

/**
 * Fetches current default account mappings.
 */
export async function getCurrentDefaultAccounts() {
    const { companyId } = await requireActiveCompanyContext();
    return prisma.defaultAccount.findMany({
        where: { companyId, isActive: true },
        include: { account: { select: { id: true, code: true, name: true } } },
    });
}
