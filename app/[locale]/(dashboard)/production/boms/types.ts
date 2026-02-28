export interface BillOfMaterialInput {
    name: string;
    description?: string;
    productId: string;
    quantity: number;
    isActive: boolean;
    items: {
        productId: string;
        quantity: number;
        unitCost?: number;
        notes?: string;
    }[];
}
