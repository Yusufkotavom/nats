"use server";

import { managementPrisma, getTenantPrismaClient } from "@/lib/prisma/tenant";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { SubscriptionType } from "@/prisma/generated/management-client";
import { execSync } from "child_process";
import { Client } from "pg";

export async function getTenants() {
    try {
        const tenants = await managementPrisma.tenant.findMany({
            orderBy: { createdAt: "desc" },
        });
        return tenants;
    } catch (error) {
        console.error("Error fetching tenants:", error);
        throw new Error("Failed to fetch tenants");
    }
}

export async function getTenantById(id: string) {
    try {
        const tenant = await managementPrisma.tenant.findUnique({
            where: { id },
            include: {
                members: {
                    include: {
                        user: true,
                        role: true
                    }
                }
            }
        });
        if (!tenant) throw new Error("Tenant not found");
        return { success: true, data: tenant };
    } catch (error: any) {
        console.error("Error fetching tenant by ID:", error);
        return { success: false, error: error.message };
    }
}

export async function createTenant(data: {
    name: string;
    slug: string;
    dbUrl?: string | null;
    isActive?: boolean;
    email?: string | null;
    phone?: string | null;
    companyName?: string | null;
    subscription?: SubscriptionType;
    billingEmail?: string | null;
    billingAddress?: string | null;
    superadminPassword?: string;
}) {
    try {
        let superAdminRoleId: string | undefined;

        if (data.superadminPassword) {
            const superAdminRole = await managementPrisma.role.findUnique({
                where: { name: "superadmin" }
            });
            if (!superAdminRole) {
                return { success: false, error: "Superadmin role not found dynamically" };
            }
            superAdminRoleId = superAdminRole.id;
        }

        const tenant = await managementPrisma.tenant.create({
            data: {
                name: data.name,
                slug: data.slug,
                dbUrl: data.dbUrl || null,
                isActive: data.isActive ?? true,
                email: data.email,
                phone: data.phone,
                companyName: data.companyName,
                subscription: data.subscription || SubscriptionType.FREE,
                billingEmail: data.billingEmail,
                billingAddress: data.billingAddress,
            },
        });

        if (data.superadminPassword && superAdminRoleId) {
            const hashedPassword = await bcrypt.hash(data.superadminPassword, 10);
            const userEmail = `admin@${data.slug}.com`;

            const user = await managementPrisma.user.upsert({
                where: { email: userEmail },
                update: { password: hashedPassword },
                create: {
                    email: userEmail,
                    password: hashedPassword,
                    name: `Admin ${data.name}`
                }
            });

            await managementPrisma.tenantMember.create({
                data: {
                    tenantId: tenant.id,
                    userId: user.id,
                    roleId: superAdminRoleId,
                }
            });
        }

        revalidatePath("/tenants", "page");
        revalidatePath("/admin/tenants", "page");
        return { success: true, data: tenant };
    } catch (error: any) {
        console.error("Error creating tenant:", error);
        return { success: false, error: error.message || "Failed to create tenant" };
    }
}

export async function updateTenant(
    id: string,
    data: {
        name?: string;
        slug?: string;
        dbUrl?: string | null;
        isActive?: boolean;
        email?: string | null;
        phone?: string | null;
        companyName?: string | null;
        subscription?: SubscriptionType;
        subscriptionStart?: Date | null;
        subscriptionEnd?: Date | null;
        billingEmail?: string | null;
        billingAddress?: string | null;
    }
) {
    try {
        const tenant = await managementPrisma.tenant.update({
            where: { id },
            data: {
                name: data.name,
                slug: data.slug,
                dbUrl: data.dbUrl || null,
                isActive: data.isActive,
                email: data.email,
                phone: data.phone,
                companyName: data.companyName,
                subscription: data.subscription,
                subscriptionStart: data.subscriptionStart,
                subscriptionEnd: data.subscriptionEnd,
                billingEmail: data.billingEmail,
                billingAddress: data.billingAddress,
            },
        });

        revalidatePath("/tenants", "page");
        revalidatePath("/admin/tenants", "page");
        return { success: true, data: tenant };
    } catch (error: any) {
        console.error("Error updating tenant:", error);
        return { success: false, error: error.message };
    }
}

export async function toggleTenantStatus(id: string) {
    try {
        const tenant = await managementPrisma.tenant.findUnique({
            where: { id },
            select: { isActive: true },
        });

        if (!tenant) throw new Error("Tenant not found");

        const updated = await managementPrisma.tenant.update({
            where: { id },
            data: { isActive: !tenant.isActive },
        });

        revalidatePath("/tenants", "page");
        revalidatePath("/admin/tenants", "page");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error toggling tenant status:", error);
        return { success: false, error: error.message };
    }
}

export async function provisionTenantDatabase(tenantId: string) {
    try {
        const tenant = await managementPrisma.tenant.findUnique({
            where: { id: tenantId }
        });

        if (!tenant) throw new Error("Tenant not found");
        if (tenant.dbUrl) throw new Error("Tenant already has a database URL configured");

        const dbName = `tenant_${tenant.slug.replace(/[^a-zA-Z0-9]/g, "_")}`;

        // Use MANAGEMENT_DATABASE_URL or DATABASE_URL to connect to the main postgres instance to create the db
        const baseDbUrl = process.env.MANAGEMENT_DATABASE_URL || process.env.DATABASE_URL;
        if (!baseDbUrl) throw new Error("No base database URL found to connect to.");

        const client = new Client({ connectionString: baseDbUrl });
        await client.connect();

        // Create database
        try {
            await client.query(`CREATE DATABASE "${dbName}"`);
        } catch (e: any) {
            // Ignore if already exists
            if (e.code !== '42P04') {
                throw e;
            }
        } finally {
            await client.end();
        }

        // Construct new db URL (replace database name in base URL)
        const urlObj = new URL(baseDbUrl);
        urlObj.pathname = `/${dbName}`;
        // Remove schema=management if it exists, as tenant DB uses public schema usually
        urlObj.searchParams.delete('schema');
        const newDbUrl = urlObj.toString();

        // Save new dbUrl to tenant
        await managementPrisma.tenant.update({
            where: { id: tenant.id },
            data: { dbUrl: newDbUrl }
        });

        // Run prisma db push for this tenant
        try {
            execSync(`PRISMA_DB_URL="${newDbUrl}" npx prisma db push --schema=prisma/schema --accept-data-loss`, {
                stdio: 'inherit'
            });
        } catch (e) {
            console.error("Failed to push Prisma schema:", e);
            throw new Error("Failed to push schema to new database");
        }

        revalidatePath("/tenants", "page");
        revalidatePath("/admin/tenants", "page");
        return { success: true, message: "Database provisioned successfully" };

    } catch (error: any) {
        console.error("Error provisioning database:", error);
        return { success: false, error: error.message };
    }
}

export async function getTenantPayments(tenantId: string) {
    try {
        const payments = await managementPrisma.tenantPaymentHistory.findMany({
            where: { tenantId },
            orderBy: { paymentDate: "desc" }
        });
        return { success: true, data: payments };
    } catch (error: any) {
        console.error("Error fetching payments", error);
        return { success: false, error: error.message };
    }
}

export async function getAllTenantPayments() {
    try {
        const payments = await managementPrisma.tenantPaymentHistory.findMany({
            orderBy: { paymentDate: "desc" },
            include: {
                tenant: {
                    select: { name: true, slug: true }
                }
            }
        });
        return { success: true, data: payments };
    } catch (error: any) {
        console.error("Error fetching all payments", error);
        return { success: false, error: error.message };
    }
}

export async function createTenantPayment(data: {
    tenantId: string;
    amount: number;
    paymentDate?: Date;
    status: string;
    reference?: string;
    description?: string;
}) {
    try {
        const payment = await managementPrisma.tenantPaymentHistory.create({
            data: {
                tenantId: data.tenantId,
                amount: data.amount,
                paymentDate: data.paymentDate || new Date(),
                status: data.status,
                reference: data.reference,
                description: data.description,
            }
        });

        return { success: true, data: payment };
    } catch (error: any) {
        console.error("Error creating payment:", error);
        return { success: false, error: error.message };
    }
}

export async function getTenantStatistics(tenantId: string) {
    try {
        const tenantClient = await getTenantPrismaClient(tenantId);

        const [
            salesInvoices,
            purchaseInvoices,
            contacts,
            products,
            journalEntries
        ] = await Promise.all([
            tenantClient.salesInvoice.count(),
            tenantClient.purchaseInvoice.count(),
            tenantClient.contact.count(),
            tenantClient.product.count(),
            tenantClient.journalEntry.count()
        ]);

        return {
            success: true,
            data: {
                salesInvoices,
                purchaseInvoices,
                contacts,
                products,
                journalEntries,
                totalRecords: salesInvoices + purchaseInvoices + contacts + products + journalEntries
            }
        };
    } catch (error: any) {
        console.error("Error fetching tenant stats:", error);
        return { success: false, error: error.message };
    }
}

export async function getAllTenantsStatistics() {
    try {
        const allTenants = await managementPrisma.tenant.findMany({
            where: {
                isActive: true,
                dbUrl: { not: null }
            },
            select: { id: true, name: true, slug: true, dbUrl: true }
        });

        const aggregateStats = [];

        for (const tenant of allTenants) {
            try {
                const res = await getTenantStatistics(tenant.id);
                if (res.success && res.data) {
                    aggregateStats.push({
                        tenantId: tenant.id,
                        name: tenant.name,
                        slug: tenant.slug,
                        stats: res.data
                    });
                }
            } catch (e) {
                // Ignore failure for individual tenant
                console.error(`Failed to fetch stats for ${tenant.name}`, e);
            }
        }

        return { success: true, data: aggregateStats };
    } catch (error: any) {
        console.error("Error fetching all tenant stats:", error);
        return { success: false, error: error.message };
    }
}
