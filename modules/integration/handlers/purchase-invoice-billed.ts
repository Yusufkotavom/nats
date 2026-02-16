import { Decimal } from "decimal.js";
import { getRequiredDefaultAccount } from "@/lib/accounting/default-accounts";
import { JournalService } from "@/modules/accounting/services/journal.service";
import { purchaseInvoiceBilledPayloadSchema } from "@/modules/integration/events";
import type { Prisma } from "@/prisma/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export async function handlePurchaseInvoiceBilled(tx: Tx, payloadInput: unknown) {
  const payload = purchaseInvoiceBilledPayloadSchema.parse(payloadInput);

  const invoice = await tx.purchaseInvoice.findUnique({
    where: { id: payload.invoiceId },
    select: {
      id: true,
      invoiceNumber: true,
      invoiceDate: true,
      status: true,
      journalEntryId: true,
      contactId: true,
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (invoice.journalEntryId) {
    return;
  }

  const apAccount = await getRequiredDefaultAccount("ACCOUNTS_PAYABLE");
  const grniAccount = await getRequiredDefaultAccount("GOODS_RECEIVED_NOT_INVOICED");
  const taxAccount = await getRequiredDefaultAccount("PURCHASE_TAX_RECEIVABLE");
  const expenseAccount = await getRequiredDefaultAccount("UNCATEGORIZED_EXPENSE");

  const jeLines: {
    accountId: string;
    debitAmount: Decimal;
    creditAmount: Decimal;
    description: string;
    contactId?: string;
  }[] = [];

  // lineNumber removed

  jeLines.push({
    accountId: apAccount.accountId,
    debitAmount: new Decimal(0),
    creditAmount: new Decimal(payload.totalAmount),
    description: `Payable for Invoice #${invoice.invoiceNumber}`,
    contactId: payload.contactId,
  });

  for (const item of payload.items) {
    const accountId = item.accountId ?? grniAccount.accountId;

    const subtotal = new Decimal(item.unitPrice).mul(item.quantity);
    const discountPercent = new Decimal(item.discount || 0).div(100);
    const discountAmount = subtotal.mul(discountPercent);
    const taxableAmount = subtotal.minus(discountAmount);
    const taxAmount = new Decimal(item.tax || 0);

    if (taxableAmount.gt(0)) {
      jeLines.push({
        accountId,
        debitAmount: taxableAmount,
        creditAmount: new Decimal(0),
        description: item.description,
      });
    }

    if (taxAmount.gt(0)) {
      jeLines.push({
        accountId: taxAccount.accountId,
        debitAmount: taxAmount,
        creditAmount: new Decimal(0),
        description: `Tax on ${item.description}`,
      });
    }
  }

  if (new Decimal(payload.shippingCost || 0).gt(0)) {
    jeLines.push({
      accountId: expenseAccount.accountId,
      debitAmount: new Decimal(payload.shippingCost || 0),
      creditAmount: new Decimal(0),
      description: "Shipping Cost",
    });
  }

  if (new Decimal(payload.handlingCost || 0).gt(0)) {
    jeLines.push({
      accountId: expenseAccount.accountId,
      debitAmount: new Decimal(payload.handlingCost || 0),
      creditAmount: new Decimal(0),
      description: "Handling Cost",
    });
  }

  if (new Decimal(payload.globalDiscount || 0).gt(0)) {
    jeLines.push({
      accountId: expenseAccount.accountId,
      debitAmount: new Decimal(0),
      creditAmount: new Decimal(payload.globalDiscount || 0),
      description: "Global Discount",
    });
  }

  const journalEntry = await JournalService.createJournalEntry({
    entryNumber: `INV-${invoice.invoiceNumber}`,
    transactionDate: invoice.invoiceDate,
    description: `Purchase Invoice #${invoice.invoiceNumber}`,
    lines: jeLines.map(line => ({
      ...line,
      debitAmount: line.debitAmount.toNumber(),
      creditAmount: line.creditAmount.toNumber(),
    })),
  }, payload.userId, tx);

  await JournalService.postJournalEntry(journalEntry.id, tx);

  await tx.purchaseInvoice.update({
    where: { id: invoice.id },
    data: {
      status: "BILLED",
      journalEntryId: journalEntry.id,
    },
  });
}

