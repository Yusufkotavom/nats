import { DiscountType, Prisma } from "@/prisma/generated/prisma/client";

export type PricingProductWithDetails = Prisma.ProductGetPayload<{
  select: {
    id: true;
    name: true;
    sku: true;
    price: true;
    cost: true;
    category: {
      select: { name: true };
    };
    discounts: true;
  };
}>;

export type PricingScope = "ALL" | "CATEGORY";
export type PricingAction =
  | "PERCENTAGE_INC"
  | "PERCENTAGE_DEC"
  | "COST_MARGIN"
  | "FIXED_AMOUNT_INC"
  | "FIXED_AMOUNT_DEC";

export interface BatchPricingInput {
  scope: PricingScope;
  categoryId?: string;
  action: PricingAction;
  value: number;
}

export type PriceCalculationResult = {
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
  appliedDiscount?: {
    code: string;
    description?: string | null;
    value: number;
    type: DiscountType;
  };
};
