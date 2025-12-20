import {
  Customer as PrismaCustomer,
  Vendor as PrismaVendor,
} from "@/prisma/generated/prisma/client";

export type Customer = PrismaCustomer;
export type Vendor = PrismaVendor;

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateCustomerInput = Omit<
  Customer,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export type CreateVendorInput = Omit<Vendor, "id" | "createdAt" | "updatedAt">;
export type UpdateVendorInput = Partial<CreateVendorInput>;
