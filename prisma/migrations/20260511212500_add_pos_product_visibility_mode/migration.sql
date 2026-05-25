-- AlterTable (safe for fresh database bootstrap)
ALTER TABLE IF EXISTS "CompanyProfile"
ADD COLUMN IF NOT EXISTS "posProductVisibilityMode" TEXT NOT NULL DEFAULT 'POS_ONLY';
