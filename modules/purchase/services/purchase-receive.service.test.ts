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
    generateDocumentNumber: vi.fn().mockResolvedValue("RCV-TEST-0001"),
}));

const prismaMock = vi.hoisted(() => ({
    purchaseReceive: {
        count: vi.fn(),
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

import { PurchaseReceiveService } from "./purchase-receive.service";

const MOCK_USER_ID = "user-001";

const MOCK_RECEIVE_INPUT = {
    contactId: "contact-001",
    purchaseOrderId: "po-001",
    receiveDate: new Date("2026-02-16"),
    notes: "Test receive",
    items: [
        { productId: "prod-001", quantity: 5 },
        { productId: "prod-002", quantity: 3 },
    ],
};

describe("PurchaseReceiveService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("create", () => {
        it("creates receive with DRAFT status and generated number", async () => {
            const createdReceive = {
                id: "rcv-001",
                receiveNumber: "RCV-2602-0006",
                status: "DRAFT",
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    purchaseReceive: {
                        create: vi.fn().mockResolvedValue(createdReceive),
                    },
                    integrationOutbox: {
                        create: vi.fn().mockResolvedValue({ id: "outbox-001" }),
                    },
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (cb as any)(tx);
            });

            const result = await PurchaseReceiveService.create(MOCK_RECEIVE_INPUT, MOCK_USER_ID);

            expect(result.id).toBe("rcv-001");
        });

        it("enqueues PURCHASE_RECEIVE_CREATED integration event", async () => {
            const createdReceive = {
                id: "rcv-002",
                receiveNumber: "RCV-2602-0001",
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    purchaseReceive: {
                        create: vi.fn().mockResolvedValue(createdReceive),
                    },
                    integrationOutbox: {
                        create: vi.fn().mockResolvedValue({ id: "outbox-002" }),
                    },
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (cb as any)(tx);
            });

            await PurchaseReceiveService.create(MOCK_RECEIVE_INPUT, MOCK_USER_ID);

            expect(enqueueIntegrationEventMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    type: "PURCHASE_RECEIVE_CREATED",
                    aggregateType: "PurchaseReceive",
                    payload: expect.objectContaining({
                        receiveId: "rcv-002",
                        userId: MOCK_USER_ID,
                    }),
                }),
            );
        });
    });
});
