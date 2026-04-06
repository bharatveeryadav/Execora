-- Migration: Add tenantId to invoice_counters for per-tenant invoice sequences
-- This fixes cross-tenant invoice number sharing (security blocker)

-- 1. Drop old single-column PK
ALTER TABLE invoice_counters DROP CONSTRAINT IF EXISTS invoice_counters_pkey;

-- 2. Add tenant_id column (nullable first so existing rows survive)
ALTER TABLE invoice_counters ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- 3. Remove rows without tenant data (dev/test data only — prod is fresh)
DELETE FROM invoice_counters WHERE tenant_id IS NULL;

-- 4. Make tenant_id NOT NULL now that nulls are gone
ALTER TABLE invoice_counters ALTER COLUMN tenant_id SET NOT NULL;

-- 5. New composite primary key
ALTER TABLE invoice_counters ADD PRIMARY KEY (fy, tenant_id);
