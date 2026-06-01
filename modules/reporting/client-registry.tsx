import { SalesOrderPdf } from "@/app/[locale]/(dashboard)/sales/_reports/sales-order/pdf";
import { PurchaseOrderPdf } from "@/app/[locale]/(dashboard)/purchase/_reports/purchase-order/pdf";
import { SalesInvoicePdf } from "@/app/[locale]/(dashboard)/sales/_reports/sales-invoice/pdf";
import { SalesShipmentPdf } from "@/app/[locale]/(dashboard)/sales/_reports/sales-shipment/pdf";
import { SalesPaymentPdf } from "@/app/[locale]/(dashboard)/sales/_reports/sales-payment/pdf";
import { SalesReturnPdf } from "@/app/[locale]/(dashboard)/sales/_reports/sales-return/pdf";
import { JournalEntryPdf } from "@/app/[locale]/(dashboard)/accounting/_reports/journal-entry/pdf";
import { POSReceiptPdf } from "@/app/[locale]/pos/_reports/receipt/pdf";
import { ProfitLossPdf } from "@/app/[locale]/(dashboard)/accounting/reports/_pdf/profit-loss";
import { BalanceSheetPdf } from "@/app/[locale]/(dashboard)/accounting/reports/_pdf/balance-sheet";
import { CashFlowPdf } from "@/app/[locale]/(dashboard)/accounting/reports/_pdf/cash-flow";
import { EquityChangePdf } from "@/app/[locale]/(dashboard)/accounting/reports/_pdf/equity";
import { FinancialRatiosPdf } from "@/app/[locale]/(dashboard)/accounting/reports/_pdf/ratios";
import { BudgetTrackingPdf } from "@/app/[locale]/(dashboard)/budgeting/_reports/budget-tracking/pdf";
import { ServiceWorkOrderPdf } from "@/app/[locale]/(dashboard)/services/_reports/service-work-order/pdf";
import { ServiceInvoicePdf } from "@/app/[locale]/(dashboard)/services/_reports/service-invoice/pdf";

export const clientRegistry = {
  SALES_ORDER: SalesOrderPdf,
  PURCHASE_ORDER: PurchaseOrderPdf,
  SALES_INVOICE: SalesInvoicePdf,
  SALES_SHIPMENT: SalesShipmentPdf,
  SALES_PAYMENT: SalesPaymentPdf,
  SALES_RETURN: SalesReturnPdf,
  JOURNAL_ENTRY: JournalEntryPdf,
  POS_RECEIPT: POSReceiptPdf,
  SERVICE_WORK_ORDER: ServiceWorkOrderPdf,
  SERVICE_INVOICE: ServiceInvoicePdf,
  PROFIT_LOSS: ProfitLossPdf,
  BALANCE_SHEET: BalanceSheetPdf,
  CASH_FLOW: CashFlowPdf,
  EQUITY_CHANGE: EquityChangePdf,
  FINANCIAL_RATIOS: FinancialRatiosPdf,
  BUDGET_TRACKING: BudgetTrackingPdf,
} as const;
