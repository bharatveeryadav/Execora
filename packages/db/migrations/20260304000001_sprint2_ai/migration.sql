-- Sprint 2 — AI Features migration
-- Adds ocr_jobs table for tracking async OCR and catalog-seeding jobs.

CREATE TABLE "ocr_jobs" (
    "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"        TEXT NOT NULL,
    "job_type"         TEXT NOT NULL,
    "status"           TEXT NOT NULL DEFAULT 'pending',
    "image_key"        TEXT NOT NULL,
    "image_mime_type"  TEXT NOT NULL DEFAULT 'image/jpeg',
    "raw_result"       JSONB,
    "parsed_items"     JSONB,
    "purchase_order_id" TEXT UNIQUE,
    "products_created" INTEGER NOT NULL DEFAULT 0,
    "error_message"    TEXT,
    "retry_count"      INTEGER NOT NULL DEFAULT 0,
    "processed_at"     TIMESTAMP(3),
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocr_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ocr_jobs_tenant_status_idx" ON "ocr_jobs"("tenant_id", "status");
CREATE INDEX "ocr_jobs_tenant_created_idx" ON "ocr_jobs"("tenant_id", "created_at" DESC);
