export interface ProductionIssueInput {
    productionOrderId: string;
    issueDate: Date;
    notes?: string;
    items: {
        productId: string;
        quantity: number;
        notes?: string;
    }[];
}
