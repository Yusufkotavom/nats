import { prisma } from "@/lib/prisma";
import { enqueueIntegrationEvent } from "@/modules/integration/outbox";
import { SalesShipmentInput } from "@/app/[locale]/(dashboard)/sales/shipments/types";

const SHIPMENT_NUMBER_PREFIX = "SHP";
const INITIAL_DRAFT_STATUS = "DRAFT" as const;

export class SalesShipmentService {
    static async create(data: SalesShipmentInput, userId: string) {
        const shipmentNumber = await this.generateShipmentNumber();

        return await prisma.$transaction(async (tx) => {
            const result = await tx.salesShipment.create({
                data: {
                    shipmentNumber,
                    contactId: data.contactId,
                    salesOrderId: data.salesOrderId,
                    departmentId: data.departmentId,
                    projectId: data.projectId,
                    shipmentDate: data.shipmentDate,
                    notes: data.notes,
                    trackingNumber: data.trackingNumber,
                    carrier: data.carrier,
                    status: INITIAL_DRAFT_STATUS,
                    items: {
                        create: data.items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            salesOrderItemId: item.salesOrderItemId,
                        })),
                    },
                    attachments: data.attachmentIds
                        ? { connect: data.attachmentIds.map((id) => ({ id })) }
                        : undefined,
                },
                include: {
                    items: true,
                },
            });

            await enqueueIntegrationEvent(tx, {
                topic: "sales",
                type: "SALES_SHIPMENT_CREATED",
                aggregateType: "SalesShipment",
                aggregateId: result.id,
                payload: {
                    shipmentId: result.id,
                    shipmentNumber: result.shipmentNumber,
                    salesOrderId: data.salesOrderId,
                    contactId: data.contactId,
                    userId,
                },
            });

            return result;
        });
    }

    private static async generateShipmentNumber(): Promise<string> {
        const count = await prisma.salesShipment.count();
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const sequence = (count + 1).toString().padStart(4, "0");
        return `${SHIPMENT_NUMBER_PREFIX}-${year}${month}-${sequence}`;
    }
}
