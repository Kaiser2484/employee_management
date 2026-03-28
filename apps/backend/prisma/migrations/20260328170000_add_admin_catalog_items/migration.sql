CREATE TYPE "CatalogType" AS ENUM ('job_title', 'department', 'employee_status', 'job_category');

CREATE TABLE "AdminCatalogItem" (
    "id" TEXT NOT NULL,
    "type" "CatalogType" NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminCatalogItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminCatalogItem_type_value_key" ON "AdminCatalogItem"("type", "value");
CREATE INDEX "AdminCatalogItem_type_idx" ON "AdminCatalogItem"("type");
