import {
  Prisma,
  SalesInvoiceStatus,
} from "@/prisma/generated/prisma/client";

export interface SalesInvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  productId?: string;
  accountId?: string;
}

export interface SalesInvoiceInput {
  invoiceNumber: string;
  contactId: string;
  salesOrderId?: string;
  invoiceDate: Date;
  dueDate: Date;
  notes?: string;
  status?: SalesInvoiceStatus;

  globalDiscount: number;
  totalTax: number;
  shippingCost: number;

  items: SalesInvoiceItemInput[];
}

export type SalesInvoiceWithDetails = Prisma.SalesInvoiceGetPayload<{
  include: {
    contact: true;
    salesOrder: true;
    items: true;
    payments: true;
  };
}>;
