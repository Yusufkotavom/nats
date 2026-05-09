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
    salesInvoice: {
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
        it("generates invoice number when not provided", async () => {
            prismaMock.salesInvoice.count.mockResolvedValue(5);
            prismaMock.salesInvoice.findUnique.mockResolvedValue(null);
            prismaMock.taxRate.findMany.mockResolvedValue([]);

            const createdInvoice = {
                id: "inv-001",
                invoiceNumber: "INV-2602-0006",
                totalAmount: 200,
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    salesInvoice: {
                        create: vi.fn().mockResolvedValue(createdInvoice),
                    },
                    integrationOutbox: {
                        create: vi.fn().mockResolvedValue({ id: "outbox-001" }),
                    },
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (cb as any)(tx);
            });

            const result = await SalesInvoiceService.create(MOCK_INVOICE_INPUT, MOCK_USER_ID);

            expect(result.id).toBe("inv-001");
            expect(generateDocumentNumberMock).toHaveBeenCalledOnce();
        });

        it("uses provided invoice number when given", async () => {
            prismaMock.salesInvoice.findUnique.mockResolvedValue(null);
            prismaMock.taxRate.findMany.mockResolvedValue([]);

            const createdInvoice = {
                id: "inv-002",
                invoiceNumber: "CUSTOM-001",
                totalAmount: 200,
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    salesInvoice: {
                        create: vi.fn().mockResolvedValue(createdInvoice),
                    },
                    integrationOutbox: {
                        create: vi.fn().mockResolvedValue({ id: "outbox-002" }),
                    },
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (cb as any)(tx);
            });

            const result = await SalesInvoiceService.create(
                { ...MOCK_INVOICE_INPUT, invoiceNumber: "CUSTOM-001" },
                MOCK_USER_ID,
            );

            expect(result.invoiceNumber).toBe("CUSTOM-001");
            expect(generateDocumentNumberMock).not.toHaveBeenCalled();
        });

        it("throws when invoice number already exists", async () => {
            prismaMock.salesInvoice.findUnique.mockResolvedValue({ id: "existing" });
            prismaMock.salesInvoice.count.mockResolvedValue(0);
            prismaMock.taxRate.findMany.mockResolvedValue([]);

            await expect(
                SalesInvoiceService.create(MOCK_INVOICE_INPUT, MOCK_USER_ID),
            ).rejects.toThrow("Invoice number already exists");
        });

        it("enqueues SALES_INVOICE_CREATED integration event", async () => {
            prismaMock.salesInvoice.count.mockResolvedValue(0);
            prismaMock.salesInvoice.findUnique.mockResolvedValue(null);
            prismaMock.taxRate.findMany.mockResolvedValue([]);

            const createdInvoice = {
                id: "inv-003",
                invoiceNumber: "INV-2602-0001",
                totalAmount: 200,
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    salesInvoice: {
                        create: vi.fn().mockResolvedValue(createdInvoice),
                    },
                    integrationOutbox: {
                        create: vi.fn().mockResolvedValue({ id: "outbox-003" }),
                    },
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (cb as any)(tx);
            });

            await SalesInvoiceService.create(MOCK_INVOICE_INPUT, MOCK_USER_ID);

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
