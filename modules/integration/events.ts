import { z } from "zod";

export const salesInvoiceIssuedPayloadSchema = z.object({
  invoiceId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string().min(1),
  contactId: z.string().min(1),
  userId: z.string().min(1),
  totalAmount: z.string().min(1),
  globalDiscount: z.string().optional(),
  shippingCost: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().int().positive(),
      unitPrice: z.string().min(1),
      discount: z.string().optional(),
      tax: z.string().optional(),
      accountId: z.string().optional(),
    })
  ),
});

export type SalesInvoiceIssuedPayload = z.infer<
  typeof salesInvoiceIssuedPayloadSchema
>;

export const purchaseInvoiceBilledPayloadSchema = z.object({
  invoiceId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string().min(1),
  contactId: z.string().min(1),
  userId: z.string().min(1),
  totalAmount: z.string().min(1),
  globalDiscount: z.string().optional(),
  shippingCost: z.string().optional(),
  handlingCost: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().int().positive(),
      unitPrice: z.string().min(1),
      discount: z.string().optional(),
      tax: z.string().optional(),
      accountId: z.string().optional(),
    })
  ),
});

export const salesPaymentPostedPayloadSchema = z.object({
  paymentId: z.string().min(1),
  paymentNumber: z.string().min(1),
  paymentDate: z.string().min(1),
  amount: z.string().min(1),
  reference: z.string().optional(),
  notes: z.string().optional(),
  cashAccountId: z.string().min(1),
  contactId: z.string().min(1),
  salesInvoiceId: z.string().min(1),
  userId: z.string().min(1),
});

export const purchasePaymentPostedPayloadSchema = z.object({
  paymentId: z.string().min(1),
  paymentNumber: z.string().min(1),
  paymentDate: z.string().min(1),
  amount: z.string().min(1),
  reference: z.string().optional(),
  notes: z.string().optional(),
  cashAccountId: z.string().min(1),
  contactId: z.string().min(1),
  purchaseInvoiceId: z.string().min(1),
  userId: z.string().min(1),
});

export const cashTransactionApprovedPayloadSchema = z.object({
  transactionId: z.string().min(1),
  userId: z.string().min(1),
});

export const cashTransferApprovedPayloadSchema = z.object({
  transferId: z.string().min(1),
  userId: z.string().min(1),
});

export const cashTransactionCreateRequestedPayloadSchema = z.object({
  transactionId: z.string().min(1),
  journalEntryId: z.string().min(1),
  entryNumber: z.string().min(1),
  cashAccountId: z.string().min(1),
  contactId: z.string().optional(),
  departmentId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: z.string().min(1),
  reference: z.string().optional(),
  description: z.string().min(1),
  notes: z.string().optional(),
  allocations: z.array(
    z.object({
      accountId: z.string().min(1),
      amount: z.string().min(1),
      description: z.string().optional(),
    })
  ),
  attachmentIds: z.array(z.string()).optional(),
  userId: z.string().min(1),
});

export const integrationEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SALES_INVOICE_ISSUED"),
    payload: salesInvoiceIssuedPayloadSchema,
  }),
  z.object({
    type: z.literal("PURCHASE_INVOICE_BILLED"),
    payload: purchaseInvoiceBilledPayloadSchema,
  }),
  z.object({
    type: z.literal("SALES_PAYMENT_POSTED"),
    payload: salesPaymentPostedPayloadSchema,
  }),
  z.object({
    type: z.literal("PURCHASE_PAYMENT_POSTED"),
    payload: purchasePaymentPostedPayloadSchema,
  }),
  z.object({
    type: z.literal("CASH_TRANSACTION_APPROVED"),
    payload: cashTransactionApprovedPayloadSchema,
  }),
  z.object({
    type: z.literal("CASH_TRANSFER_APPROVED"),
    payload: cashTransferApprovedPayloadSchema,
  }),
  z.object({
    type: z.literal("CASH_TRANSACTION_CREATE_REQUESTED"),
    payload: cashTransactionCreateRequestedPayloadSchema,
  }),
]);

export type IntegrationEvent = z.infer<typeof integrationEventSchema>;
