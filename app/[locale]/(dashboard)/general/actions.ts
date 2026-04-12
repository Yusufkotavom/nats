"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { departmentSchema, projectSchema } from "./schemas";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { authorizedAction } from "@/lib/permissions/protected-action";

// --- Departments ---

export async function getDepartments() {
  return await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}


export async function createDepartment(data: z.infer<typeof departmentSchema>) {
  const t = await getTranslations("General.Departments");
  try {
    const parsed = departmentSchema.parse(data);
    const department = await prisma.department.create({
      data: parsed,
    });
    revalidatePath("/general/departments");
    return { success: true, data: department };
  } catch (error) {
    console.error("Failed to create department:", error);
    return { success: false, error: t("create_error") };
  }
}

export const updateDepartment = authorizedAction(
  "departments.edit",
  async (id: string, data: z.infer<typeof departmentSchema>) => {
    const t = await getTranslations("General.Departments");
    try {
      const parsed = departmentSchema.parse(data);
      const department = await prisma.department.update({
        where: { id },
        data: parsed,
      });
      revalidatePath("/general/departments");
      return { success: true, data: department };
    } catch (error) {
      console.error("Failed to update department:", error);
      return { success: false, error: t("update_error") };
    }
  }
);

export const deleteDepartment = authorizedAction(
  "departments.delete",
  async (id: string) => {
    const t = await getTranslations("General.Departments");
    try {
      await prisma.department.update({
        where: { id },
        data: { isActive: false },
      });
      revalidatePath("/general/departments");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete department:", error);
      return { success: false, error: t("delete_error") };
    }
  }
);

// --- Projects ---

export async function getProjects() {
  return await prisma.project.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createProject(data: z.infer<typeof projectSchema>) {
  const t = await getTranslations("General.Projects");
  try {
    const parsed = projectSchema.parse(data);
    const project = await prisma.project.create({
      data: parsed,
    });
    revalidatePath("/general/projects");
    return { success: true, data: project };
  } catch (error) {
    console.error("Failed to create project:", error);
    return { success: false, error: t("create_error") };
  }
}
