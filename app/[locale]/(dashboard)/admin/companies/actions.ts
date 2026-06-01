"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { revalidateLocalizedPath } from "@/lib/revalidate-localized-path";
import {
  clearImpersonationContext,
  getSession,
  setImpersonationContext,
  switchActiveCompanyContext,
} from "@/lib/auth/auth";
import { ensureCompanyMinimalContacts } from "@/lib/setup/minimal-contacts";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { Decimal } from "decimal.js";
import {
  CompanySubscriptionInvoiceStatus,
  CompanySubscriptionStatus,
  CompanyStatus,
  PlanBillingCycle,
} from "@/prisma/generated/prisma/client";

async function assertPlatformSuperAdmin() {
  const session = await getSession();
  if (!session?.isPlatformSuperAdmin) {
    throw new Error("Forbidden: platform super admin only");
  }
  return session;
}

export async function getCompaniesForPlatformAdmin() {
  await assertPlatformSuperAdmin();

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      profile: true,
      subscriptions: {
        include: {
          plan: true,
          invoices: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        take: 1,
      },
      _count: {
        select: { memberships: true },
      },
    },
  });

  return companies.map((company) => ({
    id: company.id,
    code: company.code,
    name: company.name,
    status: company.status,
    memberCount: company._count.memberships,
    profileEmail: company.profile?.email || null,
    profilePhone: company.profile?.phone || null,
    subscription: company.subscriptions[0]
      ? {
          id: company.subscriptions[0].id,
          status: company.subscriptions[0].status,
          planId: company.subscriptions[0].planId,
          planName: company.subscriptions[0].plan?.name || null,
          startDate: company.subscriptions[0].startDate,
          endDate: company.subscriptions[0].endDate,
          nextBillingDate: company.subscriptions[0].nextBillingDate,
          autoRenew: company.subscriptions[0].autoRenew,
          lastInvoiceStatus: company.subscriptions[0].invoices[0]?.status || null,
          lastInvoiceNumber: company.subscriptions[0].invoices[0]?.invoiceNumber || null,
        }
      : null,
    createdAt: company.createdAt,
  }));
}

export async function createCompanyAsPlatformAdmin(input: {
  name: string;
  code?: string;
  ownerUserId?: string;
}) {
  const session = await assertPlatformSuperAdmin();
  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "Company name is required" };
  }

  const sanitizedCode = (input.code || name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  const code = sanitizedCode || `company-${Date.now()}`;

  const existing = await prisma.company.findUnique({
    where: { code },
    select: { id: true },
  });
  if (existing) {
    return { success: false, error: "Company code already exists" };
  }

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const trialEndsAt = addOneMonth(now);
    const company = await tx.company.create({
      data: {
        code,
        name,
        createdById: session.userId,
        status: CompanyStatus.ACTIVE,
      },
    });

    await tx.companyProfile.create({
      data: {
        companyId: company.id,
        name,
        enableDepartmentDimension: false,
        enableProjectDimension: false,
        posEnableRestaurantFeatures: false,
      },
    });

    if (input.ownerUserId) {
      await tx.companyMembership.upsert({
        where: {
          companyId_userId: {
            companyId: company.id,
            userId: input.ownerUserId,
          },
        },
        update: { isDefault: false },
        create: {
          companyId: company.id,
          userId: input.ownerUserId,
          isDefault: false,
        },
      });
    }

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
  });

  revalidateLocalizedPath("/admin/companies");
  return { success: true };
}

export async function cloneCompanyAsPlatformAdmin(companyId: string) {
  await assertPlatformSuperAdmin();
  const source = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, code: true },
  });
  if (!source) {
    return { success: false, error: "Company not found" };
  }
  return createCompanyAsPlatformAdmin({
    name: `${source.name} Copy`,
    code: `${source.code}-${Date.now().toString().slice(-4)}`,
  });
}

export async function updateCompanyAsPlatformAdmin(input: {
  companyId: string;
  name: string;
  code: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING_SETUP";
}) {
  await assertPlatformSuperAdmin();
  const name = input.name.trim();
  const code = input.code.trim().toLowerCase();
  if (!name) return { success: false, error: "Company name is required" };
  if (!code) return { success: false, error: "Company code is required" };

  const existing = await prisma.company.findFirst({
    where: {
      code,
      id: { not: input.companyId },
    },
    select: { id: true },
  });
  if (existing) return { success: false, error: "Company code already exists" };

  await prisma.company.update({
    where: { id: input.companyId },
    data: {
      name,
      code,
      status: input.status as CompanyStatus,
    },
  });

  revalidateLocalizedPath("/admin/companies");
  revalidateLocalizedPath(`/admin/companies/${input.companyId}`);
  return { success: true };
}

export async function getCompanyForPlatformAdmin(companyId: string) {
  await assertPlatformSuperAdmin();
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      profile: true,
      subscriptions: {
        include: {
          plan: true,
          invoices: {
            orderBy: { createdAt: "desc" },
            take: 25,
          },
        },
        take: 1,
      },
      _count: { select: { memberships: true } },
    },
  });
  if (!company) return null;

  return {
    id: company.id,
    code: company.code,
    name: company.name,
    status: company.status,
    profileEmail: company.profile?.email || null,
    profilePhone: company.profile?.phone || null,
    memberCount: company._count.memberships,
    createdAt: company.createdAt,
    subscription: company.subscriptions[0]
      ? {
          id: company.subscriptions[0].id,
          status: company.subscriptions[0].status,
          planId: company.subscriptions[0].planId,
          planName: company.subscriptions[0].plan?.name || null,
          startDate: company.subscriptions[0].startDate,
          endDate: company.subscriptions[0].endDate,
          nextBillingDate: company.subscriptions[0].nextBillingDate,
          autoRenew: company.subscriptions[0].autoRenew,
        }
      : null,
    invoices: company.subscriptions[0]?.invoices?.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      dueDate: inv.dueDate,
      totalAmount: Number(inv.totalAmount),
    })) || [],
  };
}

function startOfMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0));
}

function endOfMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59));
}

function nextMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0));
}

function addOneMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), 0, 0, 0));
}

function nextByBillingCycle(date: Date, cycle: PlanBillingCycle) {
  if (cycle === PlanBillingCycle.YEARLY) {
    return new Date(Date.UTC(date.getUTCFullYear() + 1, date.getUTCMonth(), 1, 0, 0, 0));
  }
  return nextMonthUtc(date);
}

export async function getPlatformPlans() {
  await assertPlatformSuperAdmin();
  return prisma.platformPlan.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function getPlatformBillingSetting() {
  await assertPlatformSuperAdmin();
  return prisma.platformBillingSetting.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      whatsappConfirmTo: "085799520350",
    },
  });
}

export async function savePlatformBillingSetting(input: {
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  whatsappConfirmTo?: string;
  paymentInstruction?: string;
}) {
  await assertPlatformSuperAdmin();
  await prisma.platformBillingSetting.upsert({
    where: { id: "singleton" },
    update: {
      bankAccountName: input.bankAccountName?.trim() || null,
      bankAccountNumber: input.bankAccountNumber?.trim() || null,
      bankName: input.bankName?.trim() || null,
      whatsappConfirmTo: input.whatsappConfirmTo?.trim() || "085799520350",
      paymentInstruction: input.paymentInstruction?.trim() || null,
    },
    create: {
      id: "singleton",
      bankAccountName: input.bankAccountName?.trim() || null,
      bankAccountNumber: input.bankAccountNumber?.trim() || null,
      bankName: input.bankName?.trim() || null,
      whatsappConfirmTo: input.whatsappConfirmTo?.trim() || "085799520350",
      paymentInstruction: input.paymentInstruction?.trim() || null,
    },
  });

  revalidateLocalizedPath("/admin/companies");
  revalidateLocalizedPath("/subscription");
  return { success: true };
}

export async function createPlatformPlan(input: {
  code: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  billingCycle?: "MONTHLY" | "YEARLY";
  monthlyTransactionLimit?: number | null;
  featureList?: string[];
}) {
  await assertPlatformSuperAdmin();
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code || !name) return { success: false, error: "Code and name are required" };
  await prisma.platformPlan.create({
    data: {
      code,
      name,
      description: input.description?.trim() || null,
      price: new Decimal(input.price || 0),
      currency: input.currency?.trim().toUpperCase() || "IDR",
      billingCycle:
        input.billingCycle === "YEARLY" ? PlanBillingCycle.YEARLY : PlanBillingCycle.MONTHLY,
      monthlyTransactionLimit:
        typeof input.monthlyTransactionLimit === "number" && input.monthlyTransactionLimit > 0
          ? Math.floor(input.monthlyTransactionLimit)
          : null,
      featureList: (input.featureList || []).map((x) => x.trim()).filter(Boolean),
      isActive: true,
    },
  });
  revalidateLocalizedPath("/admin/companies");
  return { success: true };
}

export async function togglePlatformPlanStatus(planId: string, isActive: boolean) {
  await assertPlatformSuperAdmin();
  await prisma.platformPlan.update({
    where: { id: planId },
    data: { isActive },
  });
  revalidateLocalizedPath("/admin/companies");
  return { success: true };
}

export async function assignPlanToCompany(input: {
  companyId: string;
  planId: string;
  startDate?: string;
  nextBillingDate?: string;
  autoRenew?: boolean;
}) {
  await assertPlatformSuperAdmin();
  const plan = await prisma.platformPlan.findUnique({
    where: { id: input.planId },
    select: { id: true, isActive: true, billingCycle: true },
  });
  if (!plan || !plan.isActive) {
    return { success: false, error: "Plan not found or inactive" };
  }

  const startDate = input.startDate ? new Date(input.startDate) : new Date();
  const nextBillingDate = input.nextBillingDate
    ? new Date(input.nextBillingDate)
    : nextByBillingCycle(startDate, plan.billingCycle as PlanBillingCycle);

  await prisma.$transaction(async (tx) => {
    await tx.companySubscription.upsert({
      where: { companyId: input.companyId },
      update: {
        planId: input.planId,
        status: CompanySubscriptionStatus.ACTIVE,
        startDate,
        nextBillingDate,
        autoRenew: Boolean(input.autoRenew),
      },
      create: {
        companyId: input.companyId,
        planId: input.planId,
        status: CompanySubscriptionStatus.ACTIVE,
        startDate,
        nextBillingDate,
        autoRenew: Boolean(input.autoRenew),
      },
    });

    await tx.company.update({
      where: { id: input.companyId },
      data: { status: CompanyStatus.ACTIVE },
    });
  });

  revalidateLocalizedPath("/admin/companies");
  return { success: true };
}

export async function saveCompanySubscriptionManual(input: {
  companyId: string;
  planId?: string | null;
  status: "PENDING_SETUP" | "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELED";
  startDate?: string | null;
  endDate?: string | null;
  nextBillingDate?: string | null;
  autoRenew?: boolean;
}) {
  await assertPlatformSuperAdmin();

  const normalizedPlanId = input.planId && input.planId.trim() ? input.planId.trim() : null;
  const startDate = input.startDate ? new Date(input.startDate) : null;
  const endDate = input.endDate ? new Date(input.endDate) : null;
  const nextBillingDate = input.nextBillingDate ? new Date(input.nextBillingDate) : null;

  await prisma.$transaction(async (tx) => {
    await tx.companySubscription.upsert({
      where: { companyId: input.companyId },
      update: {
        planId: normalizedPlanId,
        status: input.status as CompanySubscriptionStatus,
        startDate,
        endDate,
        nextBillingDate,
        autoRenew: Boolean(input.autoRenew),
      },
      create: {
        companyId: input.companyId,
        planId: normalizedPlanId,
        status: input.status as CompanySubscriptionStatus,
        startDate,
        endDate,
        nextBillingDate,
        autoRenew: Boolean(input.autoRenew),
      },
    });

    await tx.company.update({
      where: { id: input.companyId },
      data: {
        status:
          input.status === "ACTIVE" || input.status === "TRIAL"
            ? CompanyStatus.ACTIVE
            : CompanyStatus.SUSPENDED,
      },
    });
  });

  revalidateLocalizedPath("/admin/companies");
  revalidateLocalizedPath("/subscription");
  return { success: true };
}

export async function generateSubscriptionInvoiceForCompany(input: {
  companyId: string;
  subscriptionId?: string;
  issueDate?: string;
  dueDays?: number;
}) {
  await assertPlatformSuperAdmin();

  const issueDate = input.issueDate ? new Date(input.issueDate) : new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + (input.dueDays ?? 7));

  return prisma.$transaction(async (tx) => {
    const subscription =
      input.subscriptionId
        ? await tx.companySubscription.findFirst({
            where: { id: input.subscriptionId, companyId: input.companyId },
            include: { plan: true },
          })
        : await tx.companySubscription.findFirst({
            where: { companyId: input.companyId },
            include: { plan: true },
          });

    if (!subscription) return { success: false, error: "Subscription not found" };
    if (!subscription.plan) return { success: false, error: "Plan is not assigned" };
    if (subscription.status !== CompanySubscriptionStatus.ACTIVE) {
      return { success: false, error: "Subscription is not active" };
    }

    const periodStart = startOfMonthUtc(subscription.nextBillingDate || issueDate);
    const periodEnd = endOfMonthUtc(subscription.nextBillingDate || issueDate);

    const existing = await tx.companySubscriptionInvoice.findFirst({
      where: {
        subscriptionId: subscription.id,
        periodStart,
        periodEnd,
      },
      select: { id: true },
    });
    if (existing) {
      return { success: false, error: "Invoice for this period already exists" };
    }

    const invoiceNumber = await generateDocumentNumber(
      "SUBSCRIPTION_INVOICE",
      "Subscription Invoice",
      "SUB-INV-",
    );

    const subtotal = new Decimal(subscription.plan.price);
    const invoice = await tx.companySubscriptionInvoice.create({
      data: {
        companyId: input.companyId,
        subscriptionId: subscription.id,
        invoiceNumber,
        periodStart,
        periodEnd,
        issueDate,
        dueDate,
        status: CompanySubscriptionInvoiceStatus.ISSUED,
        subtotal,
        taxAmount: new Decimal(0),
        totalAmount: subtotal,
        lines: {
          create: [
            {
              description: `${subscription.plan.name} (${subscription.plan.billingCycle})`,
              quantity: 1,
              unitPrice: subtotal,
              amount: subtotal,
            },
          ],
        },
      },
    });

    await tx.companySubscription.update({
      where: { id: subscription.id },
      data: { nextBillingDate: nextByBillingCycle(periodStart, subscription.plan.billingCycle) },
    });

    revalidateLocalizedPath("/admin/companies");
    return { success: true, data: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber } };
  });
}

export async function runSubscriptionAutoBillingNow() {
  await assertPlatformSuperAdmin();
  const now = new Date();
  const dueSubscriptions = await prisma.companySubscription.findMany({
    where: {
      status: CompanySubscriptionStatus.ACTIVE,
      autoRenew: true,
      nextBillingDate: { lte: now },
      planId: { not: null },
    },
    include: {
      plan: true,
    },
    take: 200,
  });

  let generated = 0;
  let skipped = 0;

  for (const subscription of dueSubscriptions) {
    const result = await generateSubscriptionInvoiceForCompany({
      companyId: subscription.companyId,
      subscriptionId: subscription.id,
    });
    if (result.success) {
      generated += 1;
    } else {
      skipped += 1;
    }
  }

  return { success: true, data: { generated, skipped } };
}

export async function markSubscriptionInvoicePaid(invoiceId: string) {
  await assertPlatformSuperAdmin();
  await prisma.companySubscriptionInvoice.update({
    where: { id: invoiceId },
    data: {
      status: CompanySubscriptionInvoiceStatus.PAID,
      paidAt: new Date(),
    },
  });
  revalidateLocalizedPath("/admin/companies");
  return { success: true };
}

export async function getPlatformSubscriptionInvoices() {
  await assertPlatformSuperAdmin();
  const rows = await prisma.companySubscriptionInvoice.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      company: {
        select: { id: true, name: true, code: true },
      },
      subscription: {
        include: {
          plan: {
            select: { name: true, code: true },
          },
        },
      },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    companyName: row.company.name,
    companyCode: row.company.code,
    planName: row.subscription.plan?.name || "-",
    status: row.status,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    totalAmount: Number(row.totalAmount),
  }));
}

export async function setCompanyStatusAsPlatformAdmin(
  companyId: string,
  status: "ACTIVE" | "SUSPENDED",
) {
  await assertPlatformSuperAdmin();
  await prisma.company.update({
    where: { id: companyId },
    data: { status },
  });
  revalidateLocalizedPath("/admin/companies");
  return { success: true };
}

export async function startCompanyImpersonation(companyId: string) {
  const session = await assertPlatformSuperAdmin();
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, status: true },
  });
  if (!company || company.status !== "ACTIVE") {
    return { success: false, error: "Company is not active" };
  }

  await prisma.companyImpersonationAudit.create({
    data: {
      actorUserId: session.userId,
      impersonatedCompanyId: companyId,
    },
  });
  await setImpersonationContext(companyId);
  revalidatePath("/", "layout");
  return { success: true };
}

export async function stopCompanyImpersonation() {
  const session = await assertPlatformSuperAdmin();
  const openAudit = await prisma.companyImpersonationAudit.findFirst({
    where: {
      actorUserId: session.userId,
      endedAt: null,
    },
    orderBy: { startedAt: "desc" },
  });
  if (openAudit) {
    await prisma.companyImpersonationAudit.update({
      where: { id: openAudit.id },
      data: { endedAt: new Date() },
    });
  }
  await clearImpersonationContext();
  revalidatePath("/", "layout");
  return { success: true };
}

export async function getMyCompanyMemberships() {
  const session = await getSession();
  if (!session?.userId) return [];

  if (session.isPlatformSuperAdmin) {
    const companies = await prisma.company.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });
    return companies.map((company) => ({
      companyId: company.id,
      companyName: company.name,
      isDefault: false,
    }));
  }

  const memberships = await prisma.companyMembership.findMany({
    where: { userId: session.userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include: {
      company: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });

  return memberships
    .filter((m) => m.company.status === "ACTIVE")
    .map((membership) => ({
      companyId: membership.company.id,
      companyName: membership.company.name,
      isDefault: membership.isDefault,
    }));
}

export async function switchMyActiveCompany(companyId: string) {
  await switchActiveCompanyContext(companyId);
  revalidatePath("/", "layout");
  return { success: true };
}
