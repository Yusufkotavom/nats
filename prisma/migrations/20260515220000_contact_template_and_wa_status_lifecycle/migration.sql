-- Expand contact communication status lifecycle for WhatsApp follow-up
ALTER TYPE "ContactCommunicationStatus" ADD VALUE IF NOT EXISTS 'QUEUED';
ALTER TYPE "ContactCommunicationStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "ContactCommunicationStatus" ADD VALUE IF NOT EXISTS 'READ';

-- Add message template kind enum for per-contact DB templates
CREATE TYPE "ContactMessageTemplateKind" AS ENUM ('PROMO', 'SERVICE_UPDATE', 'PAYMENT_REMINDER');

-- Add lifecycle metadata columns to communication log
ALTER TABLE "ContactCommunicationLog"
  ADD COLUMN "providerMessageId" TEXT,
  ADD COLUMN "queuedAt" TIMESTAMP(3),
  ADD COLUMN "sentAt" TIMESTAMP(3),
  ADD COLUMN "deliveredAt" TIMESTAMP(3),
  ADD COLUMN "readAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill best-effort lifecycle timestamps for existing rows
UPDATE "ContactCommunicationLog"
SET
  "queuedAt" = COALESCE("queuedAt", "createdAt"),
  "sentAt" = CASE WHEN "status" = 'SENT' THEN COALESCE("sentAt", "createdAt") ELSE "sentAt" END
WHERE "queuedAt" IS NULL OR ("status" = 'SENT' AND "sentAt" IS NULL);

-- Create DB-backed per-contact message templates
CREATE TABLE "ContactMessageTemplate" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "kind" "ContactMessageTemplateKind" NOT NULL,
  "template" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContactMessageTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContactMessageTemplate_contactId_kind_key"
  ON "ContactMessageTemplate"("contactId", "kind");

CREATE INDEX "ContactMessageTemplate_kind_updatedAt_idx"
  ON "ContactMessageTemplate"("kind", "updatedAt");

ALTER TABLE "ContactMessageTemplate"
  ADD CONSTRAINT "ContactMessageTemplate_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
