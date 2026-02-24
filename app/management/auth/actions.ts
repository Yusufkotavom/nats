"use server";

import { managementPrisma } from "@/lib/prisma/tenant";
import { compare } from "bcryptjs";
import { createSession } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { deleteSession } from "@/lib/auth/auth";

export async function managementLogin(prevState: unknown, formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const errors: { email?: string[]; password?: string[] } = {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = ["Alamat email tidak valid"];
    }

    if (!password || password.length < 1) {
        errors.password = ["Kata sandi wajib diisi"];
    }

    if (Object.keys(errors).length > 0) {
        return {
            errors,
        };
    }

    const user = await managementPrisma.user.findUnique({
        where: { email },
        include: {
            tenantMembers: {
                include: {
                    role: true,
                    tenant: true
                }
            }
        }
    });

    if (!user) {
        return {
            errors: {
                email: ["Email atau kata sandi salah"],
            },
        };
    }

    const passwordsMatch = await compare(password, user.password);

    if (!passwordsMatch) {
        return {
            errors: {
                email: ["Email atau kata sandi salah"],
            },
        };
    }

    // Find a specialized Super Admin membership for the default tenant
    const activeMembership = user.tenantMembers.find(
        (m: any) => m.isActive && m.tenant.isActive && m.tenant.slug === "default" && m.role.name === "superadmin"
    );

    if (!activeMembership) {
        return {
            errors: {
                email: [
                    "Anda tidak memiliki akses Pengelola SaaS. Silakan gunakan portal masuk utama.",
                ],
            },
        };
    }

    await createSession(user.id, activeMembership.tenantId, activeMembership.role);

    redirect("/management/tenants");
}

export async function managementLogout() {
    await deleteSession();
    redirect("/management/auth");
}
