-- Sprint 2: Universal Draft/Staging System
-- Allows any form data to be saved as a draft before committing to real tables.
-- Drafts are per-tenant, typed, and persisted across sessions.

CREATE TABLE "drafts" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     TEXT        NOT NULL,
  "type"          TEXT        NOT NULL,
  "status"        TEXT        NOT NULL DEFAULT 'pending',
  "title"         TEXT,
  "data"          JSONB       NOT NULL DEFAULT '{}',
  "notes"         TEXT,
  "created_by"    TEXT,
  "confirmed_at"  TIMESTAMPTZ,
  "discarded_at"  TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "drafts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "drafts_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX "drafts_tenant_status_idx"        ON "drafts" ("tenant_id", "status");
CREATE INDEX "drafts_tenant_type_status_idx"   ON "drafts" ("tenant_id", "type", "status");
CREATE INDEX "drafts_tenant_created_at_idx"    ON "drafts" ("tenant_id", "created_at" DESC);
