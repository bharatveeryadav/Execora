-- Seed invoice_counters when table is empty but invoices exist.
-- Run when: invoice creation fails with "Unique constraint failed on invoice_no"
--
-- Usage: docker exec -i execora-postgres psql -U execora -d execora < scripts/seed-invoice-counters.sql
--
-- Note: Column may be "tenantId" (Prisma default) or tenant_id (migration).
-- Adjust the column name if your DB uses tenant_id.

-- For "tenantId" column (Prisma default, no @map):
INSERT INTO invoice_counters (fy, "tenantId", last_seq)
SELECT
  SPLIT_PART(invoice_no, '/', 1) AS fy,
  tenant_id AS "tenantId",
  MAX(CAST(SPLIT_PART(invoice_no, '/', 3) AS INTEGER))
FROM invoices
WHERE invoice_no ~ '^\d{4}-\d{2}/INV/\d+$'
GROUP BY SPLIT_PART(invoice_no, '/', 1), tenant_id
ON CONFLICT (fy, "tenantId") DO UPDATE
  SET last_seq = GREATEST(invoice_counters.last_seq, EXCLUDED.last_seq);
