import { Prisma, PurchaseOrderStatus } from "@/prisma/generated/prisma/client";

export type PurchaseOrderWithDetails = Prisma.PurchaseOrderGetPayload<{
  include: {
    vendor: true;
    items: {
      include: {
        product: true;
      };
    };
  };
}>;

export type PurchaseOrderItemInput = {
  productId: string;
  quantity: number;
  unitCost: number;
};

export type PurchaseOrderInput = {
  vendorId: string;
  orderDate: Date;
  expectedDate?: Date | null;
  notes?: string | null;
  status?: PurchaseOrderStatus;
  items: PurchaseOrderItemInput[];
};
