import { describe, it, expect, vi, beforeEach } from "vitest";
import { POSTransactionService } from "./pos-transaction.service";
import { Decimal } from "decimal.js";

// Mock dependencies
const enqueueIntegrationEventOnceMock = vi.hoisted(() => vi.fn());
const maybeProcessIntegrationOutboxEventMock = vi.hoisted(() => vi.fn());
const createInventoryMovementMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/integration/outbox", () => ({
    enqueueIntegrationEventOnce: enqueueIntegrationEventOnceMock,
    maybeProcessIntegrationOutboxEvent: maybeProcessIntegrationOutboxEventMock,
}));

vi.mock("@/modules/inventory/services/inventory.service", () => ({
    InventoryService: {
        createInventoryMovement: createInventoryMovementMock,
    },
}));

const prismaMock = vi.hoisted(() => ({
    $transaction: vi.fn(),
    pOSSession: {
        findUnique: vi.fn(),
    },
    contact: {
        findFirst: vi.fn(),
        create: vi.fn(),
    },
    salesOrder: {
        create: vi.fn(),
    },
    salesInvoice: {
        create: vi.fn(),
    },
    cashAccount: {
        findFirst: vi.fn(),
    },
    salesPayment: {
        create: vi.fn(),
    },
    salesShipment: {
        create: vi.fn(),
    },
    billOfMaterial: {
        findFirst: vi.fn(),
    },
    diningSpot: {
        findUnique: vi.fn(),
        update: vi.fn(),
    },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

describe("POSTransactionService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("process", () => {
        const mockSessionId = "session-1";
        const mockItems = [
            { productId: "prod-1", quantity: 2, price: 100, discount: 0 }
        ];
        const mockPaymentMethod = "CASH";
        const mockAmountPaid = 200;

        it("should process a POS transaction successfully", async () => {
            // Mock $transaction to execute callback immediately
            prismaMock.$transaction.mockImplementation(async (callback: any) => {
                return callback(prismaMock);
            });

            // Mock Session Validation
            prismaMock.pOSSession.findUnique.mockResolvedValue({
                id: mockSessionId,
                status: "OPEN",
                warehouseId: "wh-1",
                cashierId: "user-1"
            });

            // Mock Customer Resolution (Walk-in)
            prismaMock.contact.findFirst.mockResolvedValue({ id: "contact-walk-in", name: "Walk-in Customer" });

            // Mock Sales Order Creation
            const mockSalesOrder = {
                id: "so-1",
                orderNumber: "SO-POS-1",
                items: [{ id: "so-item-1", productId: "prod-1", quantity: 2 }]
            };
            prismaMock.salesOrder.create.mockResolvedValue(mockSalesOrder);

            // Mock Sales Invoice Creation
            const mockInvoice = {
                id: "inv-1",
                invoiceNumber: "INV-POS-1",
                invoiceDate: new Date(),
                totalAmount: new Decimal(200),
                globalDiscount: new Decimal(0)
            };
            prismaMock.salesInvoice.create.mockResolvedValue(mockInvoice);

            // Mock Cash Account
            prismaMock.cashAccount.findFirst.mockResolvedValue({ id: "cash-acc-1" });

            // Mock Payment Creation
            const mockPayment = {
                id: "pay-1",
                paymentNumber: "PAY-POS-1",
                paymentDate: new Date(),
                amount: new Decimal(200),
                reference: "INV-POS-1",
                cashAccountId: "cash-acc-1",
                contactId: "contact-walk-in",
                salesInvoiceId: "inv-1"
            };
            prismaMock.salesPayment.create.mockResolvedValue(mockPayment);

            // Mock Shipment Creation
            const mockShipment = {
                id: "shp-1",
                shipmentNumber: "SHP-POS-1",
                items: [{ productId: "prod-1", quantity: 2 }]
            };
            prismaMock.salesShipment.create.mockResolvedValue(mockShipment);
            prismaMock.billOfMaterial.findFirst.mockResolvedValue(null);

            // Mock Inventory Movement (Resolved via mock above)
            createInventoryMovementMock.mockResolvedValue({});

            // Mock Outbox Enqueue responses
            enqueueIntegrationEventOnceMock
                .mockResolvedValueOnce({ id: "outbox-inv", alreadyQueued: false }) // Invoice
                .mockResolvedValueOnce({ id: "outbox-pay", alreadyQueued: false }); // Payment

            // Mock Outbox Processing
            maybeProcessIntegrationOutboxEventMock.mockResolvedValue({ processed: true });

            // Execute
            const result = await POSTransactionService.process(
                mockSessionId,
                mockItems,
                mockPaymentMethod,
                mockAmountPaid
            );

            // Verifications

            // 1. Session Validated
            expect(prismaMock.pOSSession.findUnique).toHaveBeenCalledWith({ where: { id: mockSessionId } });

            // 2. Sales Order Created
            expect(prismaMock.salesOrder.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    contactId: "contact-walk-in",
                    posSessionId: mockSessionId,
                    totalAmount: new Decimal(200),
                })
            }));

            // 3. Invoice Created
            expect(prismaMock.salesInvoice.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    salesOrderId: "so-1",
                    totalAmount: new Decimal(200),
                })
            }));

            // 4. Payment Created
            expect(prismaMock.salesPayment.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    salesInvoiceId: "inv-1",
                    amount: new Decimal(200),
                    contactId: "contact-walk-in",
                })
            }));

            // 5. Shipment Created
            expect(prismaMock.salesShipment.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    salesOrderId: "so-1",
                })
            }));

            // 6. Inventory Movement Triggered
            expect(createInventoryMovementMock).toHaveBeenCalledWith(prismaMock, expect.objectContaining({
                type: "OUT",
                reference: "SHP-POS-1",
                warehouseId: "wh-1",
                items: expect.arrayContaining([
                    expect.objectContaining({ productId: "prod-1", quantity: 2 })
                ])
            }));

            // 7. Events Enqueued
            expect(enqueueIntegrationEventOnceMock).toHaveBeenCalledTimes(2); // Invoice + Payment

            // 8. Outbox Processed
            expect(maybeProcessIntegrationOutboxEventMock).toHaveBeenCalledTimes(2);
            expect(maybeProcessIntegrationOutboxEventMock).toHaveBeenCalledWith("outbox-inv");
            expect(maybeProcessIntegrationOutboxEventMock).toHaveBeenCalledWith("outbox-pay");

            expect(result.invoiceId).toBe("inv-1");
            expect(result.outbox.processed).toBe(true);
        });

        it("should consume ingredient stock from active BOM when available", async () => {
            prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
            prismaMock.pOSSession.findUnique.mockResolvedValue({
                id: mockSessionId,
                status: "OPEN",
                warehouseId: "wh-1",
                cashierId: "user-1",
            });
            prismaMock.contact.findFirst.mockResolvedValue({ id: "contact-walk-in", name: "Walk-in Customer" });
            prismaMock.salesOrder.create.mockResolvedValue({
                id: "so-1",
                orderNumber: "SO-POS-1",
                items: [{ id: "so-item-1", productId: "prod-1", quantity: 2 }],
            });
            prismaMock.salesInvoice.create.mockResolvedValue({
                id: "inv-1",
                invoiceNumber: "INV-POS-1",
                invoiceDate: new Date(),
                totalAmount: new Decimal(200),
                globalDiscount: new Decimal(0),
            });
            prismaMock.cashAccount.findFirst.mockResolvedValue({ id: "cash-acc-1" });
            prismaMock.salesPayment.create.mockResolvedValue({
                id: "pay-1",
                paymentNumber: "PAY-POS-1",
                paymentDate: new Date(),
                amount: new Decimal(200),
                reference: "INV-POS-1",
                cashAccountId: "cash-acc-1",
                contactId: "contact-walk-in",
                salesInvoiceId: "inv-1",
            });
            prismaMock.salesShipment.create.mockResolvedValue({
                id: "shp-1",
                shipmentNumber: "SHP-POS-1",
                items: [{ productId: "prod-1", quantity: 2 }],
            });
            prismaMock.billOfMaterial.findFirst.mockResolvedValue({
                id: "bom-1",
                items: [
                    { productId: "ing-1", quantity: new Decimal(3) },
                    { productId: "ing-2", quantity: new Decimal(1) },
                ],
            });
            createInventoryMovementMock.mockResolvedValue({});
            enqueueIntegrationEventOnceMock
                .mockResolvedValueOnce({ id: "outbox-inv", alreadyQueued: false })
                .mockResolvedValueOnce({ id: "outbox-pay", alreadyQueued: false });
            maybeProcessIntegrationOutboxEventMock.mockResolvedValue({ processed: true });

            await POSTransactionService.process(mockSessionId, mockItems, mockPaymentMethod, mockAmountPaid);

            expect(createInventoryMovementMock).toHaveBeenCalledWith(
                prismaMock,
                expect.objectContaining({
                    type: "OUT",
                    items: expect.arrayContaining([
                        expect.objectContaining({ productId: "ing-1", quantity: 6 }),
                        expect.objectContaining({ productId: "ing-2", quantity: 2 }),
                    ]),
                }),
            );
        });

        it("should fail if BOM consumption results in non-integer quantity", async () => {
            prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
            prismaMock.pOSSession.findUnique.mockResolvedValue({
                id: mockSessionId,
                status: "OPEN",
                warehouseId: "wh-1",
                cashierId: "user-1",
            });
            prismaMock.contact.findFirst.mockResolvedValue({ id: "contact-walk-in", name: "Walk-in Customer" });
            prismaMock.salesOrder.create.mockResolvedValue({
                id: "so-1",
                orderNumber: "SO-POS-1",
                items: [{ id: "so-item-1", productId: "prod-1", quantity: 2 }],
            });
            prismaMock.salesInvoice.create.mockResolvedValue({
                id: "inv-1",
                invoiceNumber: "INV-POS-1",
                invoiceDate: new Date(),
                totalAmount: new Decimal(200),
                globalDiscount: new Decimal(0),
            });
            prismaMock.cashAccount.findFirst.mockResolvedValue({ id: "cash-acc-1" });
            prismaMock.salesPayment.create.mockResolvedValue({
                id: "pay-1",
                paymentNumber: "PAY-POS-1",
                paymentDate: new Date(),
                amount: new Decimal(200),
                reference: "INV-POS-1",
                cashAccountId: "cash-acc-1",
                contactId: "contact-walk-in",
                salesInvoiceId: "inv-1",
            });
            prismaMock.salesShipment.create.mockResolvedValue({
                id: "shp-1",
                shipmentNumber: "SHP-POS-1",
                items: [{ productId: "prod-1", quantity: 2 }],
            });
            prismaMock.billOfMaterial.findFirst.mockResolvedValue({
                id: "bom-1",
                items: [{ productId: "ing-1", quantity: new Decimal(0.25) }],
            });

            await expect(
                POSTransactionService.process(mockSessionId, mockItems, mockPaymentMethod, mockAmountPaid),
            ).rejects.toThrow("Current inventory quantity only supports integer values");
        });

        it("should throw error if session is not open", async () => {
            prismaMock.$transaction.mockImplementation(async (callback: any) => {
                return callback(prismaMock);
            });

            prismaMock.pOSSession.findUnique.mockResolvedValue({
                id: mockSessionId,
                status: "CLOSED" // Closed
            });

            await expect(POSTransactionService.process(
                mockSessionId,
                mockItems,
                mockPaymentMethod,
                mockAmountPaid
            )).rejects.toThrow("Session is not open");
        });

        it("should reject checkout when dining spot is not active for billing", async () => {
            prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
            prismaMock.pOSSession.findUnique.mockResolvedValue({
                id: mockSessionId,
                status: "OPEN",
                warehouseId: "wh-1",
                cashierId: "user-1",
            });
            prismaMock.contact.findFirst.mockResolvedValue({ id: "contact-walk-in", name: "Walk-in Customer" });
            prismaMock.diningSpot.findUnique.mockResolvedValue({
                id: "spot-1",
                status: "AVAILABLE",
            });

            await expect(
                POSTransactionService.process(
                    mockSessionId,
                    mockItems,
                    mockPaymentMethod,
                    mockAmountPaid,
                    0,
                    undefined,
                    "spot-1",
                ),
            ).rejects.toThrow("Dining spot is not ready for billing");

            expect(prismaMock.salesOrder.create).not.toHaveBeenCalled();
            expect(prismaMock.diningSpot.update).not.toHaveBeenCalled();
        });

        it("should set dining spot to BILLING when checkout uses an active ordering spot", async () => {
            prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
            prismaMock.pOSSession.findUnique.mockResolvedValue({
                id: mockSessionId,
                status: "OPEN",
                warehouseId: "wh-1",
                cashierId: "user-1",
            });
            prismaMock.contact.findFirst.mockResolvedValue({ id: "contact-walk-in", name: "Walk-in Customer" });
            prismaMock.diningSpot.findUnique.mockResolvedValue({
                id: "spot-1",
                status: "ORDERING",
            });
            prismaMock.salesOrder.create.mockResolvedValue({
                id: "so-1",
                orderNumber: "SO-POS-1",
                items: [{ id: "so-item-1", productId: "prod-1", quantity: 2 }],
            });
            prismaMock.salesInvoice.create.mockResolvedValue({
                id: "inv-1",
                invoiceNumber: "INV-POS-1",
                invoiceDate: new Date(),
                totalAmount: new Decimal(200),
                globalDiscount: new Decimal(0),
            });
            prismaMock.cashAccount.findFirst.mockResolvedValue({ id: "cash-acc-1" });
            prismaMock.salesPayment.create.mockResolvedValue({
                id: "pay-1",
                paymentNumber: "PAY-POS-1",
                paymentDate: new Date(),
                amount: new Decimal(200),
                reference: "INV-POS-1",
                cashAccountId: "cash-acc-1",
                contactId: "contact-walk-in",
                salesInvoiceId: "inv-1",
            });
            prismaMock.salesShipment.create.mockResolvedValue({
                id: "shp-1",
                shipmentNumber: "SHP-POS-1",
                items: [{ productId: "prod-1", quantity: 2 }],
            });
            prismaMock.billOfMaterial.findFirst.mockResolvedValue(null);
            createInventoryMovementMock.mockResolvedValue({});
            enqueueIntegrationEventOnceMock
                .mockResolvedValueOnce({ id: "outbox-inv", alreadyQueued: false })
                .mockResolvedValueOnce({ id: "outbox-pay", alreadyQueued: false });
            maybeProcessIntegrationOutboxEventMock.mockResolvedValue({ processed: true });

            await POSTransactionService.process(
                mockSessionId,
                mockItems,
                mockPaymentMethod,
                mockAmountPaid,
                0,
                undefined,
                "spot-1",
            );

            expect(prismaMock.diningSpot.update).toHaveBeenCalledWith({
                where: { id: "spot-1" },
                data: { status: "BILLING" },
            });
        });
    });
});
