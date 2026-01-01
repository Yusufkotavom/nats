import type { Contact } from "@/prisma/generated/prisma/client";
import { ContactType } from "@/prisma/generated/prisma/browser";

export type { Contact };
export { ContactType };
export type Customer = Contact;
export type Vendor = Contact;

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateContactInput = Omit<
  Contact,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateContactInput = Partial<CreateContactInput>;

export type CreateCustomerInput = CreateContactInput;
export type UpdateCustomerInput = UpdateContactInput;

export type CreateVendorInput = CreateContactInput;
export type UpdateVendorInput = UpdateContactInput;
