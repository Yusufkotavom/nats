"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { departmentSchema, projectSchema } from "./schemas";
import { z } from "zod";

// --- Departments ---

export async function getDepartments() {
  return await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { manager: true },
  });
}

export async function createDepartment(data: z.infer<typeof departmentSchema>) {
  const parsed = departmentSchema.parse(data);
  const department = await prisma.department.create({
    data: parsed,
  });
  revalidatePath("/general/departments");
  return department;
}

// --- Projects ---

export async function getProjects() {
  return await prisma.project.findMany({
    orderBy: { name: "asc" },
    include: { manager: true },
  });
}

export async function createProject(data: z.infer<typeof projectSchema>) {
  const parsed = projectSchema.parse(data);
  const project = await prisma.project.create({
    data: parsed,
  });
  revalidatePath("/general/projects");
  return project;
}
