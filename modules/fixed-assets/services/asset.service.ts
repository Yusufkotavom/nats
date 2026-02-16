import { prisma } from "@/lib/prisma";
import { Asset, AssetStatus, DepreciationMethod, Prisma } from "@/prisma/generated/prisma/client";
import { Decimal } from "decimal.js";
import { enqueueIntegrationEvent } from "@/modules/integration/outbox";

export type CreateAssetParams = {
    code: string;
    name: string;
    description?: string;
    serialNumber?: string;
    barcode?: string;
    purchaseDate: Date;
    acquisitionCost: number;
    residualValue: number;
    usefulLife: number;
    depreciationMethod: DepreciationMethod;
    categoryId: string;
    location?: string;
    department?: string;
    assignedTo?: string;
    userId: string;
};

export type UpdateAssetParams = Partial<CreateAssetParams> & { userId: string };

export class AssetService {
    static async getAssets() {
        return await prisma.asset.findMany({
            include: {
                category: true,
            },
            orderBy: { createdAt: "desc" },
        });
    }

    static async getAsset(id: string) {
        return await prisma.asset.findUnique({
            where: { id },
            include: {
                category: true,
                depreciationSchedules: {
                    orderBy: { date: "asc" },
                },
                disposal: true,
            },
        });
    }

    static async createAsset(params: CreateAssetParams): Promise<Asset> {
        return await prisma.$transaction(async (tx) => {
            const asset = await tx.asset.create({
                data: {
                    code: params.code,
                    name: params.name,
                    description: params.description,
                    serialNumber: params.serialNumber,
                    barcode: params.barcode,
                    purchaseDate: params.purchaseDate,
                    acquisitionCost: new Decimal(params.acquisitionCost),
                    residualValue: new Decimal(params.residualValue),
                    usefulLife: params.usefulLife,
                    depreciationMethod: params.depreciationMethod,
                    categoryId: params.categoryId,
                    location: params.location,
                    department: params.department,
                    assignedTo: params.assignedTo,
                    currentBookValue: new Decimal(params.acquisitionCost),
                    status: AssetStatus.DRAFT,
                },
            });

            await enqueueIntegrationEvent(tx, {
                topic: "fixed-assets",
                type: "ASSET_CREATED",
                aggregateType: "ASSET",
                aggregateId: asset.id,
                payload: {
                    assetId: asset.id,
                    code: asset.code,
                    name: asset.name,
                    acquisitionCost: asset.acquisitionCost.toString(),
                    userId: params.userId,
                },
            });

            return asset;
        });
    }

    static async updateAsset(id: string, params: UpdateAssetParams): Promise<Asset> {
        return await prisma.$transaction(async (tx) => {
            const updateData: Prisma.AssetUpdateInput = {
                ...params,
            };

            if (params.acquisitionCost !== undefined) {
                updateData.acquisitionCost = new Decimal(params.acquisitionCost);
            }
            if (params.residualValue !== undefined) {
                updateData.residualValue = new Decimal(params.residualValue);
            }

            // Remove userId from updateData as it's not part of the Asset model
            delete (updateData as any).userId;

            const asset = await tx.asset.update({
                where: { id },
                data: updateData,
            });

            await enqueueIntegrationEvent(tx, {
                topic: "fixed-assets",
                type: "ASSET_UPDATED",
                aggregateType: "ASSET",
                aggregateId: asset.id,
                payload: {
                    assetId: asset.id,
                    code: asset.code,
                    userId: params.userId,
                },
            });

            return asset;
        });
    }

    static async activateAsset(id: string, userId: string): Promise<Asset> {
        return await prisma.$transaction(async (tx) => {
            const asset = await tx.asset.update({
                where: { id },
                data: { status: AssetStatus.ACTIVE },
            });

            await enqueueIntegrationEvent(tx, {
                topic: "fixed-assets",
                type: "ASSET_UPDATED",
                aggregateType: "ASSET",
                aggregateId: asset.id,
                payload: {
                    assetId: asset.id,
                    code: asset.code,
                    userId: userId,
                },
            });

            return asset;
        });
    }

    static async disposeAsset(
        id: string,
        params: {
            date: Date;
            amount: number;
            reason: string;
            userId: string;
        }
    ): Promise<void> {
        await prisma.$transaction(async (tx) => {
            const asset = await tx.asset.findUnique({
                where: { id },
            });

            if (!asset) throw new Error("Asset not found");

            const saleAmount = new Decimal(params.amount);
            const bookValue = asset.currentBookValue;
            const gainLoss = saleAmount.minus(bookValue);

            await tx.assetDisposal.create({
                data: {
                    assetId: id,
                    date: params.date,
                    disposalAmount: saleAmount,
                    bookValue,
                    gainLoss,
                    reason: params.reason,
                },
            });

            await tx.asset.update({
                where: { id },
                data: {
                    status: AssetStatus.SOLD,
                    currentBookValue: new Decimal(0),
                },
            });

            await enqueueIntegrationEvent(tx, {
                topic: "fixed-assets",
                type: "ASSET_DISPOSED",
                aggregateType: "ASSET",
                aggregateId: asset.id,
                payload: {
                    assetId: asset.id,
                    code: asset.code,
                    disposalAmount: saleAmount.toString(),
                    gainLoss: gainLoss.toString(),
                    userId: params.userId,
                },
            });
        });
    }
}
