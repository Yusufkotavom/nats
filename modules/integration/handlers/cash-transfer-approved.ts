import { Decimal } from "decimal.js";
import { JournalService } from "@/lib/accounting/journal-service";
import { TransferStatus, EntryStatus } from "@/prisma/generated/prisma/enums";
import { cashTransferApprovedPayloadSchema } from "@/modules/integration/events";
import type { Prisma } from "@/prisma/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export async function handleCashTransferApprovedAccounting(tx: Tx, payloadInput: unknown) {
  const payload = cashTransferApprovedPayloadSchema.parse(payloadInput);

  const transfer = await tx.cashTransfer.findUnique({
    where: { id: payload.transferId },
    include: {
      fromAccount: true,
      toAccount: true,
    },
  });

  if (!transfer) {
    throw new Error("Transfer not found");
  }

  const existingJeId = transfer.journalEntryId;
  const jeId =
    existingJeId ??
    (
      await tx.journalEntry.create({
        data: {
          userId: payload.userId,
          entryNumber: `TRF-${Date.now()}`,
          transactionDate: transfer.date,
          description:
            transfer.description ||
            `Transfer from ${transfer.fromAccount.name} to ${transfer.toAccount.name}`,
          status: EntryStatus.draft,
          lines: {
            create: [
              {
                accountId: transfer.toAccount.glAccountId,
                debitAmount: new Decimal(transfer.amount),
                creditAmount: 0,
                description: `Transfer from ${transfer.fromAccount.name}`,
                lineNumber: 1,
              },
              {
                accountId: transfer.fromAccount.glAccountId,
                debitAmount: 0,
                creditAmount: new Decimal(transfer.amount),
                description: `Transfer to ${transfer.toAccount.name}`,
                lineNumber: 2,
              },
            ],
          },
        },
        select: { id: true },
      })
    ).id;

  if (!existingJeId) {
    await tx.cashTransfer.update({
      where: { id: transfer.id },
      data: { journalEntryId: jeId },
    });
  }

  await JournalService.postJournalEntry(tx, jeId);
}

export async function handleCashTransferApprovedCashBank(tx: Tx, payloadInput: unknown) {
  const payload = cashTransferApprovedPayloadSchema.parse(payloadInput);

  const transfer = await tx.cashTransfer.findUnique({
    where: { id: payload.transferId },
    select: { id: true, status: true, approvedAt: true, journalEntryId: true },
  });

  if (!transfer) {
    throw new Error("Transfer not found");
  }

  if (transfer.status === TransferStatus.APPROVED) {
    return;
  }

  await tx.cashTransfer.update({
    where: { id: payload.transferId },
    data: {
      status: TransferStatus.APPROVED,
      approvedById: payload.userId,
      approvedAt: new Date(),
    },
  });
}

