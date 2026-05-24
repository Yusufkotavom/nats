ALTER TABLE "CompanyProfile"
  ADD COLUMN "serviceNotifyOnCreated" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "serviceNotifyOnReady" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "serviceNotifyOnCostDone" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "serviceNotifyOnPickedUp" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "serviceTemplateCreated" TEXT,
  ADD COLUMN "serviceTemplateReady" TEXT,
  ADD COLUMN "serviceTemplateCostDone" TEXT,
  ADD COLUMN "serviceTemplatePickedUp" TEXT,
  ADD COLUMN "serviceWarrantyDuration" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "serviceWarrantyUnit" TEXT NOT NULL DEFAULT 'DAY';
