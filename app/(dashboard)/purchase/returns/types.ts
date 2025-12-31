import { Prisma } from "@/prisma/generated/prisma/client";

export type PurchaseReturnWithDetails = Prisma.PurchaseReturnGetPayload<{
  include: {
    vendor: true;
    purchaseOrder: true;
    purchaseInvoice: true;
    items: {
      include: {
        product: true;
      };
    };
  };
}>;

export interface PurchaseReturnItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseReturnInput {
  returnNumber: string;
  vendorId: string;
  purchaseOrderId?: string;
  purchaseInvoiceId?: string;
  returnDate: Date;
  reason?: string;
  notes?: string;
  status?: "DRAFT" | "APPROVED" | "COMPLETED" | "CANCELLED";
  items: PurchaseReturnItemInput[];
}
