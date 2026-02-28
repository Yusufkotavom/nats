export interface ProductionReceiptInput {
    productionOrderId: string;
    receiptDate: Date;
    notes?: string;
    items: {
        productId: string;
        quantity: number;
        notes?: string;
    }[];
}
