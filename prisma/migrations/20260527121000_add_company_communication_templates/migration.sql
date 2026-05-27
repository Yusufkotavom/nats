-- CreateEnum
CREATE TYPE "CompanyCommunicationEventKey" AS ENUM (
  'SALES_INVOICE_ISSUED',
  'SALES_PAYMENT_POSTED',
  'SERVICE_CREATED',
  'SERVICE_READY',
  'SERVICE_COST_DONE',
  'SERVICE_PICKED_UP',
  'POS_PAYMENT_POSTED'
);

-- CreateTable
CREATE TABLE "CompanyCommunicationTemplate" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "eventKey" "CompanyCommunicationEventKey" NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "channel" "ContactCommunicationChannel" NOT NULL DEFAULT 'WHATSAPP',
  "template" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanyCommunicationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyCommunicationTemplate_companyId_idx" ON "CompanyCommunicationTemplate"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyCommunicationTemplate_companyId_eventKey_channel_key"
ON "CompanyCommunicationTemplate"("companyId", "eventKey", "channel");

-- AddForeignKey
ALTER TABLE "CompanyCommunicationTemplate"
ADD CONSTRAINT "CompanyCommunicationTemplate_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
