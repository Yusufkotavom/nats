import { prisma } from "@/lib/prisma";
import { enqueueIntegrationEvent } from "@/modules/integration/outbox";
import { PurchaseReceiveInput } from "@/app/[locale]/(dashboard)/purchase/receives/types";

const RECEIVE_NUMBER_PREFIX = "RCV";
const INITIAL_DRAFT_STATUS = "DRAFT" as const;

export class PurchaseReceiveService {
    static async create(data: PurchaseReceiveInput, userId: string) {
        const receiveNumber = await this.generateReceiveNumber();

        return await prisma.$transaction(async (tx) => {
            const result = await tx.purchaseReceive.create({
                data: {
                    receiveNumber,
                    contactId: data.contactId,
                    purchaseOrderId: data.purchaseOrderId,
                    departmentId: data.departmentId,
                    projectId: data.projectId,
                    receiveDate: data.receiveDate,
                    notes: data.notes,
                    status: INITIAL_DRAFT_STATUS,
                    items: {
                        create: data.items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            purchaseOrderItemId: item.purchaseOrderItemId,
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
                type: "PURCHASE_RECEIVE_CREATED",
                aggregateType: "PurchaseReceive",
                aggregateId: result.id,
                payload: {
                    receiveId: result.id,
                    receiveNumber: result.receiveNumber,
                    contactId: data.contactId,
                    userId,
                },
            });

            return result;
        });
    }

    private static async generateReceiveNumber(): Promise<string> {
        const count = await prisma.purchaseReceive.count();
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const sequence = (count + 1).toString().padStart(4, "0");
        return `${RECEIVE_NUMBER_PREFIX}-${year}${month}-${sequence}`;
    }
}
