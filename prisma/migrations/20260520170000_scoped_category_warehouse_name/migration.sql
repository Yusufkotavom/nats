-- Make category and warehouse names unique within each company (not globally)
DROP INDEX IF EXISTS "Category_name_key";
CREATE UNIQUE INDEX "Category_companyId_name_key" ON "Category"("companyId", "name");

DROP INDEX IF EXISTS "Warehouse_name_key";
CREATE UNIQUE INDEX "Warehouse_companyId_name_key" ON "Warehouse"("companyId", "name");
