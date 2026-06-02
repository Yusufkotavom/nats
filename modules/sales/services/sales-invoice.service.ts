import { prisma } from "@/lib/prisma";
import { enqueueIntegrationEvent, enqueueIntegrationEventOnce } from "@/modules/integration/outbox";
import { SalesInvoiceInput } from "@/app/[locale]/(dashboard)/sales/invoices/types";
import { CalculationService } from "@/lib/utils/calculation-service";
import { generateDocumentNumber } from "@/lib/document-numbering";

const INITIAL_DRAFT_STATUS = "DRAFT" as const;

type CreateSalesInvoiceInput = Omit<SalesInvoiceInput, "invoiceNumber"> & {
    invoiceNumber?: string;
};

export class SalesInvoiceService {
    private static async assertSalesOrderBelongsToCompany(
        salesOrderId: string | undefined,
        companyId: string,
    ): Promise<void> {
        if (!salesOrderId) return;
        const order = await prisma.salesOrder.findFirst({
            where: { id: salesOrderId, companyId },
            select: { id: true },
        });
        if (!order) {
            throw new Error("Sales order not found in active company");
        }
    }

    static async create(data: CreateSalesInvoiceInput, userId: string, companyId: string) {
        const invoiceNumber = data.invoiceNumber || (await this.generateInvoiceNumber());
        const autoOrderNumber = data.salesOrderId ? null : await this.generateSalesOrderNumber();

        await this.assertUniqueInvoiceNumber(invoiceNumber, companyId);
        await this.assertSalesOrderBelongsToCompany(data.salesOrderId, companyId);
        await this.assertNoOtherInvoiceForSalesOrder(data.salesOrderId, companyId);

        const taxRates = await prisma.taxRate.findMany();
        const { itemsData, totals } = this.calculateItemsAndTotals(data, taxRates);

        return await prisma.$transaction(async (tx) => {
            const autoSalesOrder = data.salesOrderId
                ? null
                : await tx.salesOrder.create({
                    data: {
                        companyId,
                        orderNumber: autoOrderNumber as string,
                        contactId: data.contactId,
                        orderDate: data.invoiceDate,
                        expectedDate: data.dueDate,
                        notes: data.notes
                            ? `Auto-created from direct invoice ${invoiceNumber}\n${data.notes}`
                            : `Auto-created from direct invoice ${invoiceNumber}`,
                        status: INITIAL_DRAFT_STATUS,
                        totalAmount: totals.totalAmount.toNumber(),
                        subtotal: totals.itemsTotal.toNumber(),
                        taxAmount: totals.totalTax.toNumber(),
                        discountAmount: data.globalDiscount || 0,
                        departmentId: data.departmentId,
                        projectId: data.projectId,
                        createdById: userId,
                        items: {
                            create: itemsData
                                .filter((item) => !!item.productId)
                                .map((item) => ({
                                    productId: item.productId as string,
                                    quantity: item.quantity,
                                    unitPrice: item.unitPrice,
                                    totalPrice: Number(item.totalPrice || item.quantity * item.unitPrice),
                                    taxRate: item.taxRateSnapshot,
                                    taxRateId: item.taxRateId,
                                    discountRate: item.discount,
                                })),
                        },
                    },
                    include: {
                        items: true,
                    },
                });

            if (autoSalesOrder) {
                await enqueueIntegrationEvent(tx, {
                    topic: "sales",
                    type: "SALES_ORDER_CREATED",
                    aggregateType: "sales_order",
                    aggregateId: autoSalesOrder.id,
                    payload: {
                        salesOrderId: autoSalesOrder.id,
                        orderNumber: autoSalesOrder.orderNumber,
                        totalAmount: autoSalesOrder.totalAmount.toString(),
                        userId,
                    },
                });
            }

            const result = await tx.salesInvoice.create({
                data: {
                    companyId,
                    invoiceNumber,
                    contactId: data.contactId,
                    salesOrderId: data.salesOrderId || autoSalesOrder?.id,
                    invoiceDate: data.invoiceDate,
                    dueDate: data.dueDate,
                    notes: data.notes,
                    status: INITIAL_DRAFT_STATUS,
                    totalAmount: totals.totalAmount.toNumber(),
                    globalDiscount: data.globalDiscount,
                    totalTax: totals.totalTax.toNumber(),
                    shippingCost: data.shippingCost,
                    departmentId: data.departmentId,
                    projectId: data.projectId,
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
                topic: "sales",
                type: "SALES_INVOICE_CREATED",
                aggregateType: "SalesInvoice",
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

    static async update(id: string, data: CreateSalesInvoiceInput, companyId: string) {
        // 1. Validation: Check if invoice exists and is editable
        const currentInvoice = await prisma.salesInvoice.findFirst({
            where: { id, companyId },
        });

        if (!currentInvoice) {
            throw new Error("Invoice not found");
        }

        if (currentInvoice.status === "PAID" || currentInvoice.status === "CANCELLED") {
            throw new Error("Cannot edit paid or canceled invoice");
        }

        // 2. Invoice Number Uniqueness Check (if changed)
        if (data.invoiceNumber && data.invoiceNumber !== currentInvoice.invoiceNumber) {
            await this.assertUniqueInvoiceNumber(data.invoiceNumber, companyId, id);
        }
        if (currentInvoice.journalEntryId && data.status === "DRAFT") {
            throw new Error("Posted invoice cannot be reverted to DRAFT");
        }
        await this.assertSalesOrderBelongsToCompany(data.salesOrderId, companyId);
        await this.assertNoOtherInvoiceForSalesOrder(data.salesOrderId, companyId, id);

        // 3. Calculate Totals
        const taxRates = await prisma.taxRate.findMany();
        const { itemsData, totals } = this.calculateItemsAndTotals(data, taxRates);

        // 4. Update Transaction
        return await prisma.$transaction(async (tx) => {
            // Delete existing items
            await tx.salesInvoiceItem.deleteMany({
                where: { salesInvoiceId: id },
            });

            // Update Invoice and create new items
            const result = await tx.salesInvoice.update({
                where: { id },
                data: {
                    invoiceNumber: data.invoiceNumber || currentInvoice.invoiceNumber,
                    contactId: data.contactId,
                    salesOrderId: data.salesOrderId,
                    invoiceDate: data.invoiceDate,
                    dueDate: data.dueDate,
                    notes: data.notes,
                    status: data.status || currentInvoice.status,
                    totalAmount: totals.totalAmount.toNumber(),
                    globalDiscount: data.globalDiscount,
                    totalTax: totals.totalTax.toNumber(),
                    shippingCost: data.shippingCost,
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

            if (result.salesOrderId) {
                const orderTotals = itemsData.reduce(
                    (acc, item) => {
                        const lineTotal = Number(item.totalPrice || 0);
                        const tax = Number(item.tax || 0);
                        acc.subtotal += lineTotal;
                        acc.taxAmount += tax;
                        return acc;
                    },
                    { subtotal: 0, taxAmount: 0 },
                );

                await tx.salesOrderItem.deleteMany({ where: { salesOrderId: result.salesOrderId } });
                await tx.salesOrderItem.createMany({
                    data: itemsData
                        .filter((item) => !!item.productId)
                        .map((item) => ({
                            salesOrderId: result.salesOrderId as string,
                            productId: item.productId as string,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: Number(item.totalPrice || item.quantity * item.unitPrice),
                        })),
                });

                await tx.salesOrder.update({
                    where: { id: result.salesOrderId },
                    data: {
                        contactId: result.contactId,
                        totalAmount: Number(result.totalAmount),
                        subtotal: orderTotals.subtotal,
                        taxAmount: orderTotals.taxAmount,
                        departmentId: result.departmentId,
                        projectId: result.projectId,
                    },
                });
            }

            if (result.status !== "DRAFT" || currentInvoice.journalEntryId) {
                await enqueueIntegrationEventOnce(tx, {
                    topic: "sales",
                    type: "SALES_INVOICE_ISSUED",
                    aggregateType: "SalesInvoice",
                    aggregateId: result.id,
                    payload: {
                        invoiceId: result.id,
                        invoiceNumber: result.invoiceNumber,
                        invoiceDate: result.invoiceDate.toISOString(),
                        contactId: result.contactId,
                        userId: "system",
                        totalAmount: result.totalAmount.toString(),
                        globalDiscount: result.globalDiscount?.toString(),
                        shippingCost: result.shippingCost?.toString(),
                        items: itemsData.map((item) => ({
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice.toString(),
                            discount: item.discount?.toString(),
                            tax: item.tax?.toString(),
                            accountId: item.accountId ?? undefined,
                        })),
                    },
                });
            }

            return result;
        });
    }

    static async delete(id: string, companyId: string) {
        const currentInvoice = await prisma.salesInvoice.findFirst({
            where: { id, companyId },
        });

        if (!currentInvoice) {
            throw new Error("Invoice not found");
        }

        if (currentInvoice.status !== "DRAFT") {
            throw new Error("Can only delete draft invoices");
        }

        await prisma.salesInvoice.delete({
            where: { id },
        });
    }

    private static async generateInvoiceNumber(): Promise<string> {
        return await generateDocumentNumber("SALES_INVOICE", "Sales Invoice", "INV-");
    }

    private static async generateSalesOrderNumber(): Promise<string> {
        return await generateDocumentNumber("SALES_ORDER", "Sales Order", "SO-");
    }

    private static async assertUniqueInvoiceNumber(
        invoiceNumber: string,
        companyId: string,
        excludeId?: string,
    ): Promise<void> {
        const existing = await prisma.salesInvoice.findFirst({
            where: { invoiceNumber, companyId },
        });

        if (existing && existing.id !== excludeId) {
            throw new Error("Invoice number already exists");
        }
    }

    private static async assertNoOtherInvoiceForSalesOrder(
        salesOrderId: string | undefined,
        companyId: string,
        excludeId?: string,
    ): Promise<void> {
        if (!salesOrderId) return;
        const existing = await prisma.salesInvoice.findFirst({
            where: { salesOrderId, companyId },
            select: { id: true },
        });
        if (existing && existing.id !== excludeId) {
            throw new Error("Sales order already has an invoice");
        }
    }

    private static calculateItemsAndTotals(
        data: Pick<SalesInvoiceInput, "items" | "globalDiscount" | "shippingCost">,
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
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: calculated.total.toNumber(),
                    discount: item.discount,
                    tax: calculated.taxAmount.toNumber(),
                    taxRateId: item.taxRateId,
                    taxRateSnapshot,
                    productId: item.productId,
                    accountId: item.accountId,
                },
                calculated,
            };
        });

        const totals = CalculationService.calculateInvoiceTotals(
            itemsWithCalculations.map((i) => i.calculated),
            data.globalDiscount,
            data.shippingCost,
        );

        return {
            itemsData: itemsWithCalculations.map((i) => i.itemData),
            totals,
        };
    }
}
