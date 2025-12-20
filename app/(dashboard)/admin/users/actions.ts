"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { authorizedAction } from "@/lib/protected-action";
import { z } from "zod";

const UserCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  roleId: z.string(),
});

const UserUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  roleId: z.string().optional(),
});

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
  async (data: z.infer<typeof UserCreateSchema>) => {
    try {
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
  async (id: string, data: z.infer<typeof UserUpdateSchema>) => {
    try {
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
