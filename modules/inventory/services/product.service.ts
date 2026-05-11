import { Prisma } from "@/prisma/generated/prisma/client";
import { enqueueIntegrationEventOnce } from "@/modules/integration/outbox";
import { ProductInput } from "@/app/[locale]/(dashboard)/inventory/types";

export class ProductService {
    static async createProduct(tx: Prisma.TransactionClient, data: ProductInput) {
        const product = await tx.product.create({
            data: {
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

    static async updateProduct(tx: Prisma.TransactionClient, id: string, data: ProductInput) {
        const currentProduct = await tx.product.findUnique({
            where: { id },
            select: { price: true },
        });

        if (!currentProduct) {
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

        return updated;
    }

    static async deleteProduct(tx: Prisma.TransactionClient, id: string) {
        await tx.product.delete({
            where: { id },
        });
    }
}
