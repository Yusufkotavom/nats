"use server";

import { verifySession } from "@/lib/auth/auth";
import { managementPrisma } from "@/lib/prisma/management";
import { getTenantPrismaClient } from "@/lib/prisma/tenant-resolver";
import { serializePrisma } from "@/lib/prisma";

export async function getSubscriptionData() {
    const session = await verifySession();
    if (!session?.tenantId) throw new Error("Unauthorized");

    const [tenant, paymentHistory] = await Promise.all([
        managementPrisma.tenant.findUnique({
            where: { id: session.tenantId },
            select: {
                subscription: true,
                subscriptionStart: true,
                subscriptionEnd: true,
                name: true,
            },
        }),
        managementPrisma.tenantPaymentHistory.findMany({
            where: { tenantId: session.tenantId },
            orderBy: { paymentDate: "desc" },
        }),
    ]);

    if (!tenant) throw new Error("Tenant not found");

    const tenantPrisma = await getTenantPrismaClient(session.tenantId);

    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthlyTransactions = await tenantPrisma.tenantTransactionMonthly.findUnique({
        where: { yearMonth },
    });

    return serializePrisma({
        subscription: tenant.subscription,
        subscriptionStart: tenant.subscriptionStart,
        subscriptionEnd: tenant.subscriptionEnd,
        tenantName: tenant.name,
        paymentHistory,
        monthlyUsage: monthlyTransactions?.count || 0,
        monthlyLimit: tenant.subscription === "FREE" ? 1000 : tenant.subscription === "BASIC" ? 5000 : "Unlimited",
    });
}
