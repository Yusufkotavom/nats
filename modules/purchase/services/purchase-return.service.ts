import { prisma } from "@/lib/prisma";
import { enqueueIntegrationEvent } from "@/modules/integration/outbox";
import { PurchaseReturnInput } from "@/app/[locale]/(dashboard)/purchase/returns/types";
import { CalculationService } from "@/lib/utils/calculation-service";

const INITIAL_DRAFT_STATUS = "DRAFT" as const;

export class PurchaseReturnService {
    static async create(data: PurchaseReturnInput, userId: string) {
        await this.assertUniqueReturnNumber(data.returnNumber);

        const itemsWithCalculations = data.items.map((item) => {
            const calculated = CalculationService.calculateLineItem({
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: 0,
                tax: 0,
            });
            return {
                itemData: {
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: calculated.total.toNumber(),
                },
                calculated,
            };
        });

        const totals = CalculationService.calculateInvoiceTotals(
            itemsWithCalculations.map((i) => i.calculated),
        );

        const totalAmount = totals.totalAmount.toNumber();

        return await prisma.$transaction(async (tx) => {
            const result = await tx.purchaseReturn.create({
                data: {
                    returnNumber: data.returnNumber,
                    contactId: data.contactId,
                    purchaseOrderId: data.purchaseOrderId || undefined,
                    purchaseInvoiceId: data.purchaseInvoiceId || undefined,
                    departmentId: data.departmentId,
                    projectId: data.projectId,
                    returnDate: data.returnDate,
                    reason: data.reason,
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
                topic: "purchase",
                type: "PURCHASE_RETURN_CREATED",
                aggregateType: "PurchaseReturn",
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

    private static async assertUniqueReturnNumber(
        returnNumber: string,
    ): Promise<void> {
        const existing = await prisma.purchaseReturn.findUnique({
            where: { returnNumber },
        });

        if (existing) {
            throw new Error("Return number already exists");
        }
    }
}
