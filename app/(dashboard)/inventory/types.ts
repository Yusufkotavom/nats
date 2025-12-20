export type ProductFormData = {
  name: string;
  id: string;
  sku: string;
  description: string | null;
  categoryId: string | null;
  price: number;
  cost: number;
  minStock: number;
  inventory?: {
    quantity: number;
  }[];
  category: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  isActive: boolean;
};
