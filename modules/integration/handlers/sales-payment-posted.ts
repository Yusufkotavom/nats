import { Decimal } from "decimal.js";
import { getRequiredDefaultAccount } from "@/lib/accounting/default-accounts";
import { JournalService } from "@/lib/accounting/journal-service";
import { CashTransactionType } from "@/prisma/generated/prisma/client";
import { salesPaymentPostedPayloadSchema } from "@/modules/integration/events";
import type { Prisma } from "@/prisma/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export async function handleSalesPaymentPostedAccounting(
  tx: Tx,
  payloadInput: unknown
) {
  const payload = salesPaymentPostedPayloadSchema.parse(payloadInput);

  const payment = await tx.salesPayment.findUnique({
    where: { id: payload.paymentId },
    include: {
      salesInvoice: { select: { invoiceNumber: true } },
      cashAccount: { select: { name: true, glAccountId: true } },
    },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  if (payment.journalEntryId) {
    return;
  }

  const arAccount = await getRequiredDefaultAccount("ACCOUNTS_RECEIVABLE");

  const journalEntry = await JournalService.createDraftJournalEntry(tx, {
    userId: payload.userId,
    entryNumber: `PAY-IN-${payment.paymentNumber}`,
    transactionDate: payment.paymentDate,
    description: `Payment for Invoice #${payment.salesInvoice.invoiceNumber}`,
    lines: [
      {
        accountId: payment.cashAccount.glAccountId,
        debitAmount: new Decimal(payload.amount),
        creditAmount: new Decimal(0),
        description: `Payment to ${payment.cashAccount.name}`,
        lineNumber: 1,
      },
      {
        accountId: arAccount.accountId,
        debitAmount: new Decimal(0),
        creditAmount: new Decimal(payload.amount),
        description: `Payment for Invoice #${payment.salesInvoice.invoiceNumber}`,
        lineNumber: 2,
        contactId: payment.contactId,
      },
    ],
  });

  await JournalService.postJournalEntry(tx, journalEntry.id);

  await tx.salesPayment.update({
    where: { id: payment.id },
    data: { journalEntryId: journalEntry.id },
  });
}

export async function handleSalesPaymentPostedCashBank(tx: Tx, payloadInput: unknown) {
  const payload = salesPaymentPostedPayloadSchema.parse(payloadInput);

  const payment = await tx.salesPayment.findUnique({
    where: { id: payload.paymentId },
    include: {
      salesInvoice: { select: { invoiceNumber: true } },
    },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  if (!payment.journalEntryId) {
    throw new Error("Payment journal entry not created");
  }

  const existingCashTx = await tx.cashTransaction.findUnique({
    where: { journalEntryId: payment.journalEntryId },
    select: { id: true },
  });

  if (existingCashTx) {
    return;
  }

  const arAccount = await getRequiredDefaultAccount("ACCOUNTS_RECEIVABLE");

  await tx.cashTransaction.create({
    data: {
      cashAccountId: payment.cashAccountId,
      type: CashTransactionType.INCOME,
      date: payment.paymentDate,
      reference: payload.reference ?? null,
      description: `Payment for Invoice #${payment.salesInvoice.invoiceNumber}`,
      note: payload.notes ?? null,
      journalEntryId: payment.journalEntryId,
      status: "APPROVED",
      approvedById: payload.userId,
      approvedAt: new Date(),
      allocations: {
        create: {
          accountId: arAccount.accountId,
          amount: new Decimal(payload.amount),
          description: `Payment for Invoice #${payment.salesInvoice.invoiceNumber}`,
        },
      },
    },
  });
}
