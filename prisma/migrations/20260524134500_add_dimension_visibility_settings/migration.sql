ALTER TABLE "CompanyProfile"
  ADD COLUMN "enableDepartmentDimension" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "enableProjectDimension" BOOLEAN NOT NULL DEFAULT true;
