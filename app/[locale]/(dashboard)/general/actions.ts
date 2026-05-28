"use server";

import { prisma } from "@/lib/prisma";
import { revalidateLocalizedPath } from "@/lib/revalidate-localized-path";
import { departmentSchema, projectSchema } from "./schemas";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { requireActiveCompanyContext } from "@/lib/company-context";

async function getDimensionVisibility() {
  const { companyId } = await requireActiveCompanyContext();
  const profile = await prisma.companyProfile.findUnique({
    where: { companyId },
    select: {
      enableDepartmentDimension: true,
      enableProjectDimension: true,
    },
  });

  return {
    enableDepartmentDimension: profile?.enableDepartmentDimension ?? false,
    enableProjectDimension: profile?.enableProjectDimension ?? false,
  };
}

// --- Departments ---

export async function getDepartments() {
  const { enableDepartmentDimension } = await getDimensionVisibility();
  if (!enableDepartmentDimension) {
    return [];
  }

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
    revalidateLocalizedPath("/general/departments");
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
      revalidateLocalizedPath("/general/departments");
      return { success: true, data: department };
    } catch (error) {
      console.error("Failed to update department:", error);
      return { success: false, error: t("update_error") };
    }
  },
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
      revalidateLocalizedPath("/general/departments");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete department:", error);
      return { success: false, error: t("delete_error") };
    }
  },
);

// --- Projects ---

export async function getProjects(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const { enableProjectDimension } = await getDimensionVisibility();
  if (!enableProjectDimension) {
    return { projects: [], total: 0 };
  }

  const { page = 1, pageSize = 20, search } = params || {};
  const skip = (page - 1) * pageSize;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { code: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.project.count({ where }),
  ]);

  return { projects, total };
}

export async function createProject(data: z.infer<typeof projectSchema>) {
  const t = await getTranslations("General.Projects");
  try {
    const parsed = projectSchema.parse(data);
    const project = await prisma.project.create({
      data: parsed,
    });
    revalidateLocalizedPath("/general/projects");
    return { success: true, data: project };
  } catch (error) {
    console.error("Failed to create project:", error);
    return { success: false, error: t("create_error") };
  }
}

export const updateProject = authorizedAction(
  "projects.edit",
  async (id: string, data: z.infer<typeof projectSchema>) => {
    const t = await getTranslations("General.Projects");
    try {
      const parsed = projectSchema.parse(data);
      const project = await prisma.project.update({
        where: { id },
        data: parsed,
      });
      revalidateLocalizedPath("/general/projects");
      return { success: true, data: project };
    } catch (error) {
      console.error("Failed to update project:", error);
      return { success: false, error: t("update_error") };
    }
  },
);

export const deleteProject = authorizedAction(
  "projects.delete",
  async (id: string) => {
    const t = await getTranslations("General.Projects");
    try {
      await prisma.project.delete({
        where: { id },
      });
      revalidateLocalizedPath("/general/projects");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete project:", error);
      return { success: false, error: t("delete_error") };
    }
  },
);
