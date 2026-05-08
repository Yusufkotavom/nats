import { beforeEach, describe, expect, it, vi } from "vitest";

const enqueueIntegrationEventMock = vi.hoisted(() => vi.fn());
const generateDocumentNumberMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/integration/outbox", () => ({
    enqueueIntegrationEvent: enqueueIntegrationEventMock,
}));

vi.mock("@/lib/document-numbering", () => ({
    generateDocumentNumber: generateDocumentNumberMock,
}));

const prismaMock = vi.hoisted(() => ({
    purchaseInvoice: {
        findUnique: vi.fn(),
    },
    taxRate: {
        findMany: vi.fn(),
    },
    $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/utils/calculation-service", () => ({
    CalculationService: {
        calculateLineItem: vi.fn().mockReturnValue({
            total: { toNumber: () => 200 },
            taxAmount: { toNumber: () => 0 },
        }),
        calculateInvoiceTotals: vi.fn().mockReturnValue({
            totalAmount: { toNumber: () => 200 },
            totalTax: { toNumber: () => 0 },
        }),
    },
}));

import { PurchaseInvoiceService } from "./purchase-invoice.service";

const MOCK_USER_ID = "user-001";

const MOCK_INVOICE_INPUT = {
    invoiceNumber: "INV-001",
    contactId: "contact-001",
    invoiceDate: new Date("2026-02-16"),
    dueDate: new Date("2026-03-16"),
    globalDiscount: 0,
    totalTax: 0,
    shippingCost: 0,
    handlingCost: 0,
    items: [
        {
            description: "Widget A",
            quantity: 2,
            unitPrice: 100,
            discount: 0,
            tax: 0,
        },
    ],
};

describe("PurchaseInvoiceService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        generateDocumentNumberMock.mockResolvedValue("PI-2605-0001");
    });

    describe("create", () => {
        it("creates invoice successfully when number is unique", async () => {
            prismaMock.purchaseInvoice.findUnique.mockResolvedValue(null);
            prismaMock.taxRate.findMany.mockResolvedValue([]);

            const createdInvoice = {
                id: "inv-001",
                invoiceNumber: "INV-001",
                totalAmount: 200,
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    purchaseInvoice: {
                        create: vi.fn().mockResolvedValue(createdInvoice),
                    },
                    integrationOutbox: {
                        create: vi.fn().mockResolvedValue({ id: "outbox-001" }),
                    },
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (cb as any)(tx);
            });

            const result = await PurchaseInvoiceService.create(MOCK_INVOICE_INPUT, MOCK_USER_ID);

            expect(result.id).toBe("inv-001");
        });

        it("throws when invoice number already exists", async () => {
            prismaMock.purchaseInvoice.findUnique.mockResolvedValue({ id: "existing" });
            prismaMock.taxRate.findMany.mockResolvedValue([]);

            await expect(
                PurchaseInvoiceService.create(MOCK_INVOICE_INPUT, MOCK_USER_ID),
            ).rejects.toThrow("Invoice number already exists for this vendor");
        });

        it("generates invoice number when not provided", async () => {
            prismaMock.purchaseInvoice.findUnique.mockResolvedValue(null);
            prismaMock.taxRate.findMany.mockResolvedValue([]);

            const createdInvoice = {
                id: "inv-003",
                invoiceNumber: "PI-2605-0001",
                totalAmount: 200,
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    purchaseInvoice: {
                        create: vi.fn().mockResolvedValue(createdInvoice),
                    },
                    integrationOutbox: {
                        create: vi.fn().mockResolvedValue({ id: "outbox-003" }),
                    },
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (cb as any)(tx);
            });

            const { invoiceNumber } = await PurchaseInvoiceService.create(
                { ...MOCK_INVOICE_INPUT, invoiceNumber: undefined },
                MOCK_USER_ID,
            );

            expect(generateDocumentNumberMock).toHaveBeenCalledWith(
                "PURCHASE_INVOICE",
                "Purchase Invoice",
                "PI-",
            );
            expect(invoiceNumber).toBe("PI-2605-0001");
        });

        it("enqueues PURCHASE_INVOICE_CREATED integration event", async () => {
            prismaMock.purchaseInvoice.findUnique.mockResolvedValue(null);
            prismaMock.taxRate.findMany.mockResolvedValue([]);

            const createdInvoice = {
                id: "inv-002",
                invoiceNumber: "INV-002",
                totalAmount: 200,
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    purchaseInvoice: {
                        create: vi.fn().mockResolvedValue(createdInvoice),
                    },
                    integrationOutbox: {
                        create: vi.fn().mockResolvedValue({ id: "outbox-002" }),
                    },
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (cb as any)(tx);
            });

            await PurchaseInvoiceService.create(
                { ...MOCK_INVOICE_INPUT, invoiceNumber: "INV-002" },
                MOCK_USER_ID,
            );

            expect(enqueueIntegrationEventMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    type: "PURCHASE_INVOICE_CREATED",
                    aggregateType: "PurchaseInvoice",
                    payload: expect.objectContaining({
                        invoiceId: "inv-002",
                        userId: MOCK_USER_ID,
                    }),
                }),
            );
        });
    });
});
