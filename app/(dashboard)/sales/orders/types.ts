import { Prisma, SalesOrderStatus } from "@/prisma/generated/prisma/client";

export type SalesOrderWithDetails = Prisma.SalesOrderGetPayload<{
  include: {
    contact: true;
    department: true;
    project: true;
    createdBy: { select: { name: true } };
    updatedBy: { select: { name: true } };
    confirmedBy: { select: { name: true } };
    closedBy: { select: { name: true } };
    cancelledBy: { select: { name: true } };
    attachments: true;
    items: {
      include: {
        product: {
          include: {
            baseUnit: true;
            salesUnit: true;
          };
        };
      };
    };
  };
}>;

export type SalesOrderItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountRate?: number;
};

export type SalesOrderInput = {
  contactId: string;
  orderDate: Date;
  expectedDate?: Date | null;
  notes?: string | null;
  status?: SalesOrderStatus;
  items: SalesOrderItemInput[];
  attachmentIds?: string[];
  departmentId?: string | null;
  projectId?: string | null;
};
