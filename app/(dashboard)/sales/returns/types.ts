import { Prisma } from "@/prisma/generated/prisma/client";

export type SalesReturnWithDetails = Prisma.SalesReturnGetPayload<{
  include: {
    contact: true;
    salesOrder: true;
    salesInvoice: true;
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

export interface SalesReturnItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface SalesReturnInput {
  returnNumber: string;
  contactId: string;
  salesOrderId?: string;
  salesInvoiceId?: string;
  returnDate: Date;
  reason?: string;
  notes?: string;
  status?: "DRAFT" | "APPROVED" | "COMPLETED" | "CANCELLED";
  items: SalesReturnItemInput[];
}
