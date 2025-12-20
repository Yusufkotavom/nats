"use server";

import { prisma } from "@/lib/prisma";
import { Role } from "@/prisma/generated/prisma/enums";
import { revalidatePath } from "next/cache";

export async function getUsers() {
  return await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function createUser(data: {
  name: string;
  email: string;
  password?: string;
  role: Role;
}) {
  try {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password || "password123", // Default password if not provided
        role: data.role,
      },
    });
    revalidatePath("/admin/users");
    return { success: true, user };
  } catch (error) {
    console.error("Failed to create user:", error);
    return { success: false, error: "Failed to create user" };
  }
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    email?: string;
    role?: Role;
    password?: string;
  }
) {
  try {
    const updateData: {
      name?: string;
      email?: string;
      role?: Role;
      password?: string;
    } = { ...data };
    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) =>
        updateData[key as keyof typeof updateData] === undefined &&
        delete updateData[key as keyof typeof updateData]
    );

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });
    revalidatePath("/admin/users");
    return { success: true, user };
  } catch (error) {
    console.error("Failed to update user:", error);
    return { success: false, error: "Failed to update user" };
  }
}

export async function deleteUser(id: string) {
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
