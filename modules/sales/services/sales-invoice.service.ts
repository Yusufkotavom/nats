import { prisma } from "@/lib/prisma";
import { enqueueIntegrationEvent } from "@/modules/integration/outbox";
import { SalesInvoiceInput } from "@/app/(dashboard)/sales/invoices/types";
import { CalculationService } from "@/lib/utils/calculation-service";

const INVOICE_NUMBER_PREFIX = "INV";
const INITIAL_DRAFT_STATUS = "DRAFT" as const;

type CreateSalesInvoiceInput = Omit<SalesInvoiceInput, "invoiceNumber"> & {
    invoiceNumber?: string;
};

export class SalesInvoiceService {
    static async create(data: CreateSalesInvoiceInput, userId: string) {
        const invoiceNumber = data.invoiceNumber || (await this.generateInvoiceNumber());

        await this.assertUniqueInvoiceNumber(invoiceNumber);

        const taxRates = await prisma.taxRate.findMany();
        const { itemsData, totals } = this.calculateItemsAndTotals(data, taxRates);

        return await prisma.$transaction(async (tx) => {
            const result = await tx.salesInvoice.create({
                data: {
                    invoiceNumber,
                    contactId: data.contactId,
                    salesOrderId: data.salesOrderId,
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

    private static async generateInvoiceNumber(): Promise<string> {
        const count = await prisma.salesInvoice.count();
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const sequence = (count + 1).toString().padStart(4, "0");
        return `${INVOICE_NUMBER_PREFIX}-${year}${month}-${sequence}`;
    }

    private static async assertUniqueInvoiceNumber(invoiceNumber: string): Promise<void> {
        const existing = await prisma.salesInvoice.findUnique({
            where: { invoiceNumber },
        });

        if (existing) {
            throw new Error("Invoice number already exists");
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
