import { Prisma } from "@/prisma/generated/prisma/client";

export type ProductFormData = Omit<
  Prisma.ProductGetPayload<{
    include: {
      category: true;
      baseUnit: true;
      purchaseUnit: true;
      salesUnit: true;
    };
  }>,
  | "price"
  | "cost"
  | "averageCost"
  | "createdAt"
  | "updatedAt"
  | "purchaseConversionFactor"
  | "salesConversionFactor"
> & {
  price: number;
  cost: number;
  averageCost: number;
  purchaseConversionFactor: number;
  salesConversionFactor: number;
  inventory?: {
    quantity: number;
  }[];
  priceHistory?: {
    id: string;
    price: number;
    effectiveDate: Date;
  }[];
};

export type ProductInput = {
  name: string;
  sku: string;
  description?: string | null;
  image?: string | null;
  categoryId?: string | null;
  price: number;
  cost: number;
  minStock: number;
  isActive: boolean;
  baseUnitId?: string | null;
  purchaseUnitId?: string | null;
  purchaseConversionFactor?: number;
  salesUnitId?: string | null;
  salesConversionFactor?: number;
  inventoryAccountId?: string | null;
  cogsAccountId?: string | null;
  salesAccountId?: string | null;
  payableAccountId?: string | null;
  receivableAccountId?: string | null;
};
