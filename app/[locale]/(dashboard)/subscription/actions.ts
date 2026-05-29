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

    const [monthlyTransactions, subscription, invoices] = await Promise.all([
      prisma.tenantTransactionMonthly.findUnique({
        where: { yearMonth },
      }),
      session.activeCompanyId
        ? prisma.companySubscription.findUnique({
            where: { companyId: session.activeCompanyId },
            include: {
              plan: true,
            },
          })
        : null,
      session.activeCompanyId
        ? prisma.companySubscriptionInvoice.findMany({
            where: { companyId: session.activeCompanyId },
            orderBy: { createdAt: "desc" },
            take: 30,
          })
        : [],
    ]);

    return serializePrisma({
        subscription: subscription?.plan?.name || "UNASSIGNED",
        subscriptionStatus: subscription?.status || "PENDING_SETUP",
        subscriptionStart: subscription?.startDate || null,
        subscriptionEnd: subscription?.endDate || null,
        nextBillingDate: subscription?.nextBillingDate || null,
        tenantName: companyProfile?.name || "Standalone ERP",
        paymentHistory: invoices.map((invoice) => ({
          id: invoice.id,
          paymentDate: invoice.issueDate,
          description: `Subscription ${subscription?.plan?.name || "-"}`,
          reference: invoice.invoiceNumber,
          status: invoice.status,
          amount: Number(invoice.totalAmount),
        })),
        monthlyUsage: monthlyTransactions?.count || 0,
        monthlyLimit: "Unlimited",
    });
}
