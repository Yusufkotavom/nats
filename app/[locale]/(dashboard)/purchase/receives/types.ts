import { Prisma } from "@/prisma/generated/prisma/client";

export type PurchaseReceiveWithDetails = Prisma.PurchaseReceiveGetPayload<{
  include: {
    contact: true;
    purchaseOrder: true;
    items: {
      include: {
        product: {
          include: {
            baseUnit: true;
            purchaseUnit: true,
          };
        };
      };
    };
    attachments: true;
  };
}>;

export interface PurchaseReceiveItemInput {
  productId: string;
  quantity: number;
  purchaseOrderItemId?: string;
}

export interface PurchaseReceiveInput {
  contactId: string;
  purchaseOrderId?: string;
  departmentId?: string | null;
  projectId?: string | null;
  receiveDate: Date;
  notes?: string;
  items: PurchaseReceiveItemInput[];
  attachmentIds?: string[];
}
