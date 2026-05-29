DO $$ BEGIN
  ALTER TYPE "CompanyStatus" ADD VALUE IF NOT EXISTS 'PENDING_SETUP';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PlanBillingCycle" AS ENUM ('MONTHLY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CompanySubscriptionStatus" AS ENUM ('PENDING_SETUP','ACTIVE','EXPIRED','CANCELED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CompanySubscriptionInvoiceStatus" AS ENUM ('DRAFT','ISSUED','PAID','VOID');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PlatformPlan" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "billingCycle" "PlanBillingCycle" NOT NULL DEFAULT 'MONTHLY',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformPlan_code_key" ON "PlatformPlan"("code");

CREATE TABLE IF NOT EXISTS "CompanySubscription" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "planId" TEXT,
  "status" "CompanySubscriptionStatus" NOT NULL DEFAULT 'PENDING_SETUP',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "nextBillingDate" TIMESTAMP(3),
  "autoRenew" BOOLEAN NOT NULL DEFAULT false,
  "billingName" TEXT,
  "billingEmail" TEXT,
  "billingPhone" TEXT,
  "billingAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanySubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompanySubscription_companyId_key" ON "CompanySubscription"("companyId");
CREATE INDEX IF NOT EXISTS "CompanySubscription_status_idx" ON "CompanySubscription"("status");
CREATE INDEX IF NOT EXISTS "CompanySubscription_nextBillingDate_idx" ON "CompanySubscription"("nextBillingDate");

CREATE TABLE IF NOT EXISTS "CompanySubscriptionInvoice" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "issueDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" "CompanySubscriptionInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "paidAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanySubscriptionInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompanySubscriptionInvoice_invoiceNumber_key" ON "CompanySubscriptionInvoice"("invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "CompanySubscriptionInvoice_subscriptionId_periodStart_periodEnd_key" ON "CompanySubscriptionInvoice"("subscriptionId","periodStart","periodEnd");
CREATE INDEX IF NOT EXISTS "CompanySubscriptionInvoice_companyId_status_idx" ON "CompanySubscriptionInvoice"("companyId","status");

CREATE TABLE IF NOT EXISTS "CompanySubscriptionInvoiceLine" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanySubscriptionInvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CompanySubscriptionInvoiceLine_invoiceId_idx" ON "CompanySubscriptionInvoiceLine"("invoiceId");

DO $$ BEGIN
  ALTER TABLE "CompanySubscription"
  ADD CONSTRAINT "CompanySubscription_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CompanySubscription"
  ADD CONSTRAINT "CompanySubscription_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "PlatformPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CompanySubscriptionInvoice"
  ADD CONSTRAINT "CompanySubscriptionInvoice_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CompanySubscriptionInvoice"
  ADD CONSTRAINT "CompanySubscriptionInvoice_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "CompanySubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CompanySubscriptionInvoiceLine"
  ADD CONSTRAINT "CompanySubscriptionInvoiceLine_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "CompanySubscriptionInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
