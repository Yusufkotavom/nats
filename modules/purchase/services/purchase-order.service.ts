import { prisma } from "@/lib/prisma";
import { enqueueIntegrationEvent } from "@/modules/integration/outbox";
import { PurchaseOrderInput } from "@/app/(dashboard)/purchase/orders/types";

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
}
