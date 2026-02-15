import { Decimal } from "decimal.js";
import { getRequiredDefaultAccount } from "@/lib/accounting/default-accounts";
import { JournalService } from "@/lib/accounting/journal-service";
import { salesInvoiceIssuedPayloadSchema } from "@/modules/integration/events";
import type { Prisma } from "@/prisma/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export async function handleSalesInvoiceIssued(
  tx: Tx,
  payloadInput: unknown
) {
  const payload = salesInvoiceIssuedPayloadSchema.parse(payloadInput);

  const invoice = await tx.salesInvoice.findUnique({
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

  const arAccount = await getRequiredDefaultAccount("ACCOUNTS_RECEIVABLE");
  const revenueAccount = await getRequiredDefaultAccount("SALES_REVENUE");
  const taxAccount = await getRequiredDefaultAccount("SALES_TAX_PAYABLE");
  const discountAccount = await getRequiredDefaultAccount("SALES_DISCOUNT");
  const shippingAccount = await getRequiredDefaultAccount("UNCATEGORIZED_INCOME");

  const jeLines: {
    accountId: string;
    debitAmount: Decimal;
    creditAmount: Decimal;
    description: string;
    lineNumber: number;
    contactId?: string;
  }[] = [];

  let lineNumber = 1;

  jeLines.push({
    accountId: arAccount.accountId,
    debitAmount: new Decimal(payload.totalAmount),
    creditAmount: new Decimal(0),
    description: `Receivable for Invoice #${invoice.invoiceNumber}`,
    lineNumber: lineNumber++,
    contactId: payload.contactId,
  });

  for (const item of payload.items) {
    const accountId = item.accountId ?? revenueAccount.accountId;

    const subtotal = new Decimal(item.unitPrice).mul(item.quantity);
    const discountPercent = new Decimal(item.discount || 0).div(100);
    const discountAmount = subtotal.mul(discountPercent);
    const taxableAmount = subtotal.minus(discountAmount);
    const taxAmount = new Decimal(item.tax || 0);

    if (taxableAmount.gt(0)) {
      jeLines.push({
        accountId,
        debitAmount: new Decimal(0),
        creditAmount: taxableAmount,
        description: item.description,
        lineNumber: lineNumber++,
      });
    }

    if (taxAmount.gt(0)) {
      jeLines.push({
        accountId: taxAccount.accountId,
        debitAmount: new Decimal(0),
        creditAmount: taxAmount,
        description: `Tax on ${item.description}`,
        lineNumber: lineNumber++,
      });
    }
  }

  if (new Decimal(payload.shippingCost || 0).gt(0)) {
    jeLines.push({
      accountId: shippingAccount.accountId,
      debitAmount: new Decimal(0),
      creditAmount: new Decimal(payload.shippingCost || 0),
      description: "Shipping Cost",
      lineNumber: lineNumber++,
    });
  }

  if (new Decimal(payload.globalDiscount || 0).gt(0)) {
    jeLines.push({
      accountId: discountAccount.accountId,
      debitAmount: new Decimal(payload.globalDiscount || 0),
      creditAmount: new Decimal(0),
      description: "Global Discount",
      lineNumber: lineNumber++,
    });
  }

  const journalEntry = await JournalService.createDraftJournalEntry(tx, {
    userId: payload.userId,
    entryNumber: `INV-${invoice.invoiceNumber}`,
    transactionDate: invoice.invoiceDate,
    description: `Sales Invoice #${invoice.invoiceNumber}`,
    lines: jeLines,
  });

  await JournalService.postJournalEntry(tx, journalEntry.id);

  await tx.salesInvoice.update({
    where: { id: invoice.id },
    data: {
      journalEntryId: journalEntry.id,
      status: invoice.status === "DRAFT" ? "ISSUED" : invoice.status,
    },
  });
}
