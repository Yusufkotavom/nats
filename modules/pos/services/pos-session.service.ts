import { prisma } from "@/lib/prisma";
import { getRequiredDefaultAccount } from "@/lib/accounting/default-account.service";
import { JournalService } from "@/modules/accounting/services/journal.service";
import type { Prisma } from "@/prisma/generated/prisma/client";
import { Decimal } from "decimal.js";

const SESSION_NUMBER_PREFIX = "SES";
type DbClient = typeof prisma | Prisma.TransactionClient;

export class POSSessionService {
    static async open(userId: string, openingCash: number, warehouseId: string) {
        // Close any existing open sessions for this user
        await prisma.pOSSession.updateMany({
            where: { cashierId: userId, status: "OPEN" },
            data: { status: "CLOSED", endTime: new Date() },
        });

        const sessionNumber = `${SESSION_NUMBER_PREFIX}-${Date.now()}`;

        return await prisma.pOSSession.create({
            data: {
                sessionNumber,
                cashierId: userId,
                openingCash: new Decimal(openingCash),
                status: "OPEN",
                startTime: new Date(),
                warehouseId,
            },
        });
    }

    static async getCashSummary(sessionId: string, db: DbClient = prisma) {
        const [payments, session] = await Promise.all([
            db.salesPayment.findMany({
                where: {
                    posSessionId: sessionId,
                    method: "CASH",
                },
            }),
            db.pOSSession.findUnique({
                where: { id: sessionId },
            }),
        ]);

        if (!session) throw new Error("Session not found");

        const cashSales = payments.reduce(
            (acc, p) => acc.add(p.amount),
            new Decimal(0),
        );
        const systemCash = new Decimal(session.openingCash).add(cashSales);

        return {
            openingCash: new Decimal(session.openingCash),
            cashSales,
            systemCash,
        };
    }

    static async close(
        sessionId: string,
        actualCash: number,
        notes?: string,
        closedByUserId?: string,
    ) {
        await prisma.$transaction(async (tx) => {
            const [session, summary] = await Promise.all([
                tx.pOSSession.findUnique({
                    where: { id: sessionId },
                    select: {
                        id: true,
                        cashierId: true,
                        sessionNumber: true,
                        status: true,
                    },
                }),
                this.getCashSummary(sessionId, tx),
            ]);

            if (!session) throw new Error("Session not found");
            if (session.status !== "OPEN") throw new Error("Session already closed");

            const actualCashDecimal = new Decimal(actualCash);
            const difference = actualCashDecimal.sub(summary.systemCash);

            await tx.pOSSession.update({
                where: { id: sessionId },
                data: {
                    status: "CLOSED",
                    endTime: new Date(),
                    actualCash: actualCashDecimal,
                    closingCash: summary.systemCash,
                    difference,
                    notes,
                },
            });

            if (difference.isZero()) {
                return;
            }

            const cashOnHandAccount = await getRequiredDefaultAccount("CASH_ON_HAND");
            const varianceAmount = difference.abs().toNumber();
            const postedBy = closedByUserId || session.cashierId;

            if (difference.lessThan(0)) {
                const shortageExpenseAccount =
                    await getRequiredDefaultAccount("UNCATEGORIZED_EXPENSE");
                const journal = await JournalService.createJournalEntry(
                    {
                        transactionDate: new Date(),
                        description: `POS cash variance shortage - ${session.sessionNumber}`,
                        lines: [
                            {
                                accountId: shortageExpenseAccount.accountId,
                                debitAmount: varianceAmount,
                                creditAmount: 0,
                                description: `Cash shortage on ${session.sessionNumber}`,
                            },
                            {
                                accountId: cashOnHandAccount.accountId,
                                debitAmount: 0,
                                creditAmount: varianceAmount,
                                description: `Cash adjustment on ${session.sessionNumber}`,
                            },
                        ],
                    },
                    postedBy,
                    tx,
                );
                await JournalService.postJournalEntry(journal.id, tx);
                return;
            }

            const overageIncomeAccount =
                await getRequiredDefaultAccount("UNCATEGORIZED_INCOME");
            const journal = await JournalService.createJournalEntry(
                {
                    transactionDate: new Date(),
                    description: `POS cash variance overage - ${session.sessionNumber}`,
                    lines: [
                        {
                            accountId: cashOnHandAccount.accountId,
                            debitAmount: varianceAmount,
                            creditAmount: 0,
                            description: `Cash adjustment on ${session.sessionNumber}`,
                        },
                        {
                            accountId: overageIncomeAccount.accountId,
                            debitAmount: 0,
                            creditAmount: varianceAmount,
                            description: `Cash overage on ${session.sessionNumber}`,
                        },
                    ],
                },
                postedBy,
                tx,
            );
            await JournalService.postJournalEntry(journal.id, tx);
        });
    }
}
