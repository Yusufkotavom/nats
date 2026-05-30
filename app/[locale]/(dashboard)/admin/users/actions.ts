"use server";

import { prisma } from "@/lib/prisma";
import { revalidateLocalizedPath } from "@/lib/revalidate-localized-path";
import bcrypt from "bcryptjs";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { requireActiveCompanyContext } from "@/lib/company-context";
import { canManagePlatformRole } from "@/lib/auth/platform-role-guard";

interface UserCreateData {
  name: string;
  email: string;
  password?: string;
  roleId: string;
}

interface UserUpdateData {
  name?: string;
  email?: string;
  password?: string;
  roleId?: string;
}

export async function getUsers(page: number, limit: number) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "users.edit")) {
    return { data: [], total: 0, totalPages: 0 };
  }
  const { companyId } = await requireActiveCompanyContext();
  const skip = (page - 1) * limit;

  const [memberships, total] = await Promise.all([
    prisma.companyMembership.findMany({
      where: { companyId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            role: {
              select: {
                name: true,
                id: true,
              },
            },
          },
        },
      },
    }),
    prisma.companyMembership.count({ where: { companyId } }),
  ]);

  const data = memberships.map((membership) => membership.user);

  return { data, total, totalPages: Math.ceil(total / limit) };
}

export async function getRoles() {
  const session = await getSession();
  if (!session || (!hasPermission(session.permissions, "users.create") && !hasPermission(session.permissions, "users.edit"))) {
    return [];
  }

  return prisma.role.findMany({
    where: session.isPlatformSuperAdmin ? undefined : { name: { not: "superadmin" } },
    select: {
      id: true,
      name: true,
      description: true,
    },
  });
}

export const createUser = authorizedAction(
  "users.create",
  async (data: UserCreateData) => {
    try {
      const session = await getSession();
      if (!session) {
        return { success: false, error: "Unauthorized" };
      }
      const { companyId } = await requireActiveCompanyContext();
      if (!data.name) {
        return { success: false, error: "Name is required" };
      }
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return { success: false, error: "Invalid email" };
      }
      if (!data.roleId) {
        return { success: false, error: "Role is required" };
      }
      if (data.password && data.password.length < 6) {
        return {
          success: false,
          error: "Password must be at least 6 characters",
        };
      }

      const targetRole = await prisma.role.findUnique({
        where: { id: data.roleId },
        select: { name: true },
      });
      if (!targetRole) {
        return { success: false, error: "Role not found" };
      }
      if (!canManagePlatformRole(session.isPlatformSuperAdmin, targetRole.name)) {
        return { success: false, error: "Forbidden: cannot assign platform superadmin role" };
      }

      const hashedPassword = await bcrypt.hash(
        data.password || "password123",
        10
      );

      const user = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            name: data.name,
            email: data.email,
            password: hashedPassword,
            roleId: data.roleId,
          },
        });
        await tx.companyMembership.create({
          data: {
            companyId,
            userId: createdUser.id,
            isDefault: false,
          },
        });
        return createdUser;
      });
      revalidateLocalizedPath("/admin/users");
      return { success: true, data: user };
    } catch (error) {
      console.error("Failed to create user:", error);
      return { success: false, error: "Failed to create user" };
    }
  }
);

export const updateUser = authorizedAction(
  "users.edit",
  async (id: string, data: UserUpdateData) => {
    try {
      const session = await getSession();
      if (!session) {
        return { success: false, error: "Unauthorized" };
      }
      const { companyId } = await requireActiveCompanyContext();
      const membership = await prisma.companyMembership.findUnique({
        where: { companyId_userId: { companyId, userId: id } },
        select: { id: true },
      });
      if (!membership) {
        return { success: false, error: "User not found in active company" };
      }

      if (data.name !== undefined && !data.name) {
        return { success: false, error: "Name cannot be empty" };
      }
      if (
        data.email !== undefined &&
        (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      ) {
        return { success: false, error: "Invalid email" };
      }
      if (data.password && data.password.length < 6) {
        return {
          success: false,
          error: "Password must be at least 6 characters",
        };
      }

      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: {
          role: {
            select: { name: true },
          },
        },
      });
      if (!existingUser) {
        return { success: false, error: "User not found" };
      }
      if (!canManagePlatformRole(session.isPlatformSuperAdmin, existingUser.role?.name)) {
        return { success: false, error: "Forbidden: cannot edit platform superadmin user" };
      }

      if (data.roleId) {
        const targetRole = await prisma.role.findUnique({
          where: { id: data.roleId },
          select: { name: true },
        });
        if (!targetRole) {
          return { success: false, error: "Role not found" };
        }
        if (!canManagePlatformRole(session.isPlatformSuperAdmin, targetRole.name)) {
          return { success: false, error: "Forbidden: cannot assign platform superadmin role" };
        }
      }

       
      const updateData: any = { ...data };

      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
      } else {
        delete updateData.password;
      }

      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key]
      );

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
      });
      revalidateLocalizedPath("/admin/users");
      return { success: true, data: user };
    } catch (error) {
      console.error("Failed to update user:", error);
      return { success: false, error: "Failed to update user" };
    }
  }
);

export const deleteUser = authorizedAction(
  "users.delete",
  async (id: string) => {
    try {
      const session = await getSession();
      if (!session) {
        return { success: false, error: "Unauthorized" };
      }
      const { companyId } = await requireActiveCompanyContext();
      const target = await prisma.user.findUnique({
        where: { id },
        select: {
          role: {
            select: { name: true },
          },
        },
      });
      if (!target) {
        return { success: false, error: "User not found" };
      }
      if (!canManagePlatformRole(session.isPlatformSuperAdmin, target.role?.name)) {
        return { success: false, error: "Forbidden: cannot delete platform superadmin user" };
      }
      await prisma.$transaction(async (tx) => {
        await tx.companyMembership.deleteMany({
          where: { companyId, userId: id },
        });
        const remaining = await tx.companyMembership.count({
          where: { userId: id },
        });
        if (remaining === 0) {
          await tx.user.delete({
            where: { id },
          });
        }
      });
      revalidateLocalizedPath("/admin/users");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete user:", error);
      return { success: false, error: "Failed to delete user" };
    }
  }
);
