import { Prisma } from "@/prisma/generated/prisma/client";

export class WarehouseService {
    static async createWarehouse(
        tx: Prisma.TransactionClient,
        data: { name: string; location?: string },
        companyId: string
    ) {
        return await tx.warehouse.create({
            data: {
                ...data,
                companyId,
            },
        });
    }

    static async updateWarehouse(
        tx: Prisma.TransactionClient,
        id: string,
        data: { name: string; location?: string },
        companyId: string
    ) {
        const existing = await tx.warehouse.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!existing) {
            throw new Error("Warehouse not found in active company");
        }

        return await tx.warehouse.update({
            where: { id: existing.id },
            data,
        });
    }

    static async deleteWarehouse(
        tx: Prisma.TransactionClient,
        id: string,
        companyId: string
    ) {
        const existing = await tx.warehouse.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!existing) {
            throw new Error("Warehouse not found in active company");
        }

        return await tx.warehouse.delete({
            where: { id: existing.id },
        });
    }
}
