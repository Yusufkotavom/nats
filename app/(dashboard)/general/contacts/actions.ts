"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  CreateContactInput,
  UpdateContactInput,
  PaginatedResult,
  Contact,
} from "../types";
import { Prisma, ContactType } from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";

/**
 * Fetch contacts with pagination and search.
 *
 * @param page     - Page number (default: 1)
 * @param pageSize - Items per page (default: 10)
 * @param search   - Search term for name, email, or phone
 * @param type     - Optional filter by contact type
 * @returns        - Object containing contacts list and pagination metadata
 */
export async function getContacts({
  page = 1,
  pageSize = 10,
  search = "",
  type,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: ContactType;
} = {}): Promise<PaginatedResult<Contact>> {
  const skip = (page - 1) * pageSize;

  const where: Prisma.ContactWhereInput = {
    ...(type ? { type } : {}),
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

export const createContact = authorizedAction(
  "contacts.create",
  async (data: CreateContactInput) => {
    try {
      const contact = await prisma.contact.create({
        data,
      });
      revalidatePath("/general/contacts");
      return { success: true, contact };
    } catch (error) {
      console.error("Failed to create contact:", error);
      return { success: false, error: "Failed to create contact" };
    }
  }
);

export const updateContact = authorizedAction(
  "contacts.edit",
  async (id: string, data: UpdateContactInput) => {
    try {
      const contact = await prisma.contact.update({
        where: { id },
        data,
      });
      revalidatePath("/general/contacts");
      return { success: true, contact };
    } catch (error) {
      console.error("Failed to update contact:", error);
      return { success: false, error: "Failed to update contact" };
    }
  }
);

export const deleteContact = authorizedAction(
  "contacts.delete",
  async (id: string) => {
    try {
      await prisma.contact.delete({
        where: { id },
      });
      revalidatePath("/general/contacts");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete contact:", error);
      return { success: false, error: "Failed to delete contact" };
    }
  }
);
