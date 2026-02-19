import { prisma } from "@/lib/prisma";
import { enqueueIntegrationEvent } from "@/modules/integration/outbox";
import { PurchaseOrderInput } from "@/app/[locale]/(dashboard)/purchase/orders/types";

export class PurchaseOrderService {
    static async create(data: PurchaseOrderInput, userId: string) {
        const orderNumber = `DRAFT-${Date.now()}`;

        let totalAmount = 0;
        data.items.forEach((item) => {
            totalAmount += item.quantity * item.unitCost;
        });

        return await prisma.$transaction(async (tx) => {
            const result = await tx.purchaseOrder.create({
                data: {
                    orderNumber,
                    contactId: data.contactId,
                    orderDate: data.orderDate,
                    expectedDate: data.expectedDate,
                    notes: data.notes,
                    status: "DRAFT",
                    totalAmount,
                    departmentId: data.departmentId,
                    projectId: data.projectId,
                    createdById: userId,
                    items: {
                        create: data.items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitCost: item.unitCost,
                            totalCost: item.quantity * item.unitCost,
                        })),
                    },
                    attachments: {
                        connect: data.attachmentIds?.map((id) => ({ id })) || [],
                    },
                },
                include: {
                    items: true,
                },
            });

            await enqueueIntegrationEvent(tx, {
                topic: "purchase",
                type: "PURCHASE_ORDER_CREATED",
                aggregateType: "PurchaseOrder",
                aggregateId: result.id,
                payload: {
                    orderId: result.id,
                    orderNumber: result.orderNumber,
                    totalAmount: result.totalAmount.toString(),
                    userId,
                },
            });

            return result;
        });
    }

    static async update(id: string, data: PurchaseOrderInput, userId: string) {
        const currentOrder = await prisma.purchaseOrder.findUnique({
            where: { id },
        });

        if (!currentOrder) {
            throw new Error("Order not found");
        }

        if (currentOrder.status !== "DRAFT") {
            throw new Error("Only Draft orders can be modified. Please Cancel or create a new order.");
        }

        let totalAmount = 0;
        data.items.forEach((item) => {
            totalAmount += item.quantity * item.unitCost;
        });

        return await prisma.$transaction(async (tx) => {
            await tx.purchaseOrderItem.deleteMany({
                where: { purchaseOrderId: id },
            });

            return await tx.purchaseOrder.update({
                where: { id },
                data: {
                    contactId: data.contactId,
                    orderDate: data.orderDate,
                    expectedDate: data.expectedDate,
                    notes: data.notes,
                    status: "DRAFT",
                    totalAmount,
                    departmentId: data.departmentId,
                    projectId: data.projectId,
                    updatedById: userId,
                    items: {
                        create: data.items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitCost: item.unitCost,
                            totalCost: item.quantity * item.unitCost,
                        })),
                    },
                    attachments: {
                        set: data.attachmentIds?.map((id) => ({ id })) || [],
                    },
                },
                include: {
                    items: true,
                },
            });
        });
    }

    static async issue(id: string) {
        const currentOrder = await prisma.purchaseOrder.findUnique({
            where: { id },
        });

        if (!currentOrder) {
            throw new Error("Order not found");
        }

        if (currentOrder.status !== "DRAFT") {
            throw new Error("Only Draft orders can be issued");
        }

        const orderNumber = await this.generatePONumber();

        return await prisma.purchaseOrder.update({
            where: { id },
            data: {
                status: "ISSUED",
                orderNumber,
            },
        });
    }

    static async cancel(id: string) {
        const currentOrder = await prisma.purchaseOrder.findUnique({
            where: { id },
        });

        if (!currentOrder) {
            throw new Error("Order not found");
        }

        if (!["DRAFT", "ISSUED"].includes(currentOrder.status)) {
            throw new Error("Cannot cancel this order");
        }

        return await prisma.purchaseOrder.update({
            where: { id },
            data: {
                status: "CANCELLED",
            },
        });
    }

    static async close(id: string, userId: string) {
        const currentOrder = await prisma.purchaseOrder.findUnique({
            where: { id },
        });

        if (!currentOrder) {
            throw new Error("Order not found");
        }

        if (!["ISSUED", "PARTIALLY_RECEIVED"].includes(currentOrder.status)) {
            throw new Error("Cannot close this order");
        }

        return await prisma.purchaseOrder.update({
            where: { id },
            data: {
                status: "CLOSED",
                closedAt: new Date(),
                closedById: userId,
            },
        });
    }

    static async delete(id: string) {
        await prisma.purchaseOrder.delete({
            where: { id },
        });
    }

    private static async generatePONumber() {
        const count = await prisma.purchaseOrder.count({
            where: {
                NOT: {
                    status: "DRAFT",
                },
            },
        });
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const sequence = (count + 1).toString().padStart(4, "0");
        return `PO-${year}${month}-${sequence}`;
    }
}
