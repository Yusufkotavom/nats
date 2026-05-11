export type QuickPurchaseMode = "CASH_DAILY" | "MONTHLY_CREDIT" | "PREORDER_DP";

export type QuickPurchaseItemInput = {
  productId: string;
  quantity: number;
  unitCost: number;
};

export type QuickPurchaseInput = {
  mode: QuickPurchaseMode;
  contactId: string;
  transactionDate: Date;
  dueDate?: Date;
  downPaymentAmount?: number;
  notes?: string;
  cashAccountId?: string;
  departmentId?: string | null;
  projectId?: string | null;
  items: QuickPurchaseItemInput[];
};

export type QuickPurchaseResult = {
  receiveId: string;
  invoiceId: string;
  paymentId?: string;
  postedInvoice: boolean;
  postedPayment?: boolean;
  remainingPayableAmount?: number;
};
