import { prisma } from "@/lib/prisma";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { InventoryService } from "@/modules/inventory/services/inventory.service";

export interface ProductionIssueInput {
    productionOrderId: string;
    issueDate: Date;
    notes?: string;
    items: {
        productId: string;
        quantity: number;
        notes?: string;
    }[];
}

export class ProductionIssueService {
    static async create(data: ProductionIssueInput) {
        const issueNumber = await generateDocumentNumber("PRODUCTION_ISSUE", "Production Issue", "PI-");

        return await prisma.$transaction(async (tx) => {
            // 1. Create the Issue
            const issue = await tx.productionIssue.create({
                data: {
                    issueNumber,
                    productionOrderId: data.productionOrderId,
                    issueDate: data.issueDate,
                    notes: data.notes,
                    status: "DRAFT",
                    items: {
                        create: data.items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            notes: item.notes,
                            // unitCost will be populated based on actual averageCost during issue confirmation
                        })),
                    },
                },
                include: {
                    items: true,
                },
            });

            return issue;
        });
    }

    static async issueMaterials(id: string) {
        return await prisma.$transaction(async (tx) => {
            const issue = await tx.productionIssue.findUniqueOrThrow({
                where: { id },
                include: { items: true },
            });

            if (issue.status !== "DRAFT") {
                throw new Error("Production Issue is not in DRAFT state.");
            }

            // Fetch products to get the current averageCost
            const productIds = issue.items.map((i) => i.productId);
            const products = await tx.product.findMany({
                where: { id: { in: productIds } },
            });

            let inventoryMovementId: string | null = null;

            // 1. Deduct Inventory
            if (issue.items.length > 0) {
                const movementData = {
                    type: "PRODUCTION_OUT" as any,
                    reference: issue.issueNumber,
                    transactionDate: issue.issueDate,
                    notes: issue.notes || `Production Issue for ${issue.productionOrderId}`,
                    status: "COMPLETED" as const,
                    items: issue.items.map((item) => {
                        const product = products.find((p) => p.id === item.productId);
                        // Defaulting unitCost for inventory out movement is usually skipped, but we can pass it
                        return {
                            productId: item.productId,
                            quantity: item.quantity,
                            unitCost: product?.averageCost || 0,
                            notes: "Production Issue",
                        };
                    }),
                };

                const movement = await InventoryService.createInventoryMovement(tx, movementData);
                inventoryMovementId = movement.id;
            }

            // 2. Update Production Issue Items with actual cost and change status
            for (const item of issue.items) {
                const product = products.find((p) => p.id === item.productId);
                const unitCost = product?.averageCost || 0;
                const totalCost = Number(unitCost) * item.quantity;

                await tx.productionIssueItem.update({
                    where: { id: item.id },
                    data: {
                        unitCost,
                        totalCost,
                    },
                });
            }

            // 3. Mark as Issued
            const updatedIssue = await tx.productionIssue.update({
                where: { id },
                data: {
                    status: "ISSUED",
                    inventoryMovementId,
                },
            });

            return updatedIssue;
        });
    }

    static async cancel(id: string) {
        return await prisma.productionIssue.update({
            where: { id },
            data: {
                status: "CANCELLED",
            },
        });
    }
}
