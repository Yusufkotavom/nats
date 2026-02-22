import { prisma } from "@/lib/prisma";
import { enqueueIntegrationEvent } from "@/modules/integration/outbox";
import { SalesReturnInput } from "@/app/[locale]/(dashboard)/sales/returns/types";
import { generateDocumentNumber } from "@/lib/document-numbering";

const RETURN_NUMBER_PREFIX = "RET";
const INITIAL_DRAFT_STATUS = "DRAFT" as const;

export class SalesReturnService {
    static async create(data: SalesReturnInput, userId: string) {
        const returnNumber =
            data.returnNumber || (await this.generateReturnNumber());

        await this.assertUniqueReturnNumber(returnNumber);

        let totalAmount = 0;
        data.items.forEach((item) => {
            totalAmount += item.quantity * item.unitPrice;
        });

        return await prisma.$transaction(async (tx) => {
            const result = await tx.salesReturn.create({
                data: {
                    returnNumber,
                    contactId: data.contactId,
                    salesOrderId: data.salesOrderId || undefined,
                    salesInvoiceId: data.salesInvoiceId || undefined,
                    departmentId: data.departmentId,
                    projectId: data.projectId,
                    returnDate: data.returnDate,
                    notes: data.notes,
                    status: INITIAL_DRAFT_STATUS,
                    totalAmount,
                    items: {
                        create: data.items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.quantity * item.unitPrice,
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
                type: "SALES_RETURN_CREATED",
                aggregateType: "SalesReturn",
                aggregateId: result.id,
                payload: {
                    returnId: result.id,
                    returnNumber: result.returnNumber,
                    totalAmount: result.totalAmount.toString(),
                    contactId: data.contactId,
                    userId,
                },
            });

            return result;
        });
    }

    private static async generateReturnNumber(): Promise<string> {
        return await generateDocumentNumber("SALES_RETURN", "Sales Return", "RET-");
    }

    private static async assertUniqueReturnNumber(
        returnNumber: string,
    ): Promise<void> {
        const existing = await prisma.salesReturn.findUnique({
            where: { returnNumber },
        });

        if (existing) {
            throw new Error("Return number already exists");
        }
    }
}
