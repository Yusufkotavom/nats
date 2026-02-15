"use server";

import { prisma } from "@/lib/prisma";
import { CashTransactionFormData } from "./types";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/auth";
import { SuperJSON } from "@/lib/superjson";
import {
  CashTransactionType,
  CashTransactionStatus,
} from "@/prisma/generated/prisma/enums";
import { Prisma } from "@/prisma/generated/prisma/client";
import { SuperJSONResult } from "superjson";
import { cashTransactionSchema } from "@/lib/validation/schemas";
import { Decimal } from "decimal.js";
import {
  enqueueIntegrationEvent,
  processIntegrationOutboxEvent,
} from "@/modules/integration/outbox";

export async function createCashTransaction(
  data: CashTransactionFormData | SuperJSONResult,
) {
  const session = await verifySession();

  const data2 = SuperJSON.deserialize(
    data as unknown as SuperJSONResult,
  ) as CashTransactionFormData;

  const validatedData = cashTransactionSchema.parse(data2);

  const transactionId = crypto.randomUUID();
  const journalEntryId = crypto.randomUUID();
  const entryNumber = `CT-${transactionId}`;

  const outbox = await prisma.$transaction(async (tx) => {
    return enqueueIntegrationEvent(tx, {
      topic: "cash_bank",
      type: "CASH_TRANSACTION_CREATE_REQUESTED",
      aggregateType: "CashTransaction",
      aggregateId: transactionId,
      payload: {
        transactionId,
        journalEntryId,
        entryNumber,
        cashAccountId: validatedData.cashAccountId,
        contactId: validatedData.contactId,
        departmentId: validatedData.departmentId,
        projectId: validatedData.projectId,
        type: validatedData.type,
        date: validatedData.date.toISOString(),
        reference: validatedData.reference,
        description: validatedData.description,
        notes: validatedData.notes,
        allocations: validatedData.allocations.map((a) => ({
          accountId: a.accountId,
          amount: String(a.amount),
          description: a.description,
        })),
        attachmentIds: validatedData.attachmentIds,
        userId: session.userId,
      },
    });
  });

  await processIntegrationOutboxEvent(outbox.id);

  const result = await prisma.cashTransaction.findUnique({
    where: { id: transactionId },
  });

  revalidatePath("/cash-bank/transaction");
  revalidatePath("/accounting/journal-entries");
  return SuperJSON.serialize(result);
}

export async function getCashTransactions(
  page: number = 1,
  pageSize: number = 10,
  search: string = "",
) {
  const skip = (page - 1) * pageSize;

  const where: Prisma.CashTransactionWhereInput = search
    ? {
      OR: [
        { description: { contains: search, mode: "insensitive" } },
        { reference: { contains: search, mode: "insensitive" } },
        { contact: { name: { contains: search, mode: "insensitive" } } },
        { cashAccount: { name: { contains: search, mode: "insensitive" } } },
      ],
    }
    : {};

  const [transactions, total] = await Promise.all([
    prisma.cashTransaction.findMany({
      where,
      include: {
        cashAccount: true,
        journalEntry: {
          include: {
            attachments: true,
          },
        },
        allocations: {
          include: {
            account: true,
          },
        },
        contact: true,
        department: true,
        project: true,
      },
      orderBy: {
        date: "desc",
      },
      skip,
      take: pageSize,
    }),
    prisma.cashTransaction.count({ where }),
  ]);

  return {
    transactions: SuperJSON.serialize(transactions),
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getCashTransaction(id: string) {
  const transaction = await prisma.cashTransaction.findUnique({
    where: { id },
    include: {
      cashAccount: true,
      contact: true,
      journalEntry: {
        include: {
          attachments: true,
        },
      },
      allocations: {
        include: {
          account: true,
        },
      },
      department: true,
      project: true,
    },
  });
  return SuperJSON.serialize(transaction);
}

export async function updateCashTransaction(
  id: string,
  data: CashTransactionFormData | SuperJSONResult,
) {
  // const session = await verifySession(); // Not strictly needed for update if we don't track updatedBy, but good practice if we did.

  const data2 = SuperJSON.deserialize(
    data as unknown as SuperJSONResult,
  ) as CashTransactionFormData;

  // Zod Validation
  const validatedData = cashTransactionSchema.parse(data2);

  const totalAmount = validatedData.allocations.reduce(
    (sum, a) => sum.plus(new Decimal(a.amount)),
    new Decimal(0),
  );

  const cashAccount = await prisma.cashAccount.findUnique({
    where: { id: validatedData.cashAccountId },
  });
  if (!cashAccount) throw new Error("Cash account not found");

  const lines: Prisma.JournalEntryLineUncheckedCreateWithoutJournalEntryInput[] =
    [];
  let lineNumber = 1;

  // 1. Cash Line
  lines.push({
    accountId: cashAccount.glAccountId,
    debitAmount: validatedData.type === CashTransactionType.INCOME ? totalAmount : new Decimal(0),
    creditAmount: validatedData.type === CashTransactionType.EXPENSE ? totalAmount : new Decimal(0),
    description: validatedData.description || "Cash Transaction",
    lineNumber: lineNumber++,
  });

  // 2. Allocation Lines
  for (const alloc of validatedData.allocations) {
    lines.push({
      accountId: alloc.accountId,
      debitAmount:
        validatedData.type === CashTransactionType.EXPENSE ? new Decimal(alloc.amount) : new Decimal(0),
      creditAmount:
        validatedData.type === CashTransactionType.INCOME ? new Decimal(alloc.amount) : new Decimal(0),
      description: alloc.description || validatedData.description,
      lineNumber: lineNumber++,
      departmentId: validatedData.departmentId,
      projectId: validatedData.projectId,
    });
  }

  const existingTransaction = await prisma.cashTransaction.findUnique({
    where: { id },
    include: { journalEntry: { include: { attachments: true } } },
  });

  if (!existingTransaction) throw new Error("Transaction not found");

  if (existingTransaction.status === CashTransactionStatus.APPROVED) {
    throw new Error("Cannot edit approved transaction");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update Journal Entry
    await tx.journalEntry.update({
      where: { id: existingTransaction.journalEntryId },
      data: {
        transactionDate: validatedData.date,
        description: validatedData.description,
        notes: validatedData.notes,
        attachments: {
          set: validatedData.attachmentIds?.map((id) => ({ id })) || [],
        },
        lines: {
          deleteMany: {},
          create: lines,
        },
      },
    });

    // Update Cash Transaction
    const transaction = await tx.cashTransaction.update({
      where: { id },
      data: {
        cashAccountId: validatedData.cashAccountId,
        contactId: validatedData.contactId,
        departmentId: validatedData.departmentId,
        projectId: validatedData.projectId,
        type: validatedData.type,
        date: validatedData.date,
        reference: validatedData.reference,
        description: validatedData.description,
        note: validatedData.notes,
        allocations: {
          deleteMany: {},
          create: validatedData.allocations.map((a) => ({
            accountId: a.accountId,
            amount: new Decimal(a.amount),
            description: a.description,
          })),
        },
      },
    });

    return transaction;
  });

  revalidatePath("/cash-bank/transaction");
  revalidatePath("/accounting/journal-entries");
  return SuperJSON.serialize(result);
}

export async function approveCashTransaction(id: string) {
  const session = await verifySession();
  const userId = session.userId;

  const transaction = await prisma.cashTransaction.findUnique({
    where: { id },
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  if (transaction.status === CashTransactionStatus.APPROVED) {
    throw new Error("Transaction already approved");
  }

  const outbox = await prisma.$transaction(async (tx) => {
    return enqueueIntegrationEvent(tx, {
      topic: "cash_bank",
      type: "CASH_TRANSACTION_APPROVED",
      aggregateType: "CashTransaction",
      aggregateId: id,
      payload: {
        transactionId: id,
        userId,
      },
    });
  });

  await processIntegrationOutboxEvent(outbox.id);

  const result = await prisma.cashTransaction.findUnique({
    where: { id },
  });

  revalidatePath("/cash-bank/transaction");
  revalidatePath("/accounting/journal-entries");
  revalidatePath("/cash-bank"); // For dashboard stats
  return SuperJSON.serialize(result);
}

export async function deleteCashTransaction(id: string) {
  const transaction = await prisma.cashTransaction.findUnique({
    where: { id },
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  if (transaction.status === CashTransactionStatus.APPROVED) {
    throw new Error("Cannot delete approved transaction");
  }

  await prisma.$transaction(async (tx) => {
    // First delete the transaction
    await tx.cashTransaction.delete({
      where: { id },
    });

    // Then delete the associated journal entry
    // Note: If attachments are linked to JE, they might need handling if we want to delete files too,
    // but typically we keep files or rely on periodic cleanup.
    // The File records in DB will remain, but relation to JE is removed when JE is deleted.
    await tx.journalEntry.delete({
      where: { id: transaction.journalEntryId },
    });
  });

  revalidatePath("/cash-bank/transaction");
  revalidatePath("/accounting/journal-entries");
}
