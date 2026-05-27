
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";
import { EntryStatus } from "@/prisma/generated/prisma/enums";
import { Decimal } from "decimal.js";
import { enqueueIntegrationEvent } from "@/modules/integration/outbox";
import { SuperJSON } from "@/lib/superjson";
import { getPaginationMetadata } from "@/lib/pagination";
import { createJournalEntrySchema } from "@/lib/validation/schemas";
import { z } from "zod";

type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
const JOURNAL_INTERACTIVE_TX_TIMEOUT_MS = 8_000;

export class JournalService {
    /**
     * Get journal entries with pagination and filtering
     */
    static async getJournalEntries({
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
    }) {
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
                    attachments: true,
                },
                skip,
                take: pageSize,
            }),
            prisma.journalEntry.count({ where }),
        ]);

        return {
            items: entries,
            pagination: getPaginationMetadata(total, page, pageSize),
        };
    }

    /**
     * Get a single journal entry by ID
     */
    static async getJournalEntry(id: string) {
        return prisma.journalEntry.findUnique({
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
                attachments: true,
            },
        });
    }

    /**
     * Create a new journal entry
     */
    /**
     * Create a new journal entry
     */
    static async createJournalEntry(
        data: CreateJournalEntryInput,
        userId: string,
        tx?: Prisma.TransactionClient
    ) {
        // Validate debit = credit using Decimal for precision
        const totalDebit = data.lines.reduce(
            (sum, line) => sum.plus(new Decimal(line?.debitAmount || 0)),
            new Decimal(0),
        );
        const totalCredit = data.lines.reduce(
            (sum, line) => sum.plus(new Decimal(line?.creditAmount || 0)),
            new Decimal(0),
        );

        if (!totalDebit.equals(totalCredit)) {
            throw new Error(
                `Debits must equal credits. Debit: ${totalDebit}, Credit: ${totalCredit}`
            );
        }

        const dateStr = data.transactionDate
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, "");

        const executeCreate = async (db: Prisma.TransactionClient) => {
            let entryNumber = data.entryNumber;

            if (!entryNumber) {
                // Generate entry number inside the transaction/logic
                // Note: If running in parallel without serializable isolation, this count might be off, 
                // but for now we follow existing pattern.
                const count = await db.journalEntry.count({
                    where: {
                        entryNumber: {
                            startsWith: `JE-${dateStr}-`,
                        },
                    },
                });
                entryNumber = `JE-${dateStr}-${(count + 1)
                    .toString()
                    .padStart(4, "0")}`;
            }

            const entry = await db.journalEntry.create({
                data: {
                    userId,
                    entryNumber,
                    transactionDate: data.transactionDate || new Date(),
                    description: data.description || "",
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

            // Emit Outbox event
            await enqueueIntegrationEvent(db, {
                topic: "ACCOUNTING",
                type: "JOURNAL_ENTRY_CREATED",
                aggregateType: "JOURNAL_ENTRY",
                aggregateId: entry.id,
                payload: {
                    journalEntryId: entry.id,
                    entryNumber: entry.entryNumber,
                    transactionDate: entry.transactionDate.toISOString(),
                    description: entry.description || "",
                    totalAmount: totalDebit.toFixed(2),
                    userId,
                },
            });

            return entry;
        };

        if (tx) {
            return executeCreate(tx);
        } else {
            return prisma.$transaction(executeCreate, { timeout: JOURNAL_INTERACTIVE_TX_TIMEOUT_MS });
        }
    }

    /**
     * Update a journal entry
     */
    static async updateJournalEntry(id: string, data: CreateJournalEntryInput) {
        const existingEntry = await prisma.journalEntry.findUnique({
            where: { id },
        });

        if (!existingEntry) {
            throw new Error("Journal entry not found");
        }

        if (existingEntry.status === "posted") {
            throw new Error("Cannot edit posted journal entries");
        }

        // Validate debit = credit using Decimal for precision
        const totalDebit = data.lines.reduce(
            (sum, line) => sum.plus(new Decimal(line?.debitAmount || 0)),
            new Decimal(0),
        );
        const totalCredit = data.lines.reduce(
            (sum, line) => sum.plus(new Decimal(line?.creditAmount || 0)),
            new Decimal(0),
        );

        if (!totalDebit.equals(totalCredit)) {
            throw new Error(
                `Debits must equal credits. Debit: ${totalDebit}, Credit: ${totalCredit}`
            );
        }

        return prisma.$transaction(async (tx) => {
            // Delete existing lines
            await tx.journalEntryLine.deleteMany({
                where: { journalEntryId: id },
            });

            // Update entry and create new lines
            const updatedEntry = await tx.journalEntry.update({
                where: { id },
                data: {
                    transactionDate: data.transactionDate,
                    description: data.description || "",
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
                    attachments: {
                        set: data.attachments?.map((a) => ({ id: a.id })) || [],
                    },
                },
            });

            return updatedEntry;
        }, { timeout: JOURNAL_INTERACTIVE_TX_TIMEOUT_MS });
    }

    /**
     * Delete a journal entry
     */
    static async deleteJournalEntry(id: string) {
        const existingEntry = await prisma.journalEntry.findUnique({
            where: { id },
        });

        if (!existingEntry) {
            throw new Error("Journal entry not found");
        }

        if (existingEntry.status === "posted") {
            throw new Error("Cannot delete posted journal entries");
        }

        await prisma.$transaction(async (tx) => {
            await tx.journalEntryLine.deleteMany({
                where: { journalEntryId: id },
            });

            await tx.journalEntry.delete({
                where: { id },
            });
        });
    }

    /**
     * Post a journal entry
     */
    static async postJournalEntry(id: string, tx?: Prisma.TransactionClient) {
        const executePost = async (db: Prisma.TransactionClient) => {
            const existingEntry = await db.journalEntry.findUnique({
                where: { id },
                include: {
                    lines: {
                        orderBy: { lineNumber: "asc" },
                        include: { account: true },
                    },
                },
            });

            if (!existingEntry) {
                throw new Error("Journal entry not found");
            }

            if (existingEntry.status === "posted") {
                return;
            }

            // 1. Validate Balance using Decimal
            const totalDebit = existingEntry.lines.reduce(
                (sum: Decimal, line: { debitAmount: Decimal | null }) =>
                    sum.plus(new Decimal(line.debitAmount || 0)),
                new Decimal(0)
            );
            const totalCredit = existingEntry.lines.reduce(
                (sum: Decimal, line: { creditAmount: Decimal | null }) =>
                    sum.plus(new Decimal(line.creditAmount || 0)),
                new Decimal(0)
            );

            if (!totalDebit.equals(totalCredit)) {
                throw new Error(
                    `Cannot post unbalanced journal entry. Debit: ${totalDebit}, Credit: ${totalCredit}`
                );
            }

            // 2. Acquire per-account transaction advisory locks in stable order.
            // This avoids FK lock-upgrade deadlocks caused by SELECT ... FOR UPDATE on Account rows.
            const uniqueAccountIds = Array.from(
                new Set(existingEntry.lines.map((line) => line.accountId))
            ).sort();

            for (const accountId of uniqueAccountIds) {
                await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${accountId}))`;
            }

            // 3. Update Status
            await db.journalEntry.update({
                where: { id },
                data: {
                    status: "posted",
                    postedAt: new Date(),
                },
            });

            // 4. Update Running Balances
            // Fetch latest posted running balance for all impacted accounts in a single query
            // to avoid per-line findFirst calls inside interactive transaction.
            const latestBalances = uniqueAccountIds.length
                ? await db.$queryRaw<Array<{ accountId: string; runningBalance: Prisma.Decimal | null }>>`
                    SELECT DISTINCT ON ("jl"."accountId")
                      "jl"."accountId" AS "accountId",
                      "jl"."runningBalance" AS "runningBalance"
                    FROM "JournalEntryLine" "jl"
                    INNER JOIN "JournalEntry" "je" ON "je"."id" = "jl"."journalEntryId"
                    WHERE "jl"."accountId" IN (${Prisma.join(uniqueAccountIds)})
                      AND "je"."status" = 'posted'
                      AND "jl"."journalEntryId" <> ${id}
                    ORDER BY "jl"."accountId", "je"."postedAt" DESC, "je"."createdAt" DESC
                `
                : [];

            const initialBalanceByAccount = new Map<string, Decimal>();
            for (const row of latestBalances) {
                initialBalanceByAccount.set(
                    row.accountId,
                    row.runningBalance ? new Decimal(row.runningBalance) : new Decimal(0),
                );
            }

            const accountBalances: Record<string, Decimal> = {};
            const lineUpdates: Array<{ id: string; runningBalance: Decimal }> = [];

            for (const line of existingEntry.lines) {
                const { accountId, account } = line;

                if (accountBalances[accountId] === undefined) {
                    accountBalances[accountId] =
                        initialBalanceByAccount.get(accountId) ?? new Decimal(0);
                }

                const debit = new Decimal(line.debitAmount || 0);
                const credit = new Decimal(line.creditAmount || 0);

                if (account.normalBalance === "credit") {
                    accountBalances[accountId] = accountBalances[accountId]
                        .minus(debit)
                        .plus(credit);
                } else {
                    accountBalances[accountId] = accountBalances[accountId]
                        .plus(debit)
                        .minus(credit);
                }

                lineUpdates.push({
                    id: line.id,
                    runningBalance: accountBalances[accountId],
                });
            }

            await Promise.all(
                lineUpdates.map((line) =>
                    db.journalEntryLine.update({
                        where: { id: line.id },
                        data: { runningBalance: line.runningBalance },
                    })
                )
            );

            // 5. Emit Outbox Event
            await enqueueIntegrationEvent(db, {
                topic: "ACCOUNTING",
                type: "JOURNAL_ENTRY_POSTED",
                aggregateType: "JOURNAL_ENTRY",
                aggregateId: existingEntry.id,
                payload: {
                    journalEntryId: existingEntry.id,
                    entryNumber: existingEntry.entryNumber,
                    userId: existingEntry.userId,
                },
            });
        };

        if (tx) {
            return executePost(tx);
        } else {
            return prisma.$transaction(executePost, { timeout: JOURNAL_INTERACTIVE_TX_TIMEOUT_MS });
        }
    }
}
