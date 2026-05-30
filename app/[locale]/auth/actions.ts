"use server";

import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db-retry";
import { compare, hash } from "bcryptjs";
import { createSession, deleteSession, resolveUserCompanyContext } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

async function resetPrismaConnection() {
  await prisma.$disconnect();
  await prisma.$connect();
}

export async function login(prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const errors: { email?: string[]; password?: string[] } = {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = ["Invalid email address"];
  }

  if (!password || password.length < 1) {
    errors.password = ["Password is required"];
  }

  if (Object.keys(errors).length > 0) {
    return {
      errors,
    };
  }

  let user: Awaited<ReturnType<typeof prisma.user.findUnique>> | null = null;
  try {
    user = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { email },
      }),
      {
        onRetry: resetPrismaConnection,
      },
    );
  } catch (error) {
    console.error("login user lookup failed:", error);
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

  if (!user) {
    return {
      errors: {
        email: ["User is not registered"],
      },
    };
  }

  const passwordsMatch = await compare(password, user.password);

  if (!passwordsMatch) {
    return {
      errors: {
        email: ["Invalid email or password"],
      },
    };
  }

  const role = await withDbRetry(
    () =>
      prisma.role.findUnique({
        where: { id: user.roleId },
      }),
    {
      onRetry: resetPrismaConnection,
    },
  );

  if (!role || !role.isActive) {
    return {
      errors: {
        email: [
          "Your account or role has been deactivated. Please contact support.",
        ],
      },
    };
  }

  let activeRole = role;

  if (activeRole.name === "company_admin" && !activeRole.permissions.includes("*")) {
    const healedRole = await prisma.role.update({
      where: { id: activeRole.id },
      data: { permissions: ["*"], isActive: true },
    });
    activeRole = healedRole;
  }

  const isPlatformSuperAdmin = activeRole.name === "superadmin";
  const { activeCompanyId } = await resolveUserCompanyContext(user.id);

  if (!isPlatformSuperAdmin && !activeCompanyId) {
    return {
      errors: {
        email: [
          "Account is not assigned to any active company. Please contact platform administrator.",
        ],
      },
    };
  }

  await createSession(user.id, user.name, activeRole, {
    activeCompanyId,
    isPlatformSuperAdmin,
  });

  if (activeRole.name === "Cashier") {
    redirect("/pos");
  }

  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
}

export async function loginDemo() {
  const email = "demo@nats-accounting.com";
  const password = "demo-password-123";

  let user = await prisma.user.findUnique({
    where: { email },
  });

  const superAdminRole = await prisma.role.findUnique({
    where: { name: "superadmin" },
  });

  if (!superAdminRole) {
    throw new Error("System configuration error: superadmin role not found");
  }

  if (!user) {
    const hashedPassword = await hash(password, 10);
    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: "Demo Admin",
        roleId: superAdminRole.id,
      },
    });
  }

  const userRole = await prisma.role.findUnique({
    where: { id: user.roleId },
  });
  if (!userRole) {
    throw new Error("Role is missing for demo user");
  }

  const { activeCompanyId } = await resolveUserCompanyContext(user.id);
  await createSession(user.id, user.name, userRole, {
    activeCompanyId,
    isPlatformSuperAdmin: userRole.name === "superadmin",
  });
  redirect("/dashboard");
}
