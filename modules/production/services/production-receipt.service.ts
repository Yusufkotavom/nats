import { prisma } from "@/lib/prisma";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { InventoryService } from "@/modules/inventory/services/inventory.service";

export interface ProductionReceiptInput {
    productionOrderId: string;
    receiptDate: Date;
    notes?: string;
    items: {
        productId: string;
        quantity: number;
        notes?: string;
    }[];
}

export class ProductionReceiptService {
    static async create(data: ProductionReceiptInput) {
        const receiptNumber = await generateDocumentNumber("PRODUCTION_RECEIPT", "Production Receipt", "PR-");

        return await prisma.$transaction(async (tx) => {
            // 1. Create the Receipt
            const receipt = await tx.productionReceipt.create({
                data: {
                    receiptNumber,
                    productionOrderId: data.productionOrderId,
                    receiptDate: data.receiptDate,
                    notes: data.notes,
                    status: "DRAFT",
                    items: {
                        create: data.items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            notes: item.notes,
                        })),
                    },
                },
                include: {
                    items: true,
                },
            });

            return receipt;
        });
    }

    static async receiveGoods(id: string) {
        return await prisma.$transaction(async (tx) => {
            const receipt = await tx.productionReceipt.findUniqueOrThrow({
                where: { id },
                include: {
                    items: true,
                    productionOrder: {
                        include: {
                            issues: {
                                where: { status: "ISSUED" },
                                include: { items: true },
                            },
                        },
                    },
                },
            });

            if (receipt.status !== "DRAFT") {
                throw new Error("Production Receipt is not in DRAFT state.");
            }

            // Calculate total cost from all issued materials for this order
            let totalMaterialCost = 0;
            for (const issue of receipt.productionOrder.issues) {
                for (const item of issue.items) {
                    totalMaterialCost += Number(item.totalCost);
                }
            }

            // Calculate total requested receipt quantity
            const totalReceiptQty = receipt.items.reduce((sum, item) => sum + item.quantity, 0);

            const unitCost = totalReceiptQty > 0 ? totalMaterialCost / totalReceiptQty : 0;

            let inventoryMovementId: string | null = null;

            // 1. Increase Inventory
            if (receipt.items.length > 0) {
                const movementData = {
                    type: "PRODUCTION_IN" as any,
                    reference: receipt.receiptNumber,
                    transactionDate: receipt.receiptDate,
                    notes: receipt.notes || `Production Receipt for ${receipt.productionOrder.orderNumber}`,
                    status: "COMPLETED" as const,
                    items: receipt.items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitCost, // Assigned weighted average cost from issues
                        notes: "Production Receipt",
                    })),
                };

                const movement = await InventoryService.createInventoryMovement(tx, movementData);
                inventoryMovementId = movement.id;
            }

            // 2. Update Production Receipt Items with actual cost and change status
            for (const item of receipt.items) {
                const totalLineCost = unitCost * item.quantity;
                await tx.productionReceiptItem.update({
                    where: { id: item.id },
                    data: {
                        unitCost,
                        totalCost: totalLineCost,
                    },
                });
            }

            // 3. Mark as Received
            const updatedReceipt = await tx.productionReceipt.update({
                where: { id },
                data: {
                    status: "RECEIVED",
                    inventoryMovementId,
                },
            });

            // 4. Update Production Order quantities
            const previouslyReceived = receipt.productionOrder.producedQuantity;
            await tx.productionOrder.update({
                where: { id: receipt.productionOrderId },
                data: {
                    producedQuantity: previouslyReceived + totalReceiptQty,
                },
            });

            return updatedReceipt;
        });
    }

    static async cancel(id: string) {
        return await prisma.productionReceipt.update({
            where: { id },
            data: {
                status: "CANCELLED",
            },
        });
    }
}
