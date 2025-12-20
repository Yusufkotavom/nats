"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  CreateVendorInput,
  UpdateVendorInput,
  PaginatedResult,
  Vendor,
} from "../types";
import { Prisma } from "@/prisma/generated/prisma/client";

export async function getVendors({
  page = 1,
  pageSize = 10,
  search = "",
}: {
  page?: number;
  pageSize?: number;
  search?: string;
} = {}): Promise<PaginatedResult<Vendor>> {
  const skip = (page - 1) * pageSize;

  const where: Prisma.VendorWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.vendor.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function createVendor(data: CreateVendorInput) {
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

export async function updateVendor(id: string, data: UpdateVendorInput) {
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
