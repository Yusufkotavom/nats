
import { z } from "zod";
import { BudgetStatus, ApprovalStatus } from "@/prisma/generated/prisma/client";

export const departmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  managerId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const projectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  managerId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ON_HOLD", "CANCELLED"]).default("ACTIVE"),
});

export const budgetItemSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  totalAmount: z.number().min(0),
  january: z.number().default(0),
  february: z.number().default(0),
  march: z.number().default(0),
  april: z.number().default(0),
  may: z.number().default(0),
  june: z.number().default(0),
  july: z.number().default(0),
  august: z.number().default(0),
  september: z.number().default(0),
  october: z.number().default(0),
  november: z.number().default(0),
  december: z.number().default(0),
});

export const budgetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  fiscalYear: z.number().int().min(2000).max(2100),
  description: z.string().optional(),
  departmentId: z.string().optional(),
  projectId: z.string().optional(),
  items: z.array(budgetItemSchema).default([]),
});

export const budgetRevisionSchema = z.object({
  budgetId: z.string().min(1),
  description: z.string().optional(),
  changes: z.any(), // JSON
});

export const budgetApprovalSchema = z.object({
  budgetId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
  comments: z.string().optional(),
});
