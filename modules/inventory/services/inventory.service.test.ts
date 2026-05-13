import { describe, it, expect, vi, beforeEach } from "vitest";
import { InventoryService, CreateInventoryMovementData } from "./inventory.service";
import { MovementType, Prisma } from "@/prisma/generated/prisma/client";
import { Decimal } from "decimal.js";

// Mock dependencies
const enqueueIntegrationEventOnceMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/integration/outbox", () => ({
    enqueueIntegrationEventOnce: enqueueIntegrationEventOnceMock,
}));

const prismaMock = {
    warehouse: {
        findFirst: vi.fn(),
    },
    inventoryMovement: {
        create: vi.fn(),
        update: vi.fn(),
        findUniqueOrThrow: vi.fn(),
    },
    inventoryMovementDetail: {
        create: vi.fn(),
    },
    inventory: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    product: {
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
    },
} as unknown as Prisma.TransactionClient;

describe("InventoryService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createInventoryMovement", () => {
        const mockDate = new Date("2024-01-01T00:00:00.000Z");

        it("should create an IN movement and update stock correctly", async () => {
            // Setup Mocks
            const input: CreateInventoryMovementData = {
                type: MovementType.IN,
                items: [
                    { productId: "prod-1", quantity: 10, unitCost: 100 }
                ],
                warehouseId: "wh-1",
                transactionDate: mockDate,
            };

            // 1. Warehouse resolution (mock provided warehouse)
            // 2. Create Movement Header
            const mockMovement = {
                id: "mov-1",
                type: MovementType.IN,
                transactionDate: mockDate,
                toWarehouseId: "wh-1",
            };
            (prismaMock.inventoryMovement.create as any).mockResolvedValue(mockMovement);

            // 3. Process Items & Update Inventory
            // Product lookup
            (prismaMock.product.findUniqueOrThrow as any).mockResolvedValue({ id: "prod-1", name: "Product 1" });

            // Existing inventory lookup
            (prismaMock.inventory.findFirst as any).mockResolvedValue({
                id: "inv-1",
                quantity: 5,
                unitCost: new Decimal(100)
            });

            // All inventory layers for avg cost calc
            (prismaMock.inventory.findMany as any).mockResolvedValue([
                { quantity: 5, unitCost: new Decimal(100) }
            ]);

            // Execute
            const result = await InventoryService.createInventoryMovement(prismaMock, input);

            // Verify Movement Creation
            expect(prismaMock.inventoryMovement.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: MovementType.IN,
                    toWarehouseId: "wh-1",
                    status: "COMPLETED",
                }),
            });

            // Verify Detail Creation
            expect(prismaMock.inventoryMovementDetail.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    inventoryMovementId: "mov-1",
                    productId: "prod-1",
                    quantity: 10,
                    unitCost: 100,
                }),
            });

            // Verify Inventory Update (IN adds to stock)
            expect(prismaMock.inventory.update).toHaveBeenCalledWith({
                where: { id: "inv-1" },
                data: {
                    quantity: { increment: 10 },
                    unitCost: new Decimal(100),
                },
            });

            // Verify Product Avg Cost Update
            // Initial: 5 @ 100 = 500
            // Incoming: 10 @ 100 = 1000
            // Total: 1500 / 15 = 100
            expect(prismaMock.product.update).toHaveBeenCalledWith({
                where: { id: "prod-1" },
                data: { averageCost: new Decimal(100) },
            });

            // Verify Outbox Event
            expect(enqueueIntegrationEventOnceMock).toHaveBeenCalledWith(prismaMock, expect.objectContaining({
                topic: "INVENTORY",
                type: "INVENTORY_MOVEMENT_CREATED",
                aggregateId: "mov-1",
            }));

            expect(result).toEqual(mockMovement);
        });

        it("should create an OUT movement and decrement stock if sufficient", async () => {
            // Setup Mocks
            const input: CreateInventoryMovementData = {
                type: MovementType.OUT,
                items: [
                    { productId: "prod-1", quantity: 2 }
                ],
                warehouseId: "wh-1",
                transactionDate: mockDate,
            };

            const mockMovement = {
                id: "mov-2",
                type: MovementType.OUT,
                transactionDate: mockDate,
                fromWarehouseId: "wh-1",
            };
            (prismaMock.inventoryMovement.create as any).mockResolvedValue(mockMovement);

            (prismaMock.product.findUniqueOrThrow as any).mockResolvedValue({ id: "prod-1", name: "Product 1" });

            (prismaMock.inventory.findFirst as any).mockResolvedValue({
                id: "inv-1",
                quantity: 10,
                unitCost: new Decimal(100)
            });

            // For OUT, findMany isn't needed for avg cost recalc if not IN?
            // Actually code fetches it anyway for currentTotalValue calculation in updateInventory, 
            // but avg cost update only happens on IN type.
            (prismaMock.inventory.findMany as any).mockResolvedValue([
                { quantity: 10, unitCost: new Decimal(100) }
            ]);


            // Execute
            await InventoryService.createInventoryMovement(prismaMock, input);

            // Verify Inventory Update (OUT decrements stock)
            expect(prismaMock.inventory.update).toHaveBeenCalledWith({
                where: { id: "inv-1" },
                data: {
                    quantity: { decrement: 2 },
                },
            });

            // Verify Outbox
            expect(enqueueIntegrationEventOnceMock).toHaveBeenCalled();
        });

        it("should throw error for OUT movement if insufficient stock", async () => {
            // Setup Mocks
            const input: CreateInventoryMovementData = {
                type: MovementType.OUT,
                items: [
                    { productId: "prod-1", quantity: 20 } // Requesting 20
                ],
                warehouseId: "wh-1",
            };

            const mockMovement = { id: "mov-3", type: MovementType.OUT };
            (prismaMock.inventoryMovement.create as any).mockResolvedValue(mockMovement);

            (prismaMock.product.findUniqueOrThrow as any).mockResolvedValue({ id: "prod-1", name: "Product 1", sku: "SKU-1" });

            // Available only 10
            (prismaMock.inventory.findFirst as any).mockResolvedValue({
                id: "inv-1",
                quantity: 10,
            });
            (prismaMock.inventory.findMany as any).mockResolvedValue([
                { quantity: 10, unitCost: new Decimal(100) }
            ]);

            // Execute & Expect Error
            await expect(InventoryService.createInventoryMovement(prismaMock, input))
                .rejects
                .toThrow("Insufficient stock for product Product 1 (SKU: SKU-1). Available: 10, Requested: 20");

            // Should NOT emit event or create details? 
            // Actually details are created before updateInventory in the service code (lines 69-95)
            // But if updateInventory throws, the whole transaction would fail in real usage.
            // Since we are mocking the transaction client, we just verify the throw.
        });

        it("should persist warehouse on ADJUSTMENT movement header", async () => {
            const input: CreateInventoryMovementData = {
                type: MovementType.ADJUSTMENT,
                items: [{ productId: "prod-1", quantity: -1 }],
                warehouseId: "wh-1",
                transactionDate: mockDate,
            };

            (prismaMock.inventoryMovement.create as any).mockResolvedValue({
                id: "mov-adj-1",
                type: MovementType.ADJUSTMENT,
                transactionDate: mockDate,
                fromWarehouseId: "wh-1",
                toWarehouseId: "wh-1",
            });
            (prismaMock.product.findUniqueOrThrow as any).mockResolvedValue({
                id: "prod-1",
                name: "Product 1",
                sku: "SKU-1",
            });
            (prismaMock.inventory.findFirst as any).mockResolvedValue({
                id: "inv-1",
                quantity: 10,
                unitCost: new Decimal(100),
            });
            (prismaMock.inventory.findMany as any).mockResolvedValue([
                { quantity: 10, unitCost: new Decimal(100) },
            ]);

            await InventoryService.createInventoryMovement(prismaMock, input);

            expect(prismaMock.inventoryMovement.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: MovementType.ADJUSTMENT,
                    fromWarehouseId: "wh-1",
                    toWarehouseId: "wh-1",
                }),
            });
        });
    });
});
