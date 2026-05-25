-- Make chart-of-accounts and units tenant-scoped for SaaS onboarding.

-- Account: code uniqueness from global -> per company
DROP INDEX IF EXISTS "Account_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Account_companyId_code_key" ON "Account"("companyId", "code");

-- Unit: name/symbol uniqueness from global -> per company
DROP INDEX IF EXISTS "Unit_name_key";
DROP INDEX IF EXISTS "Unit_symbol_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Unit_companyId_name_key" ON "Unit"("companyId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "Unit_companyId_symbol_key" ON "Unit"("companyId", "symbol");
