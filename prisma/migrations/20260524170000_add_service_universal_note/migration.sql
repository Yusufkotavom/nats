-- Add reusable universal note for service documents (work order/invoice)
ALTER TABLE "CompanyProfile"
ADD COLUMN "serviceUniversalNote" TEXT;
