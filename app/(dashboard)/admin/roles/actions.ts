"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { authorizedAction } from "@/lib/auth/protected-action";

interface RoleData {
  name: string;
  description?: string;
  permissions: string[];
  isActive?: boolean;
}

export const createRole = authorizedAction(
  "roles:create",
  async (data: RoleData) => {
    if (!data.name) {
      return { success: false, error: "Name is required" };
    }
    if (!data.permissions || data.permissions.length === 0) {
      return { success: false, error: "At least one permission is required" };
    }

    const isActive = data.isActive ?? true;

    const existing = await prisma.role.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      return { success: false, error: "Role with this name already exists" };
    }

    await prisma.role.create({
      data: {
        ...data,
        isActive,
      },
    });

    revalidatePath("/admin/roles");
    return { success: true };
  }
);

export const updateRole = authorizedAction(
  "roles:update",
  async (id: string, data: RoleData) => {
    if (!data.name) {
      return { success: false, error: "Name is required" };
    }
    if (!data.permissions || data.permissions.length === 0) {
      return { success: false, error: "At least one permission is required" };
    }

    const isActive = data.isActive ?? true;

    const existing = await prisma.role.findUnique({
      where: { name: data.name },
    });

    if (existing && existing.id !== id) {
      return { success: false, error: "Role with this name already exists" };
    }

    await prisma.role.update({
      where: { id },
      data: {
        ...data,
        isActive,
      },
    });

    revalidatePath("/admin/roles");
    return { success: true };
  }
);

export const toggleRoleStatus = authorizedAction(
  "roles:update",
  async (id: string) => {
    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      return { success: false, error: "Role not found" };
    }

    if (role.name === "superadmin") {
      return { success: false, error: "Cannot deactivate superadmin role" };
    }

    await prisma.role.update({
      where: { id },
      data: { isActive: !role.isActive },
    });

    revalidatePath("/admin/roles");
    return { success: true };
  }
);

export const deleteRole = authorizedAction(
  "roles:delete",
  async (id: string) => {
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      return { success: false, error: "Role not found" };
    }

    if (role.name === "superadmin") {
      return { success: false, error: "Cannot delete superadmin role" };
    }

    if (role._count.users > 0) {
      return {
        success: false,
        error:
          "Cannot delete role with assigned users. Please reassign them first.",
      };
    }

    await prisma.role.delete({
      where: { id },
    });

    revalidatePath("/admin/roles");
    return { success: true };
  }
);
