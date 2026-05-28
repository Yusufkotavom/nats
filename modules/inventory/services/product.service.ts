import { Prisma } from "@/prisma/generated/prisma/client";
import { enqueueIntegrationEventOnce } from "@/modules/integration/outbox";
import { ProductInput } from "@/app/[locale]/(dashboard)/inventory/types";
import { InventoryService } from "@/modules/inventory/services/inventory.service";

export class ProductService {
    static async createProduct(
        tx: Prisma.TransactionClient,
        data: ProductInput,
        companyId: string,
    ) {
        const product = await tx.product.create({
            data: {
                companyId,
                name: data.name,
                sku: data.sku,
                description: data.description,
                image: data.image,
                categoryId: data.categoryId,
                price: data.price,
                cost: data.cost,
                minStock: data.minStock,
                isActive: data.isActive,
                showInPos: data.showInPos ?? true,
                isService: data.isService ?? false,
                manageStock: data.manageStock ?? true,
                baseUnitId: data.baseUnitId,
                purchaseUnitId: data.purchaseUnitId,
                purchaseConversionFactor: data.purchaseConversionFactor,
                salesUnitId: data.salesUnitId,
                salesConversionFactor: data.salesConversionFactor,
                taxRateId: data.taxRateId,
            },
        });

        // Add initial price history
        await tx.priceHistory.create({
            data: {
                productId: product.id,
                price: data.price,
                effectiveDate: new Date(),
            },
        });

        // Emit Integration Event
        await enqueueIntegrationEventOnce(tx, {
            topic: "INVENTORY",
            type: "PRODUCT_CREATED",
            aggregateType: "PRODUCT",
            aggregateId: product.id,
            payload: {
                productId: product.id,
                name: product.name,
                sku: product.sku,
            },
        });

        return product;
    }

    static async updateProduct(
        tx: Prisma.TransactionClient,
        id: string,
        data: ProductInput,
        companyId: string,
    ) {
        const currentProduct = await tx.product.findUnique({
            where: { id },
            select: { price: true, companyId: true },
        });

        if (!currentProduct || currentProduct.companyId !== companyId) {
            throw new Error("Product not found");
        }

        const newPrice = data.price;
        const oldPrice = currentProduct.price;

        const updated = await tx.product.update({
            where: { id },
            data: {
                name: data.name,
                sku: data.sku,
                description: data.description,
                categoryId: data.categoryId,
                price: newPrice,
                cost: data.cost,
                minStock: data.minStock,
                isActive: data.isActive,
                showInPos: data.showInPos ?? true,
                isService: data.isService ?? false,
                manageStock: data.manageStock ?? true,
                baseUnitId: data.baseUnitId,
                purchaseUnitId: data.purchaseUnitId,
                purchaseConversionFactor: data.purchaseConversionFactor,
                salesUnitId: data.salesUnitId,
                salesConversionFactor: data.salesConversionFactor,
                taxRateId: data.taxRateId,
            },
        });

        if (!oldPrice.equals(newPrice)) {
            await tx.priceHistory.create({
                data: {
                    productId: id,
                    price: newPrice,
                    effectiveDate: new Date(),
                },
            });
        }

        if (data.manageStock !== false && data.stockAdjustment?.warehouseId) {
            const warehouse = await tx.warehouse.findFirst({
                where: {
                    id: data.stockAdjustment.warehouseId,
                    companyId,
                },
                select: { id: true },
            });
            if (!warehouse) {
                throw new Error("Warehouse not found for stock adjustment");
            }

            const currentRows = await tx.inventory.findMany({
                where: {
                    productId: id,
                    warehouseId: data.stockAdjustment.warehouseId,
                },
                select: { quantity: true },
            });
            const currentStock = currentRows.reduce((sum, row) => sum + row.quantity, 0);
            const targetStock = Math.max(0, Number(data.stockAdjustment.targetStock || 0));
            const diff = targetStock - currentStock;

            if (diff !== 0) {
                await InventoryService.createInventoryMovement(tx, {
                    type: "ADJUSTMENT",
                    companyId,
                    warehouseId: data.stockAdjustment.warehouseId,
                    reference: `PRD-ADJ-${Date.now()}`,
                    notes: data.stockAdjustment.note || `Stock sync from product edit (${updated.sku})`,
                    status: "COMPLETED",
                    items: [
                        {
                            productId: id,
                            quantity: diff,
                            unitCost: Number(data.cost || 0),
                            notes: data.stockAdjustment.note || "Product edit stock update",
                        },
                    ],
                });
            }
        }

        return updated;
    }

    static async deleteProduct(
        tx: Prisma.TransactionClient,
        id: string,
        companyId: string,
    ) {
        const product = await tx.product.findUnique({
            where: { id },
            select: { id: true, companyId: true },
        });
        if (!product || product.companyId !== companyId) {
            throw new Error("Product not found");
        }

        await tx.product.delete({
            where: { id },
        });
    }
}
