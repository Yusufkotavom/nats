// Types
export type POSProduct = {
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

export type POSCartItem = POSProduct & {
  quantity: number;
  discount: number;
};

export type POSDiningSpot = {
  id: string;
  spotCode: string;
  spotName: string;
  spotType: "TABLE" | "ROOM";
  status: "AVAILABLE" | "ORDERING" | "BILLING" | "CLOSED";
  area: {
    id: string;
    name: string;
  };
  _count?: {
    heldOrders: number;
  };
};
