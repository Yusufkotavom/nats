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
    generateDocumentNumber: vi.fn().mockResolvedValue("SHP-TEST-0001"),
}));

const prismaMock = vi.hoisted(() => ({
    salesShipment: { count: vi.fn() },
    documentNumbering: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { SalesShipmentService } from "./sales-shipment.service";

const MOCK_USER_ID = "user-001";

const MOCK_SHIPMENT_INPUT = {
    contactId: "contact-001",
    salesOrderId: "order-001",
    shipmentDate: new Date("2026-02-16"),
    items: [
        { productId: "prod-001", quantity: 5 },
    ],
};

describe("SalesShipmentService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("create", () => {
        it("creates shipment and enqueues outbox event", async () => {
            prismaMock.salesShipment.count.mockResolvedValue(0);

            const createdShipment = {
                id: "shp-001",
                shipmentNumber: "SHP-2602-0001",
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    salesShipment: { create: vi.fn().mockResolvedValue(createdShipment) },
                    integrationOutbox: { create: vi.fn().mockResolvedValue({ id: "outbox-001" }) },
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (cb as any)(tx);
            });

            const result = await SalesShipmentService.create(MOCK_SHIPMENT_INPUT, MOCK_USER_ID);

            expect(result.id).toBe("shp-001");
            expect(enqueueIntegrationEventMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    type: "SALES_SHIPMENT_CREATED",
                    aggregateType: "SalesShipment",
                    payload: expect.objectContaining({
                        shipmentId: "shp-001",
                        salesOrderId: "order-001",
                        userId: MOCK_USER_ID,
                    }),
                }),
            );
        });

        it("auto-generates shipment number", async () => {
            const createdShipment = {
                id: "shp-002",
                shipmentNumber: "SHP-2602-0006",
            };

            prismaMock.$transaction.mockImplementation(async (cb: unknown) => {
                const tx = {
                    salesShipment: { create: vi.fn().mockResolvedValue(createdShipment) },
                    integrationOutbox: { create: vi.fn().mockResolvedValue({ id: "outbox-002" }) },
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (cb as any)(tx);
            });

            const result = await SalesShipmentService.create(MOCK_SHIPMENT_INPUT, MOCK_USER_ID);

            expect(result.shipmentNumber).toBe("SHP-2602-0006");
        });
    });
});
