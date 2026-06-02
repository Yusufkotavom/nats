-- CreateTable
CREATE TABLE "PublicCustomerLink" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "contactId" TEXT,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "lastViewedAt" TIMESTAMP(3),
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PublicCustomerLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicCustomerLink_tokenHash_key" ON "PublicCustomerLink"("tokenHash");

-- CreateIndex
CREATE INDEX "PublicCustomerLink_companyId_sourceType_sourceId_idx"
ON "PublicCustomerLink"("companyId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "PublicCustomerLink_contactId_createdAt_idx"
ON "PublicCustomerLink"("contactId", "createdAt");

-- AddForeignKey
ALTER TABLE "PublicCustomerLink"
ADD CONSTRAINT "PublicCustomerLink_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicCustomerLink"
ADD CONSTRAINT "PublicCustomerLink_contactId_fkey"
FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
