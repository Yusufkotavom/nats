CREATE TYPE "ContactCommunicationChannel" AS ENUM ('WHATSAPP', 'EMAIL');
CREATE TYPE "ContactCommunicationStatus" AS ENUM ('SENT', 'FAILED');
CREATE TYPE "ContactCommunicationEventType" AS ENUM (
  'CONTACT_TEMPLATE',
  'SALES_INVOICE',
  'SERVICE_CREATED',
  'SERVICE_STATUS_UPDATED',
  'SERVICE_PAYMENT_RECEIVED'
);

CREATE TABLE "ContactCommunicationLog" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "channel" "ContactCommunicationChannel" NOT NULL DEFAULT 'WHATSAPP',
  "status" "ContactCommunicationStatus" NOT NULL DEFAULT 'SENT',
  "eventType" "ContactCommunicationEventType" NOT NULL,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "target" TEXT,
  "message" TEXT NOT NULL,
  "documentLinks" JSONB,
  "errorMessage" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContactCommunicationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactCommunicationLog_contactId_createdAt_idx"
ON "ContactCommunicationLog"("contactId", "createdAt");

CREATE INDEX "ContactCommunicationLog_sourceType_sourceId_idx"
ON "ContactCommunicationLog"("sourceType", "sourceId");

CREATE INDEX "ContactCommunicationLog_eventType_createdAt_idx"
ON "ContactCommunicationLog"("eventType", "createdAt");

ALTER TABLE "ContactCommunicationLog"
ADD CONSTRAINT "ContactCommunicationLog_contactId_fkey"
FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
