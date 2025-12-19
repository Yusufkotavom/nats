"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getVendors() {
  return await prisma.vendor.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createVendor(data: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
}) {
  try {
    const vendor = await prisma.vendor.create({
      data,
    });
    revalidatePath("/general/vendors");
    return { success: true, vendor };
  } catch (error) {
    console.error("Failed to create vendor:", error);
    return { success: false, error: "Failed to create vendor" };
  }
}

export async function updateVendor(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    isActive?: boolean;
  }
) {
  try {
    const vendor = await prisma.vendor.update({
      where: { id },
      data,
    });
    revalidatePath("/general/vendors");
    return { success: true, vendor };
  } catch (error) {
    console.error("Failed to update vendor:", error);
    return { success: false, error: "Failed to update vendor" };
  }
}

export async function deleteVendor(id: string) {
  try {
    await prisma.vendor.delete({
      where: { id },
    });
    revalidatePath("/general/vendors");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete vendor:", error);
    return { success: false, error: "Failed to delete vendor" };
  }
}
