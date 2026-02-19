import { Prisma, PurchaseOrderStatus } from "@/prisma/generated/prisma/client";

export type PurchaseOrderWithDetails = Prisma.PurchaseOrderGetPayload<{
  include: {
    contact: true;
    department: true;
    project: true;
    createdBy: { select: { name: true } };
    updatedBy: { select: { name: true } };
    issuedBy: { select: { name: true } };
    closedBy: { select: { name: true } };
    cancelledBy: { select: { name: true } };
    attachments: true;
    items: {
      include: {
        product: {
          include: {
            baseUnit: true;
            purchaseUnit: true;
          };
        };
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
  contactId: string;
  orderDate: Date;
  expectedDate?: Date | null;
  notes?: string | null;
  status?: PurchaseOrderStatus;
  items: PurchaseOrderItemInput[];
  attachmentIds?: string[];
  departmentId?: string | null;
  projectId?: string | null;
};
