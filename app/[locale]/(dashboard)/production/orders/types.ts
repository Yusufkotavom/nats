export interface ProductionOrderInput {
    billOfMaterialId?: string;
    productId: string;
    plannedQuantity: number;
    startDate?: Date;
    endDate?: Date;
    notes?: string;
}
