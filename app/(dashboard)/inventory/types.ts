import { Prisma } from "@/prisma/generated/prisma/client";

export type ProductFormData = Omit<
  Prisma.ProductGetPayload<{
    include: {
      category: true;
    };
  }>,
  "price" | "cost" | "createdAt" | "updatedAt"
> & {
  price: number;
  cost: number;
  inventory?: {
    quantity: number;
  }[];
};
