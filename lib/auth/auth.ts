import { cookies } from "next/headers";
import { redirect } from "@/i18n/routing";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "./session-token";

export async function createSession(
  userId: string,
  userName: string,
  role: { id: string; name: string; permissions: string[] },
  options?: {
    activeCompanyId?: string | null;
    isPlatformSuperAdmin?: boolean;
    impersonatedCompanyId?: string | null;
  },
) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const isPlatformSuperAdmin = options?.isPlatformSuperAdmin ?? role.name === "superadmin";
  const session = await encrypt({
    userId,
    userName,
    roleId: role.id,
    role: role.name,
    permissions: role.permissions,
    activeCompanyId: options?.activeCompanyId ?? null,
    isPlatformSuperAdmin,
    impersonatedCompanyId: options?.impersonatedCompanyId ?? null,
    expiresAt,
  });
  const cookieStore = await cookies();

  cookieStore.set("session", session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const payload = await decrypt(session);

  if (!session || !payload) {
    return null;
  }

  return {
    isAuth: true,
    userId: payload.userId,
    userName: payload.userName,
    roleId: payload.roleId,
    role: payload.role,
    permissions: payload.permissions,
    activeCompanyId: payload.impersonatedCompanyId || payload.activeCompanyId || null,
    baseCompanyId: payload.activeCompanyId || null,
    impersonatedCompanyId: payload.impersonatedCompanyId || null,
    isPlatformSuperAdmin: Boolean(payload.isPlatformSuperAdmin),
  };
}

export async function verifySession() {
  const session = await getSession();

  if (!session) {
    const locale = await getLocale();
    redirect({ href: "/auth", locale });
  }

  return session!;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function resolveUserCompanyContext(userId: string) {
  const memberships = await prisma.companyMembership.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: {
      companyId: true,
      company: {
        select: {
          status: true,
        },
      },
    },
  });

  const activeMembership = memberships.find((m) => m.company.status === "ACTIVE");
  return {
    activeCompanyId: activeMembership?.companyId ?? null,
  };
}

export async function setImpersonationContext(companyId: string) {
  const session = await getSession();
  if (!session || !session.isPlatformSuperAdmin) {
    throw new Error("Unauthorized");
  }

  const role = await prisma.role.findUnique({
    where: { id: session.roleId },
    select: { id: true, name: true, permissions: true },
  });
  if (!role) throw new Error("Role not found");

  await createSession(session.userId, session.userName, role, {
    activeCompanyId: session.baseCompanyId,
    isPlatformSuperAdmin: session.isPlatformSuperAdmin,
    impersonatedCompanyId: companyId,
  });
}

export async function clearImpersonationContext() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const role = await prisma.role.findUnique({
    where: { id: session.roleId },
    select: { id: true, name: true, permissions: true },
  });
  if (!role) throw new Error("Role not found");

  await createSession(session.userId, session.userName, role, {
    activeCompanyId: session.baseCompanyId,
    isPlatformSuperAdmin: session.isPlatformSuperAdmin,
    impersonatedCompanyId: null,
  });
}

export async function requireActiveCompanyId() {
  const session = await verifySession();
  if (!session.activeCompanyId) {
    throw new Error("No active company selected");
  }
  return session.activeCompanyId;
}

export async function switchActiveCompanyContext(companyId: string) {
  const session = await verifySession();
  const role = await prisma.role.findUnique({
    where: { id: session.roleId },
    select: { id: true, name: true, permissions: true },
  });
  if (!role) throw new Error("Role not found");

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, status: true },
  });
  if (!company || company.status !== "ACTIVE") {
    throw new Error("Company is not active");
  }

  if (!session.isPlatformSuperAdmin) {
    const membership = await prisma.companyMembership.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: session.userId,
        },
      },
      select: { id: true },
    });
    if (!membership) {
      throw new Error("Forbidden: no access to selected company");
    }
  }

  await createSession(session.userId, session.userName, role, {
    activeCompanyId: companyId,
    isPlatformSuperAdmin: session.isPlatformSuperAdmin,
    impersonatedCompanyId: null,
  });
}
