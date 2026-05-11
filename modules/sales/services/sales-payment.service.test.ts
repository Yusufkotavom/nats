import { beforeEach, describe, expect, it, vi } from "vitest";

const enqueueIntegrationEventMock = vi.hoisted(() => vi.fn());

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
    generateDocumentNumber: vi.fn().mockResolvedValue("PAY-IN-TEST-0001"),
}));

const prismaMock = vi.hoisted(() => ({
    salesPayment: { count: vi.fn() },
    salesInvoice: { findUnique: vi.fn() },
    cashAccount: { findUnique: vi.fn() },
    documentNumbering: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { SalesPaymentService } from "./sales-payment.service";

const MOCK_USER_ID = "user-001";

const MOCK_PAYMENT_INPUT = {
    contactId: "contact-001",
    salesInvoiceId: "inv-001",
    paymentDate: new Date("2026-02-16"),
    amount: 500,
    method: "bank_transfer",
    cashAccountId: "cash-001",
};

describe("SalesPaymentService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("create", () => {
        it("creates payment and updates invoice status", async () => {
            prismaMock.salesInvoice.findUnique.mockResolvedValue({
                id: "inv-001",
                totalAmount: 1000,
                payments: [{ amount: 200 }],
            });
            prismaMock.cashAccount.findUnique.mockResolvedValue({ id: "cash-001" });
            prismaMock.salesPayment.count.mockResolvedValue(0);

            const createdPayment = {
                id: "pay-001",
                paymentNumber: "PAY-IN-2602-0001",
                amount: 500,
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    salesPayment: { create: vi.fn().mockResolvedValue(createdPayment) },
                    salesInvoice: { update: vi.fn().mockResolvedValue({}) },
                    integrationOutbox: { create: vi.fn().mockResolvedValue({ id: "outbox-001" }) },
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (cb as any)(tx);
            });

            const result = await SalesPaymentService.create(MOCK_PAYMENT_INPUT, MOCK_USER_ID);

            expect(result.id).toBe("pay-001");
            expect(enqueueIntegrationEventMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    type: "SALES_PAYMENT_CREATED",
                    aggregateType: "SalesPayment",
                }),
            );
        });

        it("throws when invoice not found", async () => {
            prismaMock.salesInvoice.findUnique.mockResolvedValue(null);

            await expect(
                SalesPaymentService.create(MOCK_PAYMENT_INPUT, MOCK_USER_ID),
            ).rejects.toThrow("Invoice not found");
        });

        it("throws when amount exceeds remaining balance", async () => {
            prismaMock.salesInvoice.findUnique.mockResolvedValue({
                id: "inv-001",
                totalAmount: 500,
                payments: [{ amount: 400 }],
            });
            prismaMock.cashAccount.findUnique.mockResolvedValue({ id: "cash-001" });

            await expect(
                SalesPaymentService.create(
                    { ...MOCK_PAYMENT_INPUT, amount: 200 },
                    MOCK_USER_ID,
                ),
            ).rejects.toThrow("Amount exceeds remaining balance");
        });
    });
});
