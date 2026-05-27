-- Add default payment account mapping fields on company profile
ALTER TABLE "CompanyProfile"
  ADD COLUMN IF NOT EXISTS "defaultCashAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "defaultCardAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "defaultQrisAccountId" TEXT;

-- Add FK constraints to CashAccount
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CompanyProfile_defaultCashAccountId_fkey'
  ) THEN
    ALTER TABLE "CompanyProfile"
      ADD CONSTRAINT "CompanyProfile_defaultCashAccountId_fkey"
      FOREIGN KEY ("defaultCashAccountId") REFERENCES "CashAccount"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CompanyProfile_defaultCardAccountId_fkey'
  ) THEN
    ALTER TABLE "CompanyProfile"
      ADD CONSTRAINT "CompanyProfile_defaultCardAccountId_fkey"
      FOREIGN KEY ("defaultCardAccountId") REFERENCES "CashAccount"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CompanyProfile_defaultQrisAccountId_fkey'
  ) THEN
    ALTER TABLE "CompanyProfile"
      ADD CONSTRAINT "CompanyProfile_defaultQrisAccountId_fkey"
      FOREIGN KEY ("defaultQrisAccountId") REFERENCES "CashAccount"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CompanyProfile_defaultCashAccountId_idx" ON "CompanyProfile"("defaultCashAccountId");
CREATE INDEX IF NOT EXISTS "CompanyProfile_defaultCardAccountId_idx" ON "CompanyProfile"("defaultCardAccountId");
CREATE INDEX IF NOT EXISTS "CompanyProfile_defaultQrisAccountId_idx" ON "CompanyProfile"("defaultQrisAccountId");
