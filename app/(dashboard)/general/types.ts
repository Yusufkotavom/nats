import {
  Contact,
  ContactType,
} from "@/prisma/generated/prisma/client";

export type { Contact, ContactType };
export type Customer = Contact;
export type Vendor = Contact;

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateCustomerInput = Omit<
  Contact,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export type CreateVendorInput = Omit<Contact, "id" | "createdAt" | "updatedAt">;
export type UpdateVendorInput = Partial<CreateVendorInput>;
