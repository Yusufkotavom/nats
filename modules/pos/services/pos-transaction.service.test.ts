import { describe, it, expect, vi, beforeEach } from "vitest";
import { POSTransactionService } from "./pos-transaction.service";
import { Decimal } from "decimal.js";

// Mock dependencies
const enqueueIntegrationEventOnceMock = vi.hoisted(() => vi.fn());
const maybeProcessIntegrationOutboxEventMock = vi.hoisted(() => vi.fn());
const createInventoryMovementMock = vi.hoisted(() => vi.fn());
const getRequiredDefaultAccountMock = vi.hoisted(() => vi.fn());
const createJournalEntryMock = vi.hoisted(() => vi.fn());
const postJournalEntryMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/integration/outbox", () => ({
    enqueueIntegrationEventOnce: enqueueIntegrationEventOnceMock,
    maybeProcessIntegrationOutboxEvent: maybeProcessIntegrationOutboxEventMock,
}));

vi.mock("@/modules/inventory/services/inventory.service", () => ({
    InventoryService: {
        createInventoryMovement: createInventoryMovementMock,
    },
}));

vi.mock("@/lib/accounting/default-account.service", () => ({
    getRequiredDefaultAccount: getRequiredDefaultAccountMock,
}));

vi.mock("@/modules/accounting/services/journal.service", () => ({
    JournalService: {
        createJournalEntry: createJournalEntryMock,
        postJournalEntry: postJournalEntryMock,
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
        findUnique: vi.fn(),
        update: vi.fn(),
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
    product: {
        findUnique: vi.fn(),
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
        const zeroFeeBreakdown = {
            lines: [],
        };
        const feeBreakdownWithTaxAndFee = {
            lines: [
                { name: "Service", category: "FEE" as const, valueType: "PERCENTAGE" as const, value: 5, amount: 10 },
                { name: "Tax", category: "TAX" as const, valueType: "PERCENTAGE" as const, value: 10, amount: 20 },
            ],
        };

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
            prismaMock.product.findUnique.mockResolvedValue({
                averageCost: new Decimal(60),
                cost: new Decimal(50),
            });
            getRequiredDefaultAccountMock
                .mockResolvedValueOnce({ accountId: "acc-cogs" })
                .mockResolvedValueOnce({ accountId: "acc-inv" });
            createJournalEntryMock.mockResolvedValue({ id: "je-cogs-1" });
            postJournalEntryMock.mockResolvedValue(undefined);

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
                mockAmountPaid,
                0,
                zeroFeeBreakdown,
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

            // 8. COGS Journal Posted
            expect(createJournalEntryMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    description: expect.stringContaining("Cost of Goods Sold for POS Shipment"),
                }),
                "user-1",
                prismaMock,
            );
            expect(postJournalEntryMock).toHaveBeenCalledWith("je-cogs-1", prismaMock);

            // 9. Outbox Processed
            expect(maybeProcessIntegrationOutboxEventMock).toHaveBeenCalledTimes(2);
            expect(maybeProcessIntegrationOutboxEventMock).toHaveBeenCalledWith("outbox-inv");
            expect(maybeProcessIntegrationOutboxEventMock).toHaveBeenCalledWith("outbox-pay");

            expect(result.invoiceId).toBe("inv-1");
            expect(result.outbox.processed).toBe(true);
        });

        it("should include fee and tax payload in invoice outbox event", async () => {
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
                totalAmount: new Decimal(230),
                globalDiscount: new Decimal(0),
                totalTax: new Decimal(20),
                shippingCost: new Decimal(10),
            });
            prismaMock.cashAccount.findFirst.mockResolvedValue({ id: "cash-acc-1" });
            prismaMock.salesPayment.create.mockResolvedValue({
                id: "pay-1",
                paymentNumber: "PAY-POS-1",
                paymentDate: new Date(),
                amount: new Decimal(230),
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
            prismaMock.product.findUnique.mockResolvedValue({
                averageCost: new Decimal(60),
                cost: new Decimal(50),
            });
            getRequiredDefaultAccountMock
                .mockResolvedValueOnce({ accountId: "acc-cogs" })
                .mockResolvedValueOnce({ accountId: "acc-inv" });
            createJournalEntryMock.mockResolvedValue({ id: "je-cogs-1" });
            postJournalEntryMock.mockResolvedValue(undefined);
            createInventoryMovementMock.mockResolvedValue({});
            enqueueIntegrationEventOnceMock
                .mockResolvedValueOnce({ id: "outbox-inv", alreadyQueued: false })
                .mockResolvedValueOnce({ id: "outbox-pay", alreadyQueued: false });
            maybeProcessIntegrationOutboxEventMock.mockResolvedValue({ processed: true });

            await POSTransactionService.process(
                mockSessionId,
                mockItems,
                mockPaymentMethod,
                230,
                0,
                feeBreakdownWithTaxAndFee,
            );

            expect(enqueueIntegrationEventOnceMock).toHaveBeenNthCalledWith(
                1,
                prismaMock,
                expect.objectContaining({
                    type: "SALES_INVOICE_ISSUED",
                    payload: expect.objectContaining({
                        totalAmount: "230",
                        shippingCost: "10",
                        items: expect.arrayContaining([
                            expect.objectContaining({ tax: "20" }),
                        ]),
                    }),
                }),
            );
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
            prismaMock.product.findUnique
                .mockResolvedValueOnce({ averageCost: new Decimal(10), cost: new Decimal(8) })
                .mockResolvedValueOnce({ averageCost: new Decimal(5), cost: new Decimal(4) });
            getRequiredDefaultAccountMock
                .mockResolvedValueOnce({ accountId: "acc-cogs" })
                .mockResolvedValueOnce({ accountId: "acc-inv" });
            createJournalEntryMock.mockResolvedValue({ id: "je-cogs-2" });
            postJournalEntryMock.mockResolvedValue(undefined);
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
                zeroFeeBreakdown,
            );

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
                POSTransactionService.process(
                    mockSessionId,
                    mockItems,
                    mockPaymentMethod,
                    mockAmountPaid,
                    0,
                    zeroFeeBreakdown,
                ),
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
                mockAmountPaid,
                0,
                zeroFeeBreakdown,
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
                    zeroFeeBreakdown,
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
            prismaMock.product.findUnique.mockResolvedValue({
                averageCost: new Decimal(50),
                cost: new Decimal(40),
            });
            getRequiredDefaultAccountMock
                .mockResolvedValueOnce({ accountId: "acc-cogs" })
                .mockResolvedValueOnce({ accountId: "acc-inv" });
            createJournalEntryMock.mockResolvedValue({ id: "je-cogs-3" });
            postJournalEntryMock.mockResolvedValue(undefined);
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
                zeroFeeBreakdown,
                undefined,
                "spot-1",
            );

            expect(prismaMock.diningSpot.update).toHaveBeenCalledWith({
                where: { id: "spot-1" },
                data: { status: "BILLING" },
            });
        });

        it("should issue invoice without payment for deferred dine-in bill", async () => {
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
            prismaMock.salesShipment.create.mockResolvedValue({
                id: "shp-1",
                shipmentNumber: "SHP-POS-1",
                items: [{ productId: "prod-1", quantity: 2 }],
            });
            prismaMock.billOfMaterial.findFirst.mockResolvedValue(null);
            prismaMock.product.findUnique.mockResolvedValue({
                averageCost: new Decimal(60),
                cost: new Decimal(50),
            });
            getRequiredDefaultAccountMock
                .mockResolvedValueOnce({ accountId: "acc-cogs" })
                .mockResolvedValueOnce({ accountId: "acc-inv" });
            createJournalEntryMock.mockResolvedValue({ id: "je-cogs-4" });
            postJournalEntryMock.mockResolvedValue(undefined);
            createInventoryMovementMock.mockResolvedValue({});
            enqueueIntegrationEventOnceMock.mockResolvedValueOnce({ id: "outbox-inv", alreadyQueued: false });
            maybeProcessIntegrationOutboxEventMock.mockResolvedValue({ processed: true });

            const result = await POSTransactionService.issueInvoiceOnly(
                mockSessionId,
                mockItems,
                0,
                zeroFeeBreakdown,
            );

            expect(prismaMock.salesPayment.create).not.toHaveBeenCalled();
            expect(prismaMock.salesInvoice.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: "ISSUED",
                    }),
                }),
            );
            expect(result.invoiceId).toBe("inv-1");
        });

        it("settles issued invoice and updates remaining balance", async () => {
            prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
            prismaMock.pOSSession.findUnique.mockResolvedValue({
                id: mockSessionId,
                status: "OPEN",
                warehouseId: "wh-1",
                cashierId: "user-1",
            });
            prismaMock.salesInvoice.findUnique.mockResolvedValue({
                id: "inv-1",
                contactId: "contact-walk-in",
                invoiceNumber: "INV-POS-1",
                totalAmount: new Decimal(200),
                status: "ISSUED",
                payments: [],
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
            prismaMock.salesInvoice.update.mockResolvedValue({});
            enqueueIntegrationEventOnceMock.mockResolvedValueOnce({ id: "outbox-pay", alreadyQueued: false });
            maybeProcessIntegrationOutboxEventMock.mockResolvedValue({ processed: true });

            const result = await POSTransactionService.settleIssuedInvoice(
                mockSessionId,
                "inv-1",
                "CASH",
            );

            expect(prismaMock.salesInvoice.update).toHaveBeenCalledWith({
                where: { id: "inv-1" },
                data: { status: "PAID", balanceDue: new Decimal(0) },
            });
            expect(result.remainingBalance).toBe(0);
            expect(result.paymentId).toBe("pay-1");
        });
    });
});
