export type LocalPOSProduct = {
  id: string;
  name: string;
  sku: string;
  price: number;
  image: string | null;
  isService: boolean;
  categoryId: string | null;
  stock: number;
  categoryName: string | null;
  availableDiscounts: {
    code: string;
    type: "PERCENTAGE" | "FIXED_AMOUNT";
    value: number;
  }[];
};

export type LocalPOSContactOption = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address?: string | null;
};
