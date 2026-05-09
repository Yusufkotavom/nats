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

const prismaMock = vi.hoisted(() => ({
    purchaseInvoice: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
    },
    purchasePayment: {
        count: vi.fn(),
    },
    cashAccount: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
    },
    documentNumbering: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { PurchasePaymentService } from "./purchase-payment.service";

const MOCK_USER_ID = "user-001";

const MOCK_PAYMENT_INPUT = {
    contactId: "contact-001",
    purchaseInvoiceId: "inv-001",
    paymentDate: new Date("2026-02-16"),
    amount: 500,
    cashAccountId: "cash-001",
    reference: "REF-001",
};

describe("PurchasePaymentService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("create", () => {
        it("creates payment and updates invoice status", async () => {
            prismaMock.purchaseInvoice.findUnique.mockResolvedValue({
                id: "inv-001",
                totalAmount: 1000,
                payments: [{ amount: 300 }],
            });
            prismaMock.cashAccount.findUnique.mockResolvedValue({ id: "cash-001" });
            prismaMock.purchasePayment.count.mockResolvedValue(0);

            const createdPayment = {
                id: "pay-001",
                paymentNumber: "PAY-OUT-2602-0001",
                amount: 500,
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    purchasePayment: {
                        create: vi.fn().mockResolvedValue(createdPayment),
                    },
                    purchaseInvoice: {
                        update: vi.fn(),
                    },
                    integrationOutbox: {
                        create: vi.fn().mockResolvedValue({ id: "outbox-001" }),
                    },
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (cb as any)(tx);
            });

            const result = await PurchasePaymentService.create(MOCK_PAYMENT_INPUT, MOCK_USER_ID);

            expect(result.id).toBe("pay-001");
        });

        it("throws when invoice not found", async () => {
            prismaMock.purchaseInvoice.findUnique.mockResolvedValue(null);

            await expect(
                PurchasePaymentService.create(MOCK_PAYMENT_INPUT, MOCK_USER_ID),
            ).rejects.toThrow("Invoice not found");
        });

        it("throws when amount exceeds remaining balance", async () => {
            prismaMock.purchaseInvoice.findUnique.mockResolvedValue({
                id: "inv-001",
                totalAmount: 500,
                payments: [{ amount: 400 }],
            });
            prismaMock.cashAccount.findUnique.mockResolvedValue({ id: "cash-001" });

            await expect(
                PurchasePaymentService.create(
                    { ...MOCK_PAYMENT_INPUT, amount: 200 },
                    MOCK_USER_ID,
                ),
            ).rejects.toThrow("Amount exceeds remaining balance");
        });

        it("enqueues PURCHASE_PAYMENT_CREATED integration event", async () => {
            prismaMock.purchaseInvoice.findUnique.mockResolvedValue({
                id: "inv-001",
                totalAmount: 1000,
                payments: [],
            });
            prismaMock.cashAccount.findUnique.mockResolvedValue({ id: "cash-001" });
            prismaMock.purchasePayment.count.mockResolvedValue(0);

            const createdPayment = {
                id: "pay-002",
                paymentNumber: "PAY-OUT-2602-0001",
                amount: 500,
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    purchasePayment: {
                        create: vi.fn().mockResolvedValue(createdPayment),
                    },
                    purchaseInvoice: {
                        update: vi.fn(),
                    },
                    integrationOutbox: {
                        create: vi.fn().mockResolvedValue({ id: "outbox-002" }),
                    },
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (cb as any)(tx);
            });

            await PurchasePaymentService.create(MOCK_PAYMENT_INPUT, MOCK_USER_ID);

            expect(enqueueIntegrationEventMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    type: "PURCHASE_PAYMENT_CREATED",
                    aggregateType: "PurchasePayment",
                    payload: expect.objectContaining({
                        paymentId: "pay-002",
                        userId: MOCK_USER_ID,
                    }),
                }),
            );
        });
    });
});
