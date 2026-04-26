// Types
export type POSProduct = {
  id: string;
  name: string;
  sku: string;
  price: number;
  image: string | null;
  categoryId: string | null;
  stock: number;
  categoryName: string | null;
  availableDiscounts: {
    code: string;
    type: "PERCENTAGE" | "FIXED_AMOUNT";
    value: number;
  }[];
};

export type POSCartItem = POSProduct & {
  quantity: number;
  discount: number;
};
