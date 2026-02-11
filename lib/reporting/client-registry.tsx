import { SalesOrderPdf } from "@/app/(dashboard)/sales/_reports/sales-order/pdf";
import { PurchaseOrderPdf } from "@/app/(dashboard)/purchase/_reports/purchase-order/pdf";
import { SalesInvoicePdf } from "@/app/(dashboard)/sales/_reports/sales-invoice/pdf";
import { JournalEntryPdf } from "@/app/(dashboard)/accounting/_reports/journal-entry/pdf";
import { POSReceiptPdf } from "@/app/pos/_reports/receipt/pdf";

export const clientRegistry = {
  "SALES_ORDER": SalesOrderPdf,
  "PURCHASE_ORDER": PurchaseOrderPdf,
  "SALES_INVOICE": SalesInvoicePdf,
  "JOURNAL_ENTRY": JournalEntryPdf,
  "POS_RECEIPT": POSReceiptPdf
} as const;
