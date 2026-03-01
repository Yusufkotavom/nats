import { prisma } from "@/lib/prisma";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { InventoryService } from "@/modules/inventory/services/inventory.service";
import { JournalService } from "@/modules/accounting/services/journal.service";
import { getRequiredDefaultAccount } from "@/lib/accounting/default-accounts";

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

const SYSTEM_USER_ID = "system";

export class ProductionIssueService {
    static async create(data: ProductionIssueInput) {
        const issueNumber = await generateDocumentNumber("PRODUCTION_ISSUE", "Production Issue", "PI-");

        return await prisma.$transaction(async (tx) => {
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

            // 2. Update Production Issue Items with actual cost
            let totalMaterialCost = 0;
            for (const item of issue.items) {
                const product = products.find((p) => p.id === item.productId);
                const unitCost = product?.averageCost || 0;
                const totalCost = Number(unitCost) * item.quantity;
                totalMaterialCost += totalCost;

                await tx.productionIssueItem.update({
                    where: { id: item.id },
                    data: {
                        unitCost,
                        totalCost,
                    },
                });
            }

            // 3. Create Journal Entry: Dr. WIP Inventory / Cr. Inventory Asset
            let journalEntryId: string | null = null;
            if (totalMaterialCost > 0) {
                try {
                    const wipAccount = await getRequiredDefaultAccount("WIP_INVENTORY");
                    const inventoryAccount = await getRequiredDefaultAccount("INVENTORY_ASSET");

                    const journalEntry = await JournalService.createJournalEntry(
                        {
                            transactionDate: issue.issueDate,
                            description: `Material Issue ${issue.issueNumber}`,
                            lines: [
                                {
                                    accountId: wipAccount.accountId,
                                    debitAmount: totalMaterialCost,
                                    creditAmount: 0,
                                    description: `WIP - Raw materials issued (${issue.issueNumber})`,
                                },
                                {
                                    accountId: inventoryAccount.accountId,
                                    debitAmount: 0,
                                    creditAmount: totalMaterialCost,
                                    description: `Inventory consumed for production (${issue.issueNumber})`,
                                },
                            ],
                        },
                        SYSTEM_USER_ID,
                        tx,
                    );

                    // Auto-post the journal entry
                    await JournalService.postJournalEntry(journalEntry.id, tx);
                    journalEntryId = journalEntry.id;
                } catch (error) {
                    // Default accounts may not be configured yet — log but don't block
                    console.warn("Skipping journal entry for Production Issue (default accounts not configured):", error);
                }
            }

            // 4. Mark as Issued
            const updatedIssue = await tx.productionIssue.update({
                where: { id },
                data: {
                    status: "ISSUED",
                    inventoryMovementId,
                    journalEntryId,
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
