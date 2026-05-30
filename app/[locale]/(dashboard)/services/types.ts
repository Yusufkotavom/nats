export type ServiceOrderStatus =
  | "NEW"
  | "PROCESSING"
  | "READY"
  | "DONE"
  | "CLOSED"
  | "CANCELLED";

export type ServicePaymentMethod = "CASH" | "BANK";

export type ServiceOrderListItem = {
  id: string;
  orderNumber: string;
  salesOrderId?: string | null;
  salesInvoiceId?: string | null;
  status: ServiceOrderStatus;
  contactId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  invoiceNumber?: string | null;
  quantity: number;
  primaryProductName?: string | null;
  primaryItemNotes?: string | null;
  primaryItemPrice?: string | null;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  targetDate?: Date | null;
  createdAt: Date;
};

export type ServiceInvoiceListItem = {
  id: string;
  serviceOrderId: string;
  invoiceNumber: string;
  orderNumber: string;
  customerName: string;
  status: string;
  totalAmount: string;
  balanceDue: string;
  dueDate?: Date | null;
  invoiceDate: Date;
};

export type ServicePaymentListItem = {
  id: string;
  serviceOrderId: string;
  salesInvoiceId: string;
  paymentNumber: string;
  invoiceNumber: string;
  orderNumber: string;
  customerName: string;
  method: string;
  amount: string;
  paymentDate: Date;
};

export type ServiceAfterSalesCaseListItem = {
  id: string;
  returnNumber: string;
  caseType: "RETURN" | "WARRANTY";
  serviceOrderNumber: string;
  invoiceNumber?: string | null;
  customerName: string;
  status: string;
  totalAmount: string;
  returnDate: Date;
  notes?: string | null;
};
