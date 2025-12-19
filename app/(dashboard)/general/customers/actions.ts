"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getCustomers() {
  return await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createCustomer(data: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
}) {
  try {
    const customer = await prisma.customer.create({
      data,
    });
    revalidatePath("/general/customers");
    return { success: true, customer };
  } catch (error) {
    console.error("Failed to create customer:", error);
    return { success: false, error: "Failed to create customer" };
  }
}

export async function updateCustomer(
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
    const customer = await prisma.customer.update({
      where: { id },
      data,
    });
    revalidatePath("/general/customers");
    return { success: true, customer };
  } catch (error) {
    console.error("Failed to update customer:", error);
    return { success: false, error: "Failed to update customer" };
  }
}

export async function deleteCustomer(id: string) {
  try {
    await prisma.customer.delete({
      where: { id },
    });
    revalidatePath("/general/customers");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete customer:", error);
    return { success: false, error: "Failed to delete customer" };
  }
}
