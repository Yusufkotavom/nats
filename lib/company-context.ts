import { getSession, verifySession } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";

export async function getActiveCompanyContext() {
  const session = await getSession();
  if (!session?.activeCompanyId) {
    return null;
  }

  const company = await prisma.company.findUnique({
    where: { id: session.activeCompanyId },
    include: {
      profile: true,
    },
  });

  if (!company || company.status !== "ACTIVE") {
    return null;
  }

  return {
    companyId: company.id,
    companyName: company.name,
    profile: company.profile,
    isImpersonating: Boolean(session.impersonatedCompanyId),
    impersonatedCompanyId: session.impersonatedCompanyId,
  };
}

export async function requireActiveCompanyContext() {
  const session = await verifySession();
  if (!session.activeCompanyId) {
    throw new Error("No active company selected");
  }

  const company = await prisma.company.findUnique({
    where: { id: session.activeCompanyId },
    include: {
      profile: true,
    },
  });
  if (!company || company.status !== "ACTIVE") {
    throw new Error("Active company is not available");
  }

  return {
    session,
    companyId: company.id,
    companyName: company.name,
    profile: company.profile,
  };
}

