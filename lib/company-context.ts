import { getSession, verifySession } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";

export async function getActiveCompanyContext() {
  const session = await getSession();
  if (!session?.activeCompanyId) {
    return null;
  }

  try {
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
  } catch (error) {
    console.error("getActiveCompanyContext company lookup failed:", error);
    return null;
  }
}

export async function requireActiveCompanyContext() {
  const session = await verifySession();
  if (!session.activeCompanyId) {
    throw new Error("No active company selected");
  }

  try {
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
  } catch (error) {
    console.error("requireActiveCompanyContext company lookup failed:", error);
    throw new Error("Active company is temporarily unavailable");
  }
}
