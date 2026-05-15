"use server";

import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { SuperJSON } from "@/lib/superjson";
import { revalidatePath } from "next/cache";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { DiningSpotService } from "@/modules/pos/services/dining-spot.service";
import { prisma } from "@/lib/prisma";

async function assertRestaurantFeaturesEnabled() {
  const profile = await prisma.companyProfile.findFirst({
    select: { posEnableRestaurantFeatures: true },
  });
  if (profile?.posEnableRestaurantFeatures === false) {
    throw new Error("Restaurant features are disabled in POS settings");
  }
}

export async function getDiningSpotAdminData() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize({ areas: [] });
  }
  await assertRestaurantFeaturesEnabled();

  const areas = await DiningSpotService.getAreasWithSpots();
  return SuperJSON.serialize({ areas });
}

export const createDiningArea = authorizedAction(
  "pos.access",
  async (input: { name: string; code: string; sortOrder?: number; isActive?: boolean }) => {
    try {
      await assertRestaurantFeaturesEnabled();
      const created = await DiningSpotService.createArea(input);
      revalidatePath("/pos/dining-spots");
      revalidatePath("/pos");
      return { success: true, data: SuperJSON.serialize(created) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create dining area",
      };
    }
  },
);

export const updateDiningArea = authorizedAction(
  "pos.access",
  async (
    id: string,
    input: { name: string; code: string; sortOrder?: number; isActive?: boolean },
  ) => {
    try {
      await assertRestaurantFeaturesEnabled();
      const updated = await DiningSpotService.updateArea(id, input);
      revalidatePath("/pos/dining-spots");
      revalidatePath("/pos");
      return { success: true, data: SuperJSON.serialize(updated) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update dining area",
      };
    }
  },
);

export const deleteDiningArea = authorizedAction("pos.access", async (id: string) => {
  try {
    await assertRestaurantFeaturesEnabled();
    await DiningSpotService.deleteArea(id);
    revalidatePath("/pos/dining-spots");
    revalidatePath("/pos");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete dining area",
    };
  }
});

export const createDiningSpot = authorizedAction(
  "pos.access",
  async (input: {
    areaId: string;
    spotCode: string;
    spotName: string;
    spotType: "TABLE" | "ROOM";
    capacity?: number;
    isActive?: boolean;
  }) => {
    try {
      await assertRestaurantFeaturesEnabled();
      const created = await DiningSpotService.createSpot(input);
      revalidatePath("/pos/dining-spots");
      revalidatePath("/pos");
      return { success: true, data: SuperJSON.serialize(created) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create dining spot",
      };
    }
  },
);

export const updateDiningSpot = authorizedAction(
  "pos.access",
  async (
    id: string,
    input: {
      areaId: string;
      spotCode: string;
      spotName: string;
      spotType: "TABLE" | "ROOM";
      capacity?: number;
      isActive?: boolean;
    },
  ) => {
    try {
      await assertRestaurantFeaturesEnabled();
      const updated = await DiningSpotService.updateSpot(id, input);
      revalidatePath("/pos/dining-spots");
      revalidatePath("/pos");
      return { success: true, data: SuperJSON.serialize(updated) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update dining spot",
      };
    }
  },
);

export const deleteDiningSpot = authorizedAction("pos.access", async (id: string) => {
  try {
    await assertRestaurantFeaturesEnabled();
    await DiningSpotService.deleteSpot(id);
    revalidatePath("/pos/dining-spots");
    revalidatePath("/pos");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete dining spot",
    };
  }
});
