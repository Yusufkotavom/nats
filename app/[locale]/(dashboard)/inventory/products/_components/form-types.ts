export type ProductFormState = {
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  price: string | number;
  cost: string | number;
  minStock: number;
  isActive: boolean;
  showInPos: boolean;
  baseUnitId: string;
  purchaseUnitId: string;
  purchaseConversionFactor: string | number;
  salesUnitId: string;
  salesConversionFactor: string | number;
  image: string;
  taxRateId?: string;
};
