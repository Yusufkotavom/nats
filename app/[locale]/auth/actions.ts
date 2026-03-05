"use server";

import { managementPrisma } from "@/lib/prisma/tenant";
import { compare } from "bcryptjs";
import { createSession } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { deleteSession } from "@/lib/auth/auth";
import { hash } from "bcryptjs";
import { provisionTenantDatabase } from "@/app/management/(admin)/tenants/actions";
import { seedDemoDatabase } from "@/lib/demo-seeder";
import { SubscriptionType } from "@/prisma/generated/management-client";

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

  console.log({ user })

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

  const activeMembership = user.tenantMembers.find(
    (m: any) => m.isActive && m.tenant.isActive && m.tenant.slug !== "default"
  );

  if (!activeMembership) {
    return {
      errors: {
        email: [
          "Your account or workplace has been deactivated. Please contact support.",
        ],
      },
    };
  }

  await createSession(user.id, activeMembership.tenantId, activeMembership.role);

  if (activeMembership.role.name === "Cashier") {
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
  const tenantSlug = "demo-company";

  let user = await managementPrisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const hashedPassword = await hash(password, 10);
    user = await managementPrisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: "Demo Admin",
      },
    });
  }

  let tenant = await managementPrisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });

  const superAdminRole = await managementPrisma.role.findUnique({
    where: { name: "superadmin" },
  });

  if (!superAdminRole) {
    throw new Error("System configuration error: superadmin role not found");
  }

  let isNewTenant = false;

  if (!tenant) {
    tenant = await managementPrisma.tenant.create({
      data: {
        name: "NATS Demo Company",
        slug: tenantSlug,
        companyName: "NATS Demo Company",
        email,
        isActive: true,
        subscription: SubscriptionType.PREMIUM,
      },
    });

    await managementPrisma.tenantMember.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        roleId: superAdminRole.id,
      },
    });

    isNewTenant = true;
  } else {
    // Ensure membership exists
    const membership = await managementPrisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } }
    });

    if (!membership) {
      await managementPrisma.tenantMember.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          roleId: superAdminRole.id,
        },
      });
    }
  }

  // Reload user to get membership
  const updatedUser = await managementPrisma.user.findUnique({
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

  const activeMembership = updatedUser?.tenantMembers.find(
    (m: any) => m.isActive && m.tenant.isActive && m.tenant.slug === tenantSlug
  );

  if (!activeMembership || !activeMembership.tenantId) {
    throw new Error("Demo membership could not be resolved.");
  }

  if (isNewTenant) {
    console.log("Provisioning database for demo tenant...");
    const provisionResult = await provisionTenantDatabase(tenant.id);
    if (!provisionResult.success) {
      console.error("Failed to provision database:", provisionResult.error);
      throw new Error("Failed to provision demo database");
    }

    console.log("Seeding demo database...");
    await seedDemoDatabase(tenant.id, user.id);
  }

  await createSession(user.id, activeMembership.tenantId, activeMembership.role);
  redirect("/dashboard");
}
