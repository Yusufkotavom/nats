"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";
import { EntryStatus } from "@/prisma/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { getSession } from "@/lib/auth/auth";
import { CreateJournalEntryData } from "../types";
import { getPaginationMetadata } from "@/lib/pagination";
import { SuperJSON } from "@/lib/superjson";
import { Decimal } from "decimal.js";
import { SuperJSONResult } from "superjson";

/**
 * Fetch journal entries with pagination and filtering.
 * Permission: "journal_entries.view"
 *
 * @param page      - Page number (default: 1)
 * @param pageSize  - Items per page (default: 20)
 * @param startDate - Optional start date filter
 * @param endDate   - Optional end date filter
 * @param status    - Optional status filter ("draft", "posted", "all")
 * @param search    - Optional search string for description or entry number
 *
 * @returns - Object containing entries and pagination metadata
 */
export const getJournalEntries = authorizedAction(
  "journal_entries.view",
  async ({
    page = 1,
    pageSize = 20,
    startDate,
    endDate,
    status,
    search,
  }: {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
  }) => {
    const where: Prisma.JournalEntryWhereInput = {};
    if (status && status !== "all") {
      where.status = status as unknown as EntryStatus;
    }
    if (startDate) {
      where.transactionDate = {
        ...((where.transactionDate as unknown as Prisma.DateTimeFilter) || {}),
        gte: new Date(startDate),
      };
    }
    if (endDate) {
      where.transactionDate = {
        ...((where.transactionDate as unknown as Prisma.DateTimeFilter) || {}),
        lte: new Date(endDate),
      };
    }
    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { entryNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * pageSize;
    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        orderBy: { postedAt: "desc" },
        include: {
          lines: {
            include: {
              account: true,
              contact: true,
              department: true,
              project: true,
            },
            orderBy: { lineNumber: "asc" },
          },
          user: {
            select: { name: true, email: true },
          },
          attachments: true,
        },
        skip,
        take: pageSize,
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: SuperJSON.serialize(entries),
        pagination: getPaginationMetadata(total, page, pageSize),
      },
    };
  },
);

/**
 * Fetch a single journal entry by ID.
 * Permission: "journal_entries.view"
 *
 * @param id - The ID of the journal entry
 * @returns - Object containing the journal entry with lines, user, and attachments
 */
export const getJournalEntry = authorizedAction(
  "journal_entries.view",
  async (id: string) => {
    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            account: { select: { name: true, code: true } },
            contact: { select: { name: true } },
            department: { select: { name: true } },
            project: { select: { name: true } },
          },
          orderBy: { lineNumber: "asc" },
        },
        user: {
          select: { name: true, email: true },
        },
        attachments: true,
      },
    });
    if (!entry) return { success: false, error: "Journal entry not found" };

    return { success: true, data: SuperJSON.serialize(entry) };
  },
);

/**
 * Create a new journal entry.
 * Permission: "journal_entries.create"
 *
 * @param data - The journal entry data including lines and attachments
 * @returns - Object containing the created entry or error
 */
import { createJournalEntrySchema } from "@/lib/validation/schemas";

export const createJournalEntry = authorizedAction(
  "journal_entries.create",
  async (rawData: SuperJSONResult) => {
    try {
      const data2 = SuperJSON.deserialize(
        rawData as unknown as unknown as SuperJSONResult,
      ) as unknown as CreateJournalEntryData;

      const parseResult = createJournalEntrySchema.safeParse(data2);
      if (!parseResult.success) {
        return { success: false, error: parseResult.error.message };
      }
      const data = parseResult.data;

      const user = await getSession();

      if (!user?.userId) {
        return { success: false, error: "User not authenticated" };
      }

      // Validate debit = credit
      const totalDebit =
        data.lines.reduce(
          (sum, line) =>
            sum +
            (line?.debitAmount || 0),
          0,
        ) || 0;
      const totalCredit =
        data.lines.reduce(
          (sum, line) =>
            sum +
            (line?.creditAmount || 0),
          0,
        ) || 0;

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        // Floating point tolerance
        return { success: false, error: "Debits must equal credits" };
      }

      const dateStr = data.transactionDate
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");
      const count = await prisma.journalEntry.count({
        where: {
          entryNumber: {
            startsWith: `JE-${dateStr}-`,
          },
        },
      });
      const entryNumber = `JE-${dateStr}-${(count + 1)
        .toString()
        .padStart(4, "0")}`;

      const entry = await prisma.journalEntry.create({
        data: {
          userId: user?.userId,
          entryNumber,
          transactionDate: data.transactionDate || new Date(),
          description: data.description,
          notes: data.notes,
          status: "draft",
          lines: {
            create: data.lines.map((line, index) => ({
              accountId: line.accountId,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              description: line.description,
              contactId: line.contactId,
              departmentId: line.departmentId,
              projectId: line.projectId,
              lineNumber: index + 1,
            })),
          },
          attachments: data.attachments?.length
            ? {
              connect: data.attachments.map((a) => ({ id: a.id })),
            }
            : undefined,
        },
      });

      // Need to refetch to include relations or just return what we have with IDs?
      // The UI might expect relations if it adds it to the list, but typically it redirects.
      // However, createJournalEntry returns 'entry' which has no lines loaded (or they are in a different format).
      // The create call returns the created object.

      // Let's refetch to be safe and consistent with getJournalEntry
      const createdEntry = await prisma.journalEntry.findUnique({
        where: { id: entry.id },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
          user: {
            select: { name: true, email: true },
          },
          attachments: true,
        },
      });

      if (!createdEntry) throw new Error("Failed to fetch created entry");

      revalidatePath("/accounting/journal-entries");
      return { success: true, data: SuperJSON.serialize(entry) };
    } catch (error) {
      console.error("Failed to create journal entry:", error);
      return { success: false, error: "Failed to create journal entry" };
    }
  },
);

export async function updateJournalEntry(
  id: string,
  data: CreateJournalEntryData | SuperJSONResult,
) {
  try {
    const existingEntry = await prisma.journalEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return { success: false, error: "Journal entry not found" };
    }

    if (existingEntry.status === "posted") {
      return { success: false, error: "Cannot edit posted journal entries" };
    }

    // Validate debit = credit
    const data2 = SuperJSON.deserialize(
      data as unknown as SuperJSONResult,
    ) as CreateJournalEntryData;
    const totalDebit =
      data2?.lines.reduce(
        (sum, line) =>
          sum +
          (line?.debitAmount instanceof Decimal
            ? line.debitAmount.toNumber()
            : Number(line?.debitAmount || 0)),
        0,
      ) || 0;
    const totalCredit =
      data2?.lines.reduce(
        (sum, line) =>
          sum +
          (line?.creditAmount instanceof Decimal
            ? line.creditAmount.toNumber()
            : Number(line?.creditAmount || 0)),
        0,
      ) || 0;

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return { success: false, error: "Debits must equal credits" };
    }

    // Transaction to update
    await prisma.$transaction(async (tx) => {
      // Delete existing lines
      await tx.journalEntryLine.deleteMany({
        where: { journalEntryId: id },
      });

      // Update entry and create new lines
      await tx.journalEntry.update({
        where: { id },
        data: {
          transactionDate: data2?.transactionDate,
          description: data2?.description,
          lines: {
            create: data2?.lines.map((line, index) => ({
              accountId: line.accountId,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              description: line.description,
              contactId: line.contactId,
              departmentId: line.departmentId,
              projectId: line.projectId,
              lineNumber: index + 1,
            })),
          },
          attachments: {
            set: data2?.attachments?.map((a) => ({ id: a.id })) || [],
          },
        },
      });
    });

    revalidatePath("/accounting/journal-entries");
    revalidatePath(`/accounting/journal-entries/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update journal entry:", error);
    return { success: false, error: "Failed to update journal entry" };
  }
}

/**
 * Delete a journal entry.
 * Cannot delete if the entry is already posted.
 *
 * @param id - The ID of the entry to delete
 * @returns  - Success flag or error
 */
export async function deleteJournalEntry(id: string) {
  try {
    const existingEntry = await prisma.journalEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return { success: false, error: "Journal entry not found" };
    }

    if (existingEntry.status === "posted") {
      return { success: false, error: "Cannot delete posted journal entries" };
    }

    await prisma.journalEntryLine.deleteMany({
      where: { journalEntryId: id },
    });

    await prisma.journalEntry.delete({
      where: { id },
    });

    revalidatePath("/accounting/journal-entries");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete journal entry:", error);
    return { success: false, error: "Failed to delete journal entry" };
  }
}

import { JournalService } from "@/lib/accounting/journal-service";

export async function postJournalEntry(id: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Use the centralized JournalService to post the entry
      await JournalService.postJournalEntry(tx, id);
      return { success: true };
    });

    if (result.success) {
      revalidatePath("/accounting/journal-entries");
      revalidatePath(`/accounting/journal-entries/${id}`);
    }

    return result;
  } catch (error) {
    console.error("Failed to post journal entry:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to post journal entry"
    };
  }
}

export async function getDepartments() {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
    });
    return departments;
  } catch (error) {
    console.error("Failed to fetch departments:", error);
    return [];
  }
}

export async function getProjects() {
  try {
    const projects = await prisma.project.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
    return projects;
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return [];
  }
}
