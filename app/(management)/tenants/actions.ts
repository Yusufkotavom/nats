"use server";

import { managementPrisma } from "@/lib/prisma/tenant";
import { revalidatePath } from "next/cache";

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
}) {
    try {
        const tenant = await managementPrisma.tenant.create({
            data: {
                name: data.name,
                slug: data.slug,
                dbUrl: data.dbUrl || null,
                isActive: data.isActive ?? true,
            },
        });

        revalidatePath("/tenants", "page");
        return { success: true, data: tenant };
    } catch (error: any) {
        console.error("Error creating tenant:", error);
        return { success: false, error: error.message };
    }
}

export async function updateTenant(
    id: string,
    data: {
        name?: string;
        slug?: string;
        dbUrl?: string | null;
        isActive?: boolean;
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
            },
        });

        revalidatePath("/tenants", "page");
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
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error toggling tenant status:", error);
        return { success: false, error: error.message };
    }
}
