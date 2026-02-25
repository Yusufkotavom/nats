"use server";

import { managementPrisma } from "@/lib/prisma/tenant";
import { provisionTenantDatabase } from "@/app/management/(admin)/tenants/actions";
import { hash } from "bcryptjs";
import { createSession } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { SubscriptionType } from "@/prisma/generated/management-client";

function generateSlug(companyName: string): string {
    return companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}

export async function registerUserAndTenant(prevState: unknown, formData: FormData) {
    const fullName = formData.get("fullName") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const companyName = formData.get("companyName") as string;

    const errors: { fullName?: string[]; email?: string[]; password?: string[]; companyName?: string[] } = {};

    if (!fullName || fullName.trim().length < 2) {
        errors.fullName = ["Full name is required and should be at least 2 characters"];
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = ["Invalid email address"];
    }

    if (!password || password.length < 6) {
        errors.password = ["Password must be at least 6 characters long"];
    }

    if (!companyName || companyName.trim().length < 2) {
        errors.companyName = ["Company Name is required and should be at least 2 characters"];
    }

    if (Object.keys(errors).length > 0) {
        return { errors };
    }

    // Check if user already exists
    const existingUser = await managementPrisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        return {
            errors: {
                email: ["An account with this email already exists"],
            },
        };
    }

    // Generate a unique slug
    let slug = generateSlug(companyName);
    let slugCounter = 1;
    while (true) {
        const existingTenant = await managementPrisma.tenant.findUnique({
            where: { slug: slugCounter === 1 ? slug : `${slug}-${slugCounter}` },
        });
        if (!existingTenant) {
            if (slugCounter > 1) {
                slug = `${slug}-${slugCounter}`;
            }
            break;
        }
        slugCounter++;
    }

    // Fetch the superadmin role
    const superAdminRole = await managementPrisma.role.findUnique({
        where: { name: "superadmin" },
    });

    if (!superAdminRole) {
        return {
            errors: {
                email: ["System configuration error: superadmin role not found"],
            },
        };
    }

    // Use a transaction if possible, or create sequentially
    try {
        const hashedPassword = await hash(password, 10);

        const newTenant = await managementPrisma.tenant.create({
            data: {
                name: companyName,
                slug,
                companyName,
                email,
                isActive: true,
                subscription: SubscriptionType.FREE,
            },
        });

        const newUser = await managementPrisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: fullName,
            },
        });

        const tenantMember = await managementPrisma.tenantMember.create({
            data: {
                tenantId: newTenant.id,
                userId: newUser.id,
                roleId: superAdminRole.id,
            },
            include: {
                role: true,
            },
        });

        // Provision database
        const provisionResult = await provisionTenantDatabase(newTenant.id);
        if (!provisionResult.success) {
            console.error("Failed to provision database:", provisionResult.error);
            // We still created the user and tenant, but DB setup failed. 
            // This might require manual intervention, but let's let them login and fail gracefully later
        }

        // Create session
        await createSession(newUser.id, newTenant.id, tenantMember.role);

    } catch (error: any) {
        console.error("Registration error:", error);
        return {
            errors: {
                email: ["An unexpected error occurred during registration. Please try again."],
            },
        };
    }

    redirect("/dashboard");
}
