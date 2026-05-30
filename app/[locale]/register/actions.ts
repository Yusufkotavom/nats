"use server";

import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db-retry";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { createSession } from "@/lib/auth/auth";
import { ensureCompanyMinimalContacts } from "@/lib/setup/minimal-contacts";
import { CompanySubscriptionStatus } from "@/prisma/generated/prisma/client";

function addOneMonth(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), 0, 0, 0));
}

async function resetPrismaConnection() {
    await prisma.$disconnect();
    await prisma.$connect();
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
        errors.companyName = ["Company name is required and should be at least 2 characters"];
    }

    if (Object.keys(errors).length > 0) {
        return { errors };
    }

    // Check if user already exists
    let existingUser: Awaited<ReturnType<typeof prisma.user.findUnique>> | null = null;
    try {
        existingUser = await withDbRetry(() =>
            prisma.user.findUnique({
                where: { email },
            }),
            {
                onRetry: resetPrismaConnection,
            },
        );
    } catch (error) {
        console.error("register existing user lookup failed:", error);
        const errorCode =
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            typeof (error as { code?: string }).code === "string"
                ? (error as { code?: string }).code
                : "";
        const isConnectivityError = errorCode === "ETIMEDOUT" || errorCode === "P6001";
        return {
            errors: {
                email: [
                    isConnectivityError
                        ? "Koneksi database timeout. Coba lagi 10-20 detik, lalu restart server jika perlu."
                        : "Database belum sinkron. Jalankan migrate/db push lalu coba lagi.",
                ],
            },
        };
    }

    if (existingUser) {
        return {
            errors: {
                email: ["An account with this email already exists"],
            },
        };
    }

    // Ensure tenant admin role exists for self-signup flow
    const tenantAdminRole = await withDbRetry(
        () =>
            prisma.role.upsert({
                where: { name: "company_admin" },
                update: {
                    isActive: true,
                    permissions: ["*"],
                },
                create: {
                    name: "company_admin",
                    description: "Company administrator",
                    permissions: ["*"],
                    isActive: true,
                },
            }),
        {
            onRetry: resetPrismaConnection,
        },
    );

    try {
        const hashedPassword = await hash(password, 10);

        const companyCodeBase = companyName
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
            .slice(0, 40);
        const companyCode = `${companyCodeBase || "company"}-${randomUUID().slice(0, 8)}`;

        const created = await prisma.$transaction(async (tx) => {
            const now = new Date();
            const trialEndsAt = addOneMonth(now);
            const company = await tx.company.create({
                data: {
                    code: companyCode,
                    name: companyName.trim(),
                    status: "ACTIVE",
                },
            });

            const newUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name: fullName,
                    roleId: tenantAdminRole.id,
                },
            });

            await tx.companyMembership.create({
                data: {
                    companyId: company.id,
                    userId: newUser.id,
                    isDefault: true,
                },
            });

            await ensureCompanyMinimalContacts(tx, company.id);
            await tx.companySubscription.create({
                data: {
                    companyId: company.id,
                    status: CompanySubscriptionStatus.TRIAL,
                    startDate: now,
                    endDate: trialEndsAt,
                    nextBillingDate: trialEndsAt,
                    autoRenew: false,
                },
            });

            return {
                companyId: company.id,
                userId: newUser.id,
                userName: newUser.name ?? fullName.trim(),
            };
        });
        await createSession(
            created.userId,
            created.userName,
            tenantAdminRole,
            {
                activeCompanyId: created.companyId,
                isPlatformSuperAdmin: false,
            },
        );

    } catch (error: any) {
        console.error("Registration error:", error);
        return {
            errors: {
                email: ["An unexpected error occurred during registration. Please try again."],
            },
        };
    }

    redirect("/setup");
}
