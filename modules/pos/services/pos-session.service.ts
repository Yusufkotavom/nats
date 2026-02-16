import { prisma } from "@/lib/prisma";
import { Decimal } from "decimal.js";

const SESSION_NUMBER_PREFIX = "SES";

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

    static async close(sessionId: string, actualCash: number, notes?: string) {
        const payments = await prisma.salesPayment.findMany({
            where: {
                posSessionId: sessionId,
                method: "CASH",
            },
        });

        const session = await prisma.pOSSession.findUnique({
            where: { id: sessionId },
        });

        if (!session) throw new Error("Session not found");

        const cashSales = payments.reduce(
            (acc, p) => acc.add(p.amount),
            new Decimal(0),
        );
        const systemCash = new Decimal(session.openingCash).add(cashSales);

        await prisma.pOSSession.update({
            where: { id: sessionId },
            data: {
                status: "CLOSED",
                endTime: new Date(),
                actualCash: new Decimal(actualCash),
                closingCash: systemCash,
                difference: new Decimal(actualCash).sub(systemCash),
                notes,
            },
        });
    }
}
