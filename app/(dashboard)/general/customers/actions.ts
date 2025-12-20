"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  PaginatedResult,
  Customer,
} from "../types";
import { Prisma } from "@prisma/client";
import { authorizedAction } from "@/lib/auth/protected-action";

export async function getCustomers({
  page = 1,
  pageSize = 10,
  search = "",
}: {
  page?: number;
  pageSize?: number;
  search?: string;
} = {}): Promise<PaginatedResult<Customer>> {
  const skip = (page - 1) * pageSize;

  const where: Prisma.CustomerWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export const createCustomer = authorizedAction(
  "customers.create",
  async (data: CreateCustomerInput) => {
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
);

export const updateCustomer = authorizedAction(
  "customers.edit",
  async (id: string, data: UpdateCustomerInput) => {
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
);

export const deleteCustomer = authorizedAction(
  "customers.delete",
  async (id: string) => {
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
);
