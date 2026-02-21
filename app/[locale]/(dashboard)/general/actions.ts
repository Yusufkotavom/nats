"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { departmentSchema, projectSchema } from "./schemas";
import { z } from "zod";
import { getTranslations } from "next-intl/server";

// --- Departments ---

export async function getDepartments() {
  return await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { manager: true },
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

// --- Projects ---

export async function getProjects() {
  return await prisma.project.findMany({
    orderBy: { name: "asc" },
    include: { manager: true },
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
