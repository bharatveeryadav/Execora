# Docs Flow

## Goal

Use a clear domain-organised documentation flow with canonical master files per domain, status trackers, and immutable archive history.

## Canonical Files (new paths — domain folders)

| File | Domain | Path |
|------|--------|------|
| MASTER.md | Backend | `docs/backend/MASTER.md` |
| MASTER.md | Web | `docs/web/MASTER.md` |
| MASTER.md | Mobile | `docs/mobile/MASTER.md` |
| MASTER.md | Infrastructure | `docs/infra/MASTER.md` |
| RESEARCH_MASTER.md | Product | `docs/product/RESEARCH_MASTER.md` |
| TASKS_COMPLETED.md | Cross-cutting | `docs/TASKS_COMPLETED.md` |
| TASKS_PENDING.md | Cross-cutting | `docs/TASKS_PENDING.md` |
| BILLING_GST_DOCS_SYSTEM.md | Billing | `docs/backend/billing/BILLING_GST_DOCS_SYSTEM.md` |

## Governance Rules

- Do not delete historical docs — move to `docs/archive/legacy/`.
- Do not modify `docs/archive/**` for active work.
- Keep implementation truth aligned to code in `apps/*` and `packages/*`.
- Add updates to canonical MASTER.md first, then update supporting docs.
- Files not in a domain folder and not explicitly kept at root are candidates for archive.
- For billing/GST changes, follow `backend/billing/BILLING_GST_DOCS_SYSTEM.md` route/service/schema mapping before editing requirement or audit docs.

## Contribution Workflow

1. Identify change scope: backend, web, mobile, infra, or cross-cutting.
2. Update the corresponding domain `MASTER.md`.
3. Move task status to `TASKS_COMPLETED.md` / `TASKS_PENDING.md`.
4. Keep detailed design notes in the domain feature subfolder.
5. If a document becomes stale/duplicate, `mv` it to `docs/archive/legacy/`.

## Quality Checklist

- Links in `docs/README.md` resolve to existing files
- No contradiction with runtime code paths
- Pending and completed task ledgers both updated
- Archive remains untouched for active updates
- Billing/GST updates reference real implementation files (`invoice.routes.ts`, `report.routes.ts`, invoice/gst services, Prisma invoice models)
- Each domain MASTER.md has an **Owner** and **Key source files** section
