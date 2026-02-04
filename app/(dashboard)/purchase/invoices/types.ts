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
  contactId: string;
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
  attachmentIds?: string[];
}

export type PurchaseInvoiceWithDetails = Prisma.PurchaseInvoiceGetPayload<{
  include: {
    contact: true;
    purchaseOrder: true;
    items: true;
    payments: true;
    attachments: true;
  };
}>;
