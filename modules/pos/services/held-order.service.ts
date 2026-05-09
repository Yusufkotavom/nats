import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/prisma/generated/prisma/client";
import { Decimal } from "decimal.js";

const HOLD_ID_PREFIX = "HOLD";
const HELD_ORDER_EXPIRATION_MS = 24 * 60 * 60 * 1000;

export class HeldOrderService {
    static async hold(
        userId: string,
        cart: unknown[],
        totalAmount: number,
        note?: string,
        customerId?: string,
        customerName?: string,
        globalDiscount: number = 0,
        diningSpotId?: string,
    ) {
        const posSession = await prisma.pOSSession.findFirst({
            where: { cashierId: userId, status: "OPEN" },
        });

        const holdId = `${HOLD_ID_PREFIX}-${Date.now().toString().slice(-6)}`;

        // Store structured data to include globalDiscount
        const orderData = {
            cart,
            globalDiscount,
        };

        return await prisma.heldOrder.create({
            data: {
                holdId,
                userId,
                posSessionId: posSession?.id,
                items: orderData as Prisma.InputJsonValue,
                totalAmount: new Decimal(totalAmount),
                note,
                customerId,
                customerName,
                diningSpotId,
            },
        });
    }

    static async resume(heldOrderId: string) {
        const heldOrder = await prisma.heldOrder.findUnique({
            where: { id: heldOrderId },
        });

        if (!heldOrder) throw new Error("Held order not found");

        await prisma.heldOrder.delete({
            where: { id: heldOrderId },
        });

        return heldOrder;
    }

    static async delete(heldOrderId: string) {
        await prisma.heldOrder.delete({
            where: { id: heldOrderId },
        });
    }

    static async cleanupExpired() {
        const expirationDate = new Date(Date.now() - HELD_ORDER_EXPIRATION_MS);
        await prisma.heldOrder.deleteMany({
            where: {
                createdAt: { lt: expirationDate },
            },
        });
    }
}
