"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { authorizedAction } from "@/lib/permissions/protected-action";

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
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: {
          select: {
            name: true,
            id: true,
          },
        },
        createdAt: true,
      },
    }),
    prisma.user.count(),
  ]);

  return { users, total, totalPages: Math.ceil(total / limit) };
}

export async function getRoles() {
  return prisma.role.findMany({
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

      const hashedPassword = await bcrypt.hash(
        data.password || "password123",
        10
      );

      const user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          role: {
            connect: { id: data.roleId },
          },
        },
      });
      revalidatePath("/admin/users");
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = { ...data };
      delete updateData.roleId;

      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
      } else {
        delete updateData.password;
      }

      if (data.roleId) {
        updateData.role = {
          connect: { id: data.roleId },
        };
      }

      // Remove undefined fields
      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key]
      );

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
      });
      revalidatePath("/admin/users");
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
      await prisma.user.delete({
        where: { id },
      });
      revalidatePath("/admin/users");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete user:", error);
      return { success: false, error: "Failed to delete user" };
    }
  }
);
