ALTER TABLE "PurchaseInvoiceItem"
ADD COLUMN IF NOT EXISTS "productId" TEXT;

DO $$ BEGIN
  ALTER TABLE "PurchaseInvoiceItem"
  ADD CONSTRAINT "PurchaseInvoiceItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "PurchaseInvoiceItem_productId_idx" ON "PurchaseInvoiceItem"("productId");
