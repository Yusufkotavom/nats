import { getSalesOrderData } from "@/app/(dashboard)/sales/_reports/sales-order/data";
import { getPurchaseOrderData } from "@/app/(dashboard)/purchase/_reports/purchase-order/data";
import { getSalesInvoiceData } from "@/app/(dashboard)/sales/_reports/sales-invoice/data";
import { getJournalEntryData } from "@/app/(dashboard)/accounting/_reports/journal-entry/data";
import { getPOSReceiptData } from "@/app/pos/_reports/receipt/data";

export const serverRegistry = {
  "SALES_ORDER": {
    fetchData: getSalesOrderData
  },
  "PURCHASE_ORDER": {
    fetchData: getPurchaseOrderData
  },
  "SALES_INVOICE": {
    fetchData: getSalesInvoiceData
  },
  "JOURNAL_ENTRY": {
    fetchData: getJournalEntryData
  },
  "POS_RECEIPT": {
    fetchData: getPOSReceiptData
  }
} as const;

export type ReportCode = keyof typeof serverRegistry;
