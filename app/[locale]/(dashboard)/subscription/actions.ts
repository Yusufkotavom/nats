"use server";

import { verifySession } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/prisma";
import { getActiveCompanyContext } from "@/lib/company-context";

export async function getSubscriptionData() {
    const session = await verifySession();

    const companyContext = await getActiveCompanyContext();
    const companyProfile = companyContext?.profile ?? null;

    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthlyTransactions = await prisma.tenantTransactionMonthly.findUnique({
        where: { yearMonth },
    });

    return serializePrisma({
        subscription: "PREMIUM",
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 100)), // 100 years from now (lifetime)
        tenantName: companyProfile?.name || "Standalone ERP",
        paymentHistory: [],
        monthlyUsage: monthlyTransactions?.count || 0,
        monthlyLimit: "Unlimited",
    });
}
