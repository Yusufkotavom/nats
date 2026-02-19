"use server";

import { prisma } from "@/lib/prisma";
import { SuperJSON } from "@/lib/superjson";
import { AssetService } from "@/modules/fixed-assets/services/asset.service";
import { DepreciationService } from "@/modules/fixed-assets/services/depreciation.service";
import { CategoryService } from "@/modules/fixed-assets/services/category.service";
import { AssetStatus, DepreciationMethod } from "@/prisma/generated/prisma/client";
import { Decimal } from "decimal.js";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/auth";

// --- Types ---
export type AssetFormData = {
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
};

export type AssetCategoryFormData = {
  name: string;
  code: string;
  description?: string;
  defaultUsefulLife?: number;
  defaultMethod?: DepreciationMethod;
  assetAccountId: string;
  accumDepreciationAccountId: string;
  depreciationExpenseAccountId: string;
};

// --- Asset Actions ---

export async function getAssets() {
  const assets = await AssetService.getAssets();
  return SuperJSON.serialize(assets);
}

export async function getAsset(id: string) {
  const asset = await AssetService.getAsset(id);
  return asset ? SuperJSON.serialize(asset) : null;
}

export async function createAsset(data: AssetFormData) {
  try {
    const session = await getSession();
    if (!session?.userId) throw new Error("Unauthorized");

    const asset = await AssetService.createAsset({
      ...data,
      userId: session.userId,
    });

    // Calculate initial depreciation schedule (preview)
    const schedule = DepreciationService.calculateDepreciationSchedule(
      new Decimal(data.acquisitionCost),
      new Decimal(data.residualValue),
      data.usefulLife,
      data.depreciationMethod,
      data.purchaseDate
    );

    if (schedule.length > 0) {
      await prisma.depreciationSchedule.createMany({
        data: schedule.map((s) => ({
          assetId: asset.id,
          date: s.date,
          amount: s.amount,
          bookValueAfter: s.bookValueAfter,
        })),
      });
    }

    revalidatePath("/assets");
    return { success: true, data: SuperJSON.serialize(asset) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAsset(id: string, data: Partial<AssetFormData>) {
  try {
    const session = await getSession();
    if (!session?.userId) throw new Error("Unauthorized");

    const asset = await AssetService.updateAsset(id, {
      ...data,
      userId: session.userId,
    });

    // Recalculate schedule if key fields changed logic
    if (asset.status === AssetStatus.DRAFT) {
      await prisma.depreciationSchedule.deleteMany({ where: { assetId: id, isPosted: false } });

      const schedule = DepreciationService.calculateDepreciationSchedule(
        asset.acquisitionCost,
        asset.residualValue,
        asset.usefulLife,
        asset.depreciationMethod,
        asset.purchaseDate
      );

      if (schedule.length > 0) {
        await prisma.depreciationSchedule.createMany({
          data: schedule.map((s) => ({
            assetId: asset.id,
            date: s.date,
            amount: s.amount,
            bookValueAfter: s.bookValueAfter,
          })),
        });
      }
    }

    revalidatePath("/assets");
    revalidatePath(`/assets/${id}`);
    return { success: true, data: SuperJSON.serialize(asset) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function activateAsset(id: string) {
  try {
    const session = await getSession();
    if (!session?.userId) throw new Error("Unauthorized");

    await AssetService.activateAsset(id, session.userId);
    revalidatePath(`/assets/${id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function disposeAsset(
  id: string,
  date: Date,
  amount: number,
  reason: string,
  depositAccountId: string,
  userId: string
) {
  try {
    const session = await getSession();
    if (!session?.userId) throw new Error("Unauthorized");

    await AssetService.disposeAsset(id, {
      date,
      amount,
      reason,
      userId: session.userId,
    });

    revalidatePath(`/assets/${id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Category Actions ---

export async function getAssetCategories() {
  const categories = await CategoryService.getCategories();
  return SuperJSON.serialize(categories);
}

export async function createAssetCategory(data: AssetCategoryFormData) {
  try {
    const category = await CategoryService.createCategory(data);
    revalidatePath("/assets/categories");
    return { success: true, data: SuperJSON.serialize(category) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Depreciation Actions ---

export async function getDueDepreciationSchedules() {
  const schedules = await DepreciationService.getDueDepreciationSchedules();
  return SuperJSON.serialize(schedules);
}

export async function postDepreciationRun(scheduleIds: string[], userId: string) {
  try {
    const session = await getSession();
    if (!session?.userId) throw new Error("Unauthorized");

    let count = 0;
    for (const id of scheduleIds) {
      await DepreciationService.postDepreciation(id, session.userId);
      count++;
    }
    revalidatePath("/assets/depreciation");
    return { success: true, count };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
