import { Prisma } from "@/prisma/generated/prisma/client";
import { Decimal } from "decimal.js";

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
  price: Decimal;
  cost: Decimal;
  averageCost: Decimal;
  purchaseConversionFactor: Decimal;
  salesConversionFactor: Decimal;
  inventory?: {
    quantity: number;
    unitCost: Decimal;
  }[];
  priceHistory?: {
    id: string;
    price: Decimal;
    effectiveDate: Date;
  }[];
};

export type ProductInput = {
  name: string;
  sku: string;
  description?: string | null;
  image?: string | null;
  categoryId?: string | null;
  price: number | string;
  cost: number | string;
  minStock: number;
  isActive: boolean;
  baseUnitId?: string | null;
  purchaseUnitId?: string | null;
  purchaseConversionFactor?: number | string;
  salesUnitId?: string | null;
  salesConversionFactor?: number | string;
  inventoryAccountId?: string | null;
  cogsAccountId?: string | null;
  salesAccountId?: string | null;
  payableAccountId?: string | null;
  receivableAccountId?: string | null;
};
