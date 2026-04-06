# Billing GST Docs System

## Purpose

Project-specific documentation operating model for billing, GST, and invoice features in Execora.

This file defines where truth lives in code, where truth lives in docs, and how to keep both synchronized.

## Runtime Truth Map (Code)

Use these files as implementation source of truth before updating docs:

- API route surface:
  - `packages/api/src/api/routes/invoice.routes.ts`
  - `packages/api/src/api/routes/report.routes.ts`
  - `packages/api/src/api/index.ts`
- Business logic:
  - `packages/modules/src/modules/invoice/invoice.service.ts`
  - `packages/modules/src/modules/gst/gst.service.ts`
  - `packages/modules/src/modules/gst/gstr1.service.ts`
- Data contracts:
  - `packages/db/schema.prisma` (`Invoice`, `InvoiceItem`, `InvoiceCounter`, tenant GST fields)

## Canonical Truth Map (Docs)

Billing and GST updates must follow this order:

1. `docs/INVOICE_REQUIREMENTS.md` (what must exist next)
2. `docs/INVOICE_GST_COMPLIANCE_AUDIT.md` (compliance status vs implementation)
3. `docs/INDIAN_GST_BILLING_REFERENCE.md` (regulatory context and reference)
4. `docs/RESEARCH_MASTER.md` (cross-domain research summary only)

If there is a conflict, implementation truth is decided from code files listed in Runtime Truth Map, then reflected in canonical docs.

## Feature Lifecycle (Project-Based)

For every billing/GST feature change:

1. Confirm route impact in `invoice.routes.ts` or `report.routes.ts`.
2. Confirm service impact in `invoice.service.ts`, `gst.service.ts`, or `gstr1.service.ts`.
3. Confirm schema impact in `schema.prisma` for invoice tax fields.
4. Update `INVOICE_REQUIREMENTS.md`:
   - move status rows (planned/in-progress/done)
   - update effort/sprint notes
5. Update `INVOICE_GST_COMPLIANCE_AUDIT.md` if compliance behavior changed.
6. Update `RESEARCH_MASTER.md` only for strategic summary or competitor parity changes.

## Route-Level Doc Buckets

Keep route documentation grouped by execution workflow:

- Invoice lifecycle routes:
  - `/api/v1/invoices`
  - `/api/v1/invoices/:id`
  - `/api/v1/invoices/:id/convert`
  - `/api/v1/invoices/:id/cancel`
- Payment adjustments:
  - `/api/v1/invoices/:id/reverse-payment`
  - `/api/v1/ledger/mixed-payment`
- GST reports:
  - `/api/v1/reports/gstr1`
  - `/api/v1/reports/gstr1/pdf`
  - `/api/v1/reports/gstr1/csv`
- Public invoice distribution:
  - `/pub/invoice/:id/:token`
  - `/api/v1/invoices/:id/portal-token`

This grouping must be mirrored in documentation sections to keep operator and developer views aligned.

## Required Owners

Each billing/GST canonical doc should always have:

- one engineering owner (API/service correctness)
- one domain owner (GST/compliance correctness)

## Review Cadence

- Monthly: requirements and status ledger review
- Quarterly: compliance audit and GST reference validation
- Release gate: billing/GST changes cannot ship without doc impact check

## PR Checklist (Billing/GST)

For any PR touching billing/GST code paths:

- [ ] Route changes reflected in docs (if any)
- [ ] Compliance fields reviewed (GSTIN, place of supply, reverse charge, tax splits)
- [ ] Report output changes documented (GSTR-1/PDF/CSV)
- [ ] `INVOICE_REQUIREMENTS.md` status updated
- [ ] `INVOICE_GST_COMPLIANCE_AUDIT.md` updated when compliance behavior changed

## Boundaries

- Do not move detailed billing/GST implementation notes into `RESEARCH_MASTER.md`.
- Do not duplicate compliance tables across multiple files.
- Keep historical alternatives in `docs/archive/` only.
