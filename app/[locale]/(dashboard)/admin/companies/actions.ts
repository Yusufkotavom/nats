"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  clearImpersonationContext,
  getSession,
  setImpersonationContext,
  switchActiveCompanyContext,
} from "@/lib/auth/auth";

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
    const company = await tx.company.create({
      data: {
        code,
        name,
        createdById: session.userId,
      },
    });

    await tx.companyProfile.create({
      data: {
        companyId: company.id,
        name,
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
  });

  revalidatePath("/admin/companies");
  return { success: true };
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
  revalidatePath("/admin/companies");
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

