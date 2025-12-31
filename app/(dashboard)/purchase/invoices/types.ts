import { Prisma } from "@/prisma/generated/prisma/client";

export type PurchaseInvoiceWithDetails = Prisma.PurchaseInvoiceGetPayload<{
  include: {
    vendor: true;
    purchaseOrder: true;
    items: {
      include: {
        account: true;
      };
    };
  };
}>;

export interface PurchaseInvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  accountId?: string;
}

export interface PurchaseInvoiceInput {
  invoiceNumber: string;
  vendorId: string;
  purchaseOrderId?: string;
  invoiceDate: Date;
  dueDate: Date;
  notes?: string;
  status?: "DRAFT" | "POSTED" | "PAID" | "PARTIALLY_PAID" | "VOID";
  items: PurchaseInvoiceItemInput[];
}
