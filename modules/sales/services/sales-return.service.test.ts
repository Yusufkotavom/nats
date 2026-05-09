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
    salesReturn: { count: vi.fn(), findUnique: vi.fn() },
    documentNumbering: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { SalesReturnService } from "./sales-return.service";

const MOCK_USER_ID = "user-001";

const MOCK_RETURN_INPUT = {
    returnNumber: "RET-001",
    contactId: "contact-001",
    returnDate: new Date("2026-02-16"),
    items: [
        { productId: "prod-001", quantity: 2, unitPrice: 100 },
    ],
};

describe("SalesReturnService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("create", () => {
        it("creates return and enqueues outbox event", async () => {
            prismaMock.salesReturn.findUnique.mockResolvedValue(null);

            const createdReturn = {
                id: "ret-001",
                returnNumber: "RET-001",
                totalAmount: 200,
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    salesReturn: { create: vi.fn().mockResolvedValue(createdReturn) },
                    integrationOutbox: { create: vi.fn().mockResolvedValue({ id: "outbox-001" }) },
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (cb as any)(tx);
            });

            const result = await SalesReturnService.create(MOCK_RETURN_INPUT, MOCK_USER_ID);

            expect(result.id).toBe("ret-001");
            expect(enqueueIntegrationEventMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    type: "SALES_RETURN_CREATED",
                    aggregateType: "SalesReturn",
                }),
            );
        });

        it("throws when return number already exists", async () => {
            prismaMock.salesReturn.findUnique.mockResolvedValue({ id: "existing" });

            await expect(
                SalesReturnService.create(MOCK_RETURN_INPUT, MOCK_USER_ID),
            ).rejects.toThrow("Return number already exists");
        });

        it("auto-generates return number when not provided", async () => {
            prismaMock.salesReturn.count.mockResolvedValue(3);
            prismaMock.salesReturn.findUnique.mockResolvedValue(null);

            const createdReturn = {
                id: "ret-002",
                returnNumber: "RET-2602-0004",
                totalAmount: 200,
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    salesReturn: { create: vi.fn().mockResolvedValue(createdReturn) },
                    integrationOutbox: { create: vi.fn().mockResolvedValue({ id: "outbox-002" }) },
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (cb as any)(tx);
            });

            const { returnNumber: _rn, ...inputWithoutNumber } = MOCK_RETURN_INPUT;
            const result = await SalesReturnService.create(
                { ...inputWithoutNumber, returnNumber: "" },
                MOCK_USER_ID,
            );

            expect(result.returnNumber).toBe("RET-2602-0004");
            expect(prismaMock.salesReturn.count).toHaveBeenCalledOnce();
        });
    });
});
