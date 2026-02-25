"use server";

import { managementPrisma } from "@/lib/prisma/tenant";
import { compare } from "bcryptjs";
import { createSession } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { deleteSession } from "@/lib/auth/auth";

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

  if (!user) {
    return {
      errors: {
        email: ["Invalid email or password"],
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
