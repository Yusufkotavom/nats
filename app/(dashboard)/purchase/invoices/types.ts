import {
  Prisma,
  PurchaseInvoiceStatus,
} from "@/prisma/generated/prisma/client";

export interface PurchaseInvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  accountId?: string;
}

export interface PurchaseInvoiceInput {
  invoiceNumber: string;
  vendorId: string;
  purchaseOrderId?: string;
  invoiceDate: Date;
  dueDate: Date;
  notes?: string;
  status?: PurchaseInvoiceStatus;

  globalDiscount: number;
  totalTax: number;
  shippingCost: number;
  handlingCost: number;

  items: PurchaseInvoiceItemInput[];
}

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
