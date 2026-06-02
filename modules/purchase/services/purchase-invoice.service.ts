import { prisma } from "@/lib/prisma";
import { enqueueIntegrationEvent } from "@/modules/integration/outbox";
import { PurchaseInvoiceInput } from "@/app/[locale]/(dashboard)/purchase/invoices/types";
import { CalculationService } from "@/lib/utils/calculation-service";
import { generateDocumentNumber } from "@/lib/document-numbering";

const INITIAL_DRAFT_STATUS = "DRAFT" as const;

export class PurchaseInvoiceService {
    static async create(data: PurchaseInvoiceInput, userId: string, companyId: string) {
        const invoiceNumber = data.invoiceNumber || (await this.generateInvoiceNumber());
        await this.assertUniqueInvoiceNumber(invoiceNumber, companyId);
        await this.assertPurchaseOrderAvailability(data.purchaseOrderId, companyId);

        const taxRates = await prisma.taxRate.findMany();
        const { itemsData, totals } = this.calculateItemsAndTotals(data, taxRates);

        return await prisma.$transaction(async (tx) => {
            const result = await tx.purchaseInvoice.create({
                data: {
                    invoiceNumber,
                    contactId: data.contactId,
                    purchaseOrderId: data.purchaseOrderId,
                    invoiceDate: data.invoiceDate,
                    dueDate: data.dueDate,
                    notes: data.notes,
                    status: INITIAL_DRAFT_STATUS,
                    totalAmount: totals.totalAmount.toNumber(),
                    globalDiscount: data.globalDiscount,
                    totalTax: totals.totalTax.toNumber(),
                    shippingCost: data.shippingCost,
                    handlingCost: data.handlingCost,
                    departmentId: data.departmentId,
                    projectId: data.projectId,
                    companyId,
                    items: {
                        create: itemsData,
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
                type: "PURCHASE_INVOICE_CREATED",
                aggregateType: "PurchaseInvoice",
                aggregateId: result.id,
                payload: {
                    invoiceId: result.id,
                    invoiceNumber: result.invoiceNumber,
                    totalAmount: result.totalAmount.toString(),
                    contactId: data.contactId,
                    userId,
                },
            });

            return result;
        });
    }

    static async update(id: string, data: PurchaseInvoiceInput, companyId: string) {
        const currentInvoice = await prisma.purchaseInvoice.findFirst({
            where: { id, companyId },
        });

        if (!currentInvoice) {
            throw new Error("Invoice not found");
        }

        if (currentInvoice.status === "PAID" || currentInvoice.status === "CANCELED") {
            throw new Error("Cannot edit paid or cancelled invoice");
        }

        const invoiceNumber = data.invoiceNumber || currentInvoice.invoiceNumber;

        if (invoiceNumber !== currentInvoice.invoiceNumber) {
            await this.assertUniqueInvoiceNumber(invoiceNumber, companyId, id);
        }
        await this.assertPurchaseOrderAvailability(data.purchaseOrderId, companyId, id);

        const taxRates = await prisma.taxRate.findMany();
        const { itemsData, totals } = this.calculateItemsAndTotals(data, taxRates);

        return await prisma.$transaction(async (tx) => {
            await tx.purchaseInvoiceItem.deleteMany({
                where: { purchaseInvoiceId: id },
            });

            return await tx.purchaseInvoice.update({
                where: { id },
                data: {
                    invoiceNumber,
                    contactId: data.contactId,
                    purchaseOrderId: data.purchaseOrderId,
                    invoiceDate: data.invoiceDate,
                    dueDate: data.dueDate,
                    notes: data.notes,
                    totalAmount: totals.totalAmount.toNumber(),
                    globalDiscount: data.globalDiscount,
                    totalTax: totals.totalTax.toNumber(),
                    shippingCost: data.shippingCost,
                    handlingCost: data.handlingCost,
                    departmentId: data.departmentId,
                    projectId: data.projectId,
                    items: {
                        create: itemsData,
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

    private static async generateInvoiceNumber(): Promise<string> {
        return await generateDocumentNumber("PURCHASE_INVOICE", "Purchase Invoice", "PI-");
    }

    static async delete(id: string, companyId: string) {
        const currentInvoice = await prisma.purchaseInvoice.findFirst({
            where: { id, companyId },
        });

        if (!currentInvoice) {
            throw new Error("Invoice not found");
        }

        if (currentInvoice.status !== INITIAL_DRAFT_STATUS) {
            throw new Error("Can only delete draft invoices");
        }

        await prisma.purchaseInvoice.delete({
            where: { id },
        });
    }

    private static async assertUniqueInvoiceNumber(
        invoiceNumber: string,
        companyId: string,
        excludeId?: string,
    ): Promise<void> {
        const existing = await prisma.purchaseInvoice.findFirst({
            where: { invoiceNumber, companyId },
        });

        if (existing && existing.id !== excludeId) {
            throw new Error("Invoice number already exists for this vendor");
        }
    }

    private static async assertPurchaseOrderAvailability(
        purchaseOrderId: string | undefined,
        companyId: string,
        excludeInvoiceId?: string,
    ): Promise<void> {
        if (!purchaseOrderId) return;

        const existing = await prisma.purchaseInvoice.findFirst({
            where: {
                purchaseOrderId,
                companyId,
            },
            select: {
                id: true,
            },
        });

        if (existing && existing.id !== excludeInvoiceId) {
            throw new Error("Purchase order already has an invoice");
        }
    }

    private static calculateItemsAndTotals(
        data: Pick<PurchaseInvoiceInput, "items" | "globalDiscount" | "shippingCost" | "handlingCost">,
        taxRates: { id: string; rate: unknown }[],
    ) {
        const itemsWithCalculations = data.items.map((item) => {
            let taxRateSnapshot: number | undefined = undefined;
            const taxAmount = item.tax || 0;

            if (item.taxRateId) {
                const rateObj = taxRates.find((r) => r.id === item.taxRateId);
                if (rateObj) {
                    taxRateSnapshot = Number(rateObj.rate);
                }
            }

            const calculated = CalculationService.calculateLineItem(
                {
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discount: item.discount,
                    tax: taxAmount,
                },
                taxRateSnapshot,
            );

            return {
                itemData: {
                    description: item.description,
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: calculated.total.toNumber(),
                    discount: item.discount,
                    tax: calculated.taxAmount.toNumber(),
                    taxRateId: item.taxRateId,
                    taxRateSnapshot,
                    accountId: item.accountId,
                },
                calculated,
            };
        });

        const totals = CalculationService.calculateInvoiceTotals(
            itemsWithCalculations.map((i) => i.calculated),
            data.globalDiscount,
            data.shippingCost,
            data.handlingCost,
        );

        return {
            itemsData: itemsWithCalculations.map((i) => i.itemData),
            totals,
        };
    }
}
