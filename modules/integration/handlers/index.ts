import { handleSalesInvoiceIssued } from "./sales-invoice-issued";
import {
  handleCashTransactionApprovedAccounting,
  handleCashTransactionApprovedCashBank,
} from "./cash-transaction-approved";
import {
  handleCashTransferApprovedAccounting,
  handleCashTransferApprovedCashBank,
} from "./cash-transfer-approved";
import {
  handleCashTransactionCreateRequestedAccounting,
  handleCashTransactionCreateRequestedCashBank,
} from "./cash-transaction-create-requested";
import { handlePurchaseInvoiceBilled } from "./purchase-invoice-billed";
import { handlePurchasePaymentPostedAccounting, handlePurchasePaymentPostedCashBank } from "./purchase-payment-posted";
import { handleSalesPaymentPostedAccounting, handleSalesPaymentPostedCashBank } from "./sales-payment-posted";

export const integrationHandlers = {
  SALES_INVOICE_ISSUED: [
    {
      consumer: "accounting",
      handle: handleSalesInvoiceIssued,
    },
  ],
  PURCHASE_INVOICE_BILLED: [
    {
      consumer: "accounting",
      handle: handlePurchaseInvoiceBilled,
    },
  ],
  SALES_PAYMENT_POSTED: [
    {
      consumer: "accounting",
      handle: handleSalesPaymentPostedAccounting,
    },
    {
      consumer: "cash_bank",
      handle: handleSalesPaymentPostedCashBank,
    },
  ],
  PURCHASE_PAYMENT_POSTED: [
    {
      consumer: "accounting",
      handle: handlePurchasePaymentPostedAccounting,
    },
    {
      consumer: "cash_bank",
      handle: handlePurchasePaymentPostedCashBank,
    },
  ],
  CASH_TRANSACTION_APPROVED: [
    {
      consumer: "accounting",
      handle: handleCashTransactionApprovedAccounting,
    },
    {
      consumer: "cash_bank",
      handle: handleCashTransactionApprovedCashBank,
    },
  ],
  CASH_TRANSFER_APPROVED: [
    {
      consumer: "accounting",
      handle: handleCashTransferApprovedAccounting,
    },
    {
      consumer: "cash_bank",
      handle: handleCashTransferApprovedCashBank,
    },
  ],
  CASH_TRANSACTION_CREATE_REQUESTED: [
    {
      consumer: "accounting",
      handle: handleCashTransactionCreateRequestedAccounting,
    },
    {
      consumer: "cash_bank",
      handle: handleCashTransactionCreateRequestedCashBank,
    },
  ],
} as const;

export type IntegrationHandlerType = keyof typeof integrationHandlers;

export function getIntegrationHandlers(type: string) {
  return integrationHandlers[type as IntegrationHandlerType] ?? null;
}
