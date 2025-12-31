import { Prisma } from "@/prisma/generated/prisma/client";

export type PurchaseReceiveWithDetails = Prisma.PurchaseReceiveGetPayload<{
  include: {
    vendor: true;
    purchaseOrder: true;
    items: {
      include: {
        product: true;
      };
    };
  };
}>;

export interface PurchaseReceiveItemInput {
  productId: string;
  quantity: number;
  purchaseOrderItemId?: string;
}

export interface PurchaseReceiveInput {
  vendorId: string;
  purchaseOrderId?: string;
  receiveDate: Date;
  notes?: string;
  items: PurchaseReceiveItemInput[];
}
