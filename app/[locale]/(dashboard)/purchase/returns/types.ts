import { Prisma } from "@/prisma/generated/prisma/client";

export type PurchaseReturnWithDetails = Prisma.PurchaseReturnGetPayload<{
  include: {
    contact: true;
    purchaseOrder: true;
    purchaseInvoice: true;
    department: true;
    project: true;
    items: {
      include: {
        product: {
          include: {
            baseUnit: true,
            purchaseUnit: true,
          };
        };
      };
    };
    attachments: true;
  };
}>;

export interface PurchaseReturnItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseReturnInput {
  returnNumber: string;
  contactId: string;
  purchaseOrderId?: string;
  purchaseInvoiceId?: string;
  departmentId?: string | null;
  projectId?: string | null;
  returnDate: Date;
  reason?: string;
  notes?: string;
  status?: "DRAFT" | "APPROVED" | "COMPLETED" | "CANCELLED";
  items: PurchaseReturnItemInput[];
  attachmentIds?: string[];
}
