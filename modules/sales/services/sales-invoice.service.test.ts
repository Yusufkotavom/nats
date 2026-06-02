import { beforeEach, describe, expect, it, vi } from "vitest";

const enqueueIntegrationEventMock = vi.hoisted(() => vi.fn());
const generateDocumentNumberMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
    useRouter: vi.fn(),
    usePathname: vi.fn(),
    useSearchParams: vi.fn(),
    useParams: vi.fn(),
    redirect: vi.fn(),
    notFound: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
    getLocale: vi.fn(() => Promise.resolve("en")),
    getTranslations: vi.fn(),
}));

vi.mock("@/i18n/routing", () => ({
    redirect: vi.fn(),
}));

vi.mock("@/modules/integration/outbox", () => ({
    enqueueIntegrationEvent: enqueueIntegrationEventMock,
}));

vi.mock("@/lib/document-numbering", () => ({
    generateDocumentNumber: generateDocumentNumberMock,
}));

const prismaMock = vi.hoisted(() => ({
    salesOrder: {
        findFirst: vi.fn(),
    },
    salesInvoice: {
        findFirst: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
    },
    taxRate: {
        findMany: vi.fn(),
    },
    $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { SalesInvoiceService } from "./sales-invoice.service";

const MOCK_USER_ID = "user-001";

const MOCK_INVOICE_INPUT = {
    contactId: "contact-001",
    invoiceDate: new Date("2026-02-16"),
    dueDate: new Date("2026-03-16"),
    globalDiscount: 0,
    totalTax: 0,
    shippingCost: 0,
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

describe("SalesInvoiceService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        generateDocumentNumberMock.mockResolvedValue("INV-2602-0001");
    });

    describe("create", () => {
        it("creates a linked sales order when invoice is created without salesOrderId", async () => {
            prismaMock.salesInvoice.findFirst.mockResolvedValue(null);
            prismaMock.taxRate.findMany.mockResolvedValue([]);
            generateDocumentNumberMock.mockResolvedValueOnce("SO-2606-0001");

            const salesOrderCreate = vi.fn().mockResolvedValue({
                id: "so-001",
                orderNumber: "SO-2606-0001",
                totalAmount: 200,
            });
            const salesInvoiceCreate = vi.fn().mockResolvedValue({
                id: "inv-001",
                invoiceNumber: "CUSTOM-001",
                salesOrderId: "so-001",
                totalAmount: 200,
            });

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    salesOrder: {
                        create: salesOrderCreate,
                    },
                    salesInvoice: {
                        create: salesInvoiceCreate,
                    },
                    integrationOutbox: {
                        create: vi.fn().mockResolvedValue({ id: "outbox-001" }),
                    },
                };

                return (cb as any)(tx);
            });

            await SalesInvoiceService.create(
                {
                    ...MOCK_INVOICE_INPUT,
                    invoiceNumber: "CUSTOM-001",
                    items: [
                        {
                            ...MOCK_INVOICE_INPUT.items[0],
                            productId: "prod-001",
                        },
                    ],
                },
                MOCK_USER_ID,
                "company-1",
            );

            expect(salesOrderCreate).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    companyId: "company-1",
                    orderNumber: "SO-2606-0001",
                    contactId: "contact-001",
                    status: "DRAFT",
                    totalAmount: 200,
                    items: {
                        create: [
                            expect.objectContaining({
                                productId: "prod-001",
                                quantity: 2,
                                unitPrice: 100,
                            }),
                        ],
                    },
                }),
                include: { items: true },
            });
            expect(salesInvoiceCreate).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    salesOrderId: "so-001",
                }),
                include: { items: true },
            });
        });

        it("generates invoice number when not provided", async () => {
            prismaMock.salesInvoice.count.mockResolvedValue(5);
            prismaMock.salesInvoice.findFirst.mockResolvedValue(null);
            prismaMock.taxRate.findMany.mockResolvedValue([]);

            const createdInvoice = {
                id: "inv-001",
                invoiceNumber: "INV-2602-0006",
                totalAmount: 200,
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    salesOrder: {
                        create: vi.fn().mockResolvedValue({
                            id: "so-001",
                            orderNumber: "SO-2602-0001",
                            totalAmount: 200,
                        }),
                    },
                    salesInvoice: {
                        create: vi.fn().mockResolvedValue(createdInvoice),
                    },
                    integrationOutbox: {
                        create: vi.fn().mockResolvedValue({ id: "outbox-001" }),
                    },
                };
                 
                return (cb as any)(tx);
            });

            const result = await SalesInvoiceService.create(MOCK_INVOICE_INPUT, MOCK_USER_ID, "company-1");

            expect(result.id).toBe("inv-001");
            expect(generateDocumentNumberMock).toHaveBeenCalledWith("SALES_INVOICE", "Sales Invoice", "INV-");
            expect(generateDocumentNumberMock).toHaveBeenCalledWith("SALES_ORDER", "Sales Order", "SO-");
        });

        it("uses provided invoice number when given", async () => {
            prismaMock.salesInvoice.findFirst.mockResolvedValue(null);
            prismaMock.taxRate.findMany.mockResolvedValue([]);

            const createdInvoice = {
                id: "inv-002",
                invoiceNumber: "CUSTOM-001",
                totalAmount: 200,
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    salesOrder: {
                        create: vi.fn().mockResolvedValue({
                            id: "so-002",
                            orderNumber: "SO-2602-0002",
                            totalAmount: 200,
                        }),
                    },
                    salesInvoice: {
                        create: vi.fn().mockResolvedValue(createdInvoice),
                    },
                    integrationOutbox: {
                        create: vi.fn().mockResolvedValue({ id: "outbox-002" }),
                    },
                };
                 
                return (cb as any)(tx);
            });

            const result = await SalesInvoiceService.create(
                { ...MOCK_INVOICE_INPUT, invoiceNumber: "CUSTOM-001" },
                MOCK_USER_ID,
                "company-1",
            );

            expect(result.invoiceNumber).toBe("CUSTOM-001");
            expect(generateDocumentNumberMock).toHaveBeenCalledOnce();
            expect(generateDocumentNumberMock).toHaveBeenCalledWith("SALES_ORDER", "Sales Order", "SO-");
        });

        it("throws when invoice number already exists", async () => {
            prismaMock.salesInvoice.findFirst.mockResolvedValue({ id: "existing" });
            prismaMock.salesInvoice.count.mockResolvedValue(0);
            prismaMock.taxRate.findMany.mockResolvedValue([]);

            await expect(
                SalesInvoiceService.create(MOCK_INVOICE_INPUT, MOCK_USER_ID, "company-1"),
            ).rejects.toThrow("Invoice number already exists");
        });

        it("enqueues SALES_INVOICE_CREATED integration event", async () => {
            prismaMock.salesInvoice.count.mockResolvedValue(0);
            prismaMock.salesInvoice.findFirst.mockResolvedValue(null);
            prismaMock.taxRate.findMany.mockResolvedValue([]);

            const createdInvoice = {
                id: "inv-003",
                invoiceNumber: "INV-2602-0001",
                totalAmount: 200,
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    salesOrder: {
                        create: vi.fn().mockResolvedValue({
                            id: "so-003",
                            orderNumber: "SO-2602-0003",
                            totalAmount: 200,
                        }),
                    },
                    salesInvoice: {
                        create: vi.fn().mockResolvedValue(createdInvoice),
                    },
                    integrationOutbox: {
                        create: vi.fn().mockResolvedValue({ id: "outbox-003" }),
                    },
                };
                 
                return (cb as any)(tx);
            });

            await SalesInvoiceService.create(MOCK_INVOICE_INPUT, MOCK_USER_ID, "company-1");

            expect(enqueueIntegrationEventMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    type: "SALES_INVOICE_CREATED",
                    aggregateType: "SalesInvoice",
                    payload: expect.objectContaining({
                        invoiceId: "inv-003",
                        userId: MOCK_USER_ID,
                    }),
                }),
            );
        });
    });
});
