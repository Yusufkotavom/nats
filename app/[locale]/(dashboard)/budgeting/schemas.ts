
import { z } from "zod";
import { BudgetStatus, ApprovalStatus } from "@/prisma/generated/prisma/client";

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
  kind: z.enum(["BUDGET", "SAVING_TARGET"]).default("BUDGET"),
  fiscalYear: z.number().int().min(2000).max(2100),
  periodStart: z.coerce.date().optional().nullable(),
  periodEnd: z.coerce.date().optional().nullable(),
  description: z.string().optional(),
  departmentId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
  totalAmount: z.number().min(0).default(0),
  items: z.array(budgetItemSchema).default([]),
}).refine(
  (data) => {
    if (!data.periodStart || !data.periodEnd) return true;
    return data.periodEnd >= data.periodStart;
  },
  {
    path: ["periodEnd"],
    message: "Period end must be after period start",
  },
);

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
