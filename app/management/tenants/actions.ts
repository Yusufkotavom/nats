"use server";

import { managementPrisma } from "@/lib/prisma/tenant";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { SubscriptionType } from "@/prisma/generated/management-client";

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
