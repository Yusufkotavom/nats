"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  PaginatedResult,
  Customer,
} from "../types";
import { Prisma, ContactType } from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";

/**
 * Fetch customers with pagination and search.
 *
 * @param page     - Page number (default: 1)
 * @param pageSize - Items per page (default: 10)
 * @param search   - Search term for name, email, or phone
 * @returns        - Object containing customers list and pagination metadata
 */
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

  const where: Prisma.ContactWhereInput = {
    type: ContactType.CUSTOMER,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.contact.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Create a new customer.
 * Permission: "customers.create"
 *
 * @param data - The customer creation data
 * @returns    - Success flag or error
 */
export const createCustomer = authorizedAction(
  "customers.create",
  async (data: CreateCustomerInput) => {
    try {
      const customer = await prisma.contact.create({
        data: {
          ...data,
          type: ContactType.CUSTOMER,
        },
      });
      revalidatePath("/general/customers");
      return { success: true, customer };
    } catch (error) {
      console.error("Failed to create customer:", error);
      return { success: false, error: "Failed to create customer" };
    }
  }
);

/**
 * Update an existing customer.
 * Permission: "customers.edit"
 *
 * @param id   - The ID of the customer to update
 * @param data - The new customer data
 * @returns    - Success flag or error
 */
export const updateCustomer = authorizedAction(
  "customers.edit",
  async (id: string, data: UpdateCustomerInput) => {
    try {
      const customer = await prisma.contact.update({
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

/**
 * Delete a customer.
 * Permission: "customers.delete"
 *
 * @param id - The ID of the customer to delete
 * @returns  - Success flag or error
 */
export const deleteCustomer = authorizedAction(
  "customers.delete",
  async (id: string) => {
    try {
      await prisma.contact.delete({
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
