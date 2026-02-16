import { Prisma } from "@/prisma/generated/prisma/client";

export class WarehouseService {
    static async createWarehouse(tx: Prisma.TransactionClient, data: { name: string; location?: string }) {
        return await tx.warehouse.create({
            data,
        });
    }

    static async updateWarehouse(tx: Prisma.TransactionClient, id: string, data: { name: string; location?: string }) {
        return await tx.warehouse.update({
            where: { id },
            data,
        });
    }

    static async deleteWarehouse(tx: Prisma.TransactionClient, id: string) {
        return await tx.warehouse.delete({
            where: { id },
        });
    }
}
